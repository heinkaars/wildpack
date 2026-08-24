import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { beginAccountSwitch, cancelAccountSwitch } from './account-switch';

type AuthState = {
  /** False until we know whether a session exists. Screens should wait on it. */
  ready: boolean;
  session: Session | null;
  userId: string | null;
  /** True for the silent account created on first launch. */
  isAnonymous: boolean;
  /** True only for the launch that created the account, never after a restore. */
  justCreated: boolean;
  email: string | null;
  /** Set when we could not create the first account (usually no connection). */
  error: string | null;
};

type AuthContextValue = AuthState & {
  /**
   * Claims the anonymous account for an email and password. The user id does
   * not change, so the lifelist already on this device simply becomes theirs —
   * nothing is copied or moved, which is why this cannot lose a photo.
   */
  signUp: (email: string, password: string) => Promise<void>;
  /** Swaps to an existing account, carrying this device's sightings across. */
  signIn: (email: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  /** Verifies the reset code and sets the new password in one step. */
  resetPassword: (email: string, code: string, password: string) => Promise<void>;
  /** Returns to a fresh anonymous account, never to a signed-out dead end. */
  signOut: () => Promise<void>;
  retry: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const MAX_ATTEMPTS = 5;

/** Supabase phrasing is aimed at developers; these are for people. */
function friendlyMessage(raw: string): string {
  const message = raw.toLowerCase();
  if (message.includes('invalid login credentials')) {
    return 'That email and password do not match an account.';
  }
  if (message.includes('email not confirmed')) {
    return 'This account has not been confirmed yet. Check your email.';
  }
  if (message.includes('token has expired') || message.includes('expired')) {
    return 'That code has expired. Send yourself a new one.';
  }
  if (message.includes('invalid') && message.includes('token')) {
    return 'That code is not right. Check the email and try again.';
  }
  if (
    message.includes('already registered') ||
    message.includes('already been registered') ||
    message.includes('already exists')
  ) {
    return 'There is already an account with that email. Sign in instead.';
  }
  if (message.includes('password should be') || message.includes('at least')) {
    return 'Passwords need to be at least 6 characters.';
  }
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Too many tries. Wait a minute and try again.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Could not reach WildPack. Check your connection.';
  }
  // Anything unrecognised is developer-facing wording that can name internals.
  // It belongs in the log, not in the red box on the sign-in screen.
  console.warn('[auth]', raw);
  return 'Something went wrong. Please try again.';
}

function fail(raw: string): never {
  throw new Error(friendlyMessage(raw));
}

function stateFromSession(
  session: Session | null,
  error: string | null = null,
  justCreated = false,
): AuthState {
  return {
    ready: true,
    session,
    userId: session?.user.id ?? null,
    isAnonymous: session?.user.is_anonymous ?? false,
    justCreated,
    email: session?.user.email ?? null,
    error,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    ready: false,
    session: null,
    userId: null,
    isAnonymous: false,
    justCreated: false,
    email: null,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled.current) return;

      if (data.session) {
        setState(stateFromSession(data.session));
        return;
      }

      // First launch on this device: create the account silently so the user
      // can photograph something before ever seeing a sign-up screen.
      for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
        const { data: signIn, error } = await supabase.auth.signInAnonymously();
        if (cancelled.current) return;

        if (!error && signIn.session) {
          setState(stateFromSession(signIn.session, null, true));
          return;
        }

        if (i < MAX_ATTEMPTS - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2 ** i * 500));
        }
      }

      if (!cancelled.current) {
        setState(stateFromSession(null, 'Could not reach WildPack. Check your connection and try again.'));
      }
    })();

    return () => {
      cancelled.current = true;
    };
  }, [attempt]);

  // Keeps state in step with token refreshes, sign-ups and sign-ins.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) return;
      setState((prev) => {
        // `justCreated` licenses overwriting the server's placeholder profile
        // name. A different account arriving means a real user signed in, and
        // their existing name must survive, so the flag does not travel.
        const sameUser = prev.userId === session.user.id;
        return stateFromSession(session, null, sameUser && prev.justCreated);
      });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    // Order matters: Supabase rejects a password on an account that has no
    // address yet. With email confirmation turned off the address attaches
    // immediately, so the password can follow in the same breath.
    const { error: emailError } = await supabase.auth.updateUser({ email });
    if (emailError) fail(emailError.message);

    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) fail(passwordError.message);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    // Read this device's sightings aside before the session changes; the
    // lifelist store replays them once the new account has claimed the
    // database. Held only for the length of the attempt.
    await beginAccountSwitch(state.userId);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      cancelAccountSwitch();
      fail(error.message);
    }
  }, [state.userId]);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) fail(error.message);
  }, []);

  const resetPassword = useCallback(async (email: string, code: string, password: string) => {
    // A recovery code signs the user in, so this is an account switch too.
    await beginAccountSwitch(state.userId);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'recovery',
    });
    if (verifyError) {
      cancelAccountSwitch();
      fail(verifyError.message);
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) fail(updateError.message);
  }, [state.userId]);

  const signOut = useCallback(async () => {
    cancelAccountSwitch();
    setState((prev) => ({ ...prev, ready: false, error: null }));
    await supabase.auth.signOut();
    // Every screen reads from a user-scoped database, so there is no signed-out
    // state to land in. Re-running the bootstrap mints a fresh anonymous
    // account, exactly as on a first launch.
    setAttempt((n) => n + 1);
  }, []);

  const retry = useCallback(() => {
    setState((prev) => ({ ...prev, ready: false, error: null }));
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signUp,
      signIn,
      requestPasswordReset,
      resetPassword,
      signOut,
      retry,
    }),
    [state, signUp, signIn, requestPasswordReset, resetPassword, signOut, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
