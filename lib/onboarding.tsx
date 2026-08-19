import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { deleteMeta, getMeta, setMeta } from './db';
import { useLifelist } from './lifelist-store';
import { colors } from './theme';

/** Set once the user reaches A5, i.e. after look and name are chosen. */
const COMPLETE_KEY = 'onboarding_complete';
/** ISO timestamp: "Skip for now" buys this much peace, then A1 comes back. */
const SNOOZE_KEY = 'onboarding_snoozed_until';
const SNOOZE_MS = 24 * 60 * 60 * 1000;

type OnboardingContextValue = {
  /** False until the flags have been read, so nothing renders too early. */
  ready: boolean;
  needsOnboarding: boolean;
  /** "Skip for now": straight to the lifelist, ask again in 24 hours. */
  skipForNow: () => Promise<void>;
  markComplete: () => Promise<void>;
  /** Dev-only: clears both flags so A1 shows again immediately. */
  resetOnboarding: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  // The lifelist store claims the local database for the signed-in user, which
  // clears meta when the account changes. Reading the flags after it is ready
  // keeps a fresh account from inheriting the previous one's progress.
  const { ready: dataReady } = useLifelist();
  const [ready, setReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!dataReady) return;
    let cancelled = false;

    (async () => {
      const [complete, snoozedUntil] = await Promise.all([
        getMeta(COMPLETE_KEY),
        getMeta(SNOOZE_KEY),
      ]);
      if (cancelled) return;

      const snoozed = snoozedUntil !== null && Date.now() < Date.parse(snoozedUntil);
      setNeedsOnboarding(complete !== '1' && !snoozed);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [dataReady]);

  const skipForNow = useCallback(async () => {
    setNeedsOnboarding(false);
    await setMeta(SNOOZE_KEY, new Date(Date.now() + SNOOZE_MS).toISOString());
  }, []);

  const markComplete = useCallback(async () => {
    setNeedsOnboarding(false);
    await setMeta(COMPLETE_KEY, '1');
  }, []);

  const resetOnboarding = useCallback(async () => {
    await Promise.all([deleteMeta(COMPLETE_KEY), deleteMeta(SNOOZE_KEY)]);
    setNeedsOnboarding(true);
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({ ready, needsOnboarding, skipForNow, markComplete, resetOnboarding }),
    [ready, needsOnboarding, skipForNow, markComplete, resetOnboarding],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within an OnboardingProvider');
  return ctx;
}

/**
 * Sends first-time users to A1 on launch and covers the screen until we know
 * where they belong, so the lifelist never flashes behind the welcome screen.
 * Only redirects into onboarding: A5 marks the flow complete while still on it.
 */
export function OnboardingGate() {
  const { ready, needsOnboarding } = useOnboarding();
  const router = useRouter();
  const segments = useSegments();
  const inOnboarding = segments[0] === 'onboarding';

  useEffect(() => {
    if (!ready || !needsOnboarding || inOnboarding) return;
    router.replace('/onboarding/welcome');
  }, [ready, needsOnboarding, inOnboarding, router]);

  if (ready) return null;

  return (
    <View style={styles.cover}>
      <Text style={styles.wordmark}>WildPack</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: { fontSize: 22, fontWeight: '700', color: colors.forest, letterSpacing: 0.5 },
});
