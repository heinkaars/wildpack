import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

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
  /** Turns the anonymous account into a real one, keeping the same user id. */
  linkEmail: (email: string, password: string) => Promise<void>;
  retry: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const MAX_ATTEMPTS = 5;

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

  // Keeps state in step with token refreshes and with linkEmail upgrades.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setState((prev) => stateFromSession(session, null, prev.justCreated));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const linkEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.updateUser({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const retry = useCallback(() => {
    setState((prev) => ({ ...prev, ready: false, error: null }));
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, linkEmail, retry }),
    [state, linkEmail, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
