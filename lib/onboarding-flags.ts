import { deleteMeta, getMeta, setMeta } from './db';

/** Set once the user reaches A5, i.e. after look and name are chosen. */
export const COMPLETE_KEY = 'onboarding_complete';
/** ISO timestamp: "Skip for now" buys this much peace, then A1 comes back. */
export const SNOOZE_KEY = 'onboarding_snoozed_until';
export const SNOOZE_MS = 24 * 60 * 60 * 1000;

/**
 * Lives apart from `onboarding.tsx` so the sign-in path can reach it. That file
 * depends on the lifelist store, which depends on auth — importing it from the
 * auth side would close the loop.
 */
export async function isOnboardingComplete(): Promise<boolean> {
  return (await getMeta(COMPLETE_KEY)) === '1';
}

export async function markOnboardingComplete(): Promise<void> {
  await setMeta(COMPLETE_KEY, '1');
}

export async function snoozeOnboarding(): Promise<void> {
  await setMeta(SNOOZE_KEY, new Date(Date.now() + SNOOZE_MS).toISOString());
}

export async function isOnboardingSnoozed(): Promise<boolean> {
  const until = await getMeta(SNOOZE_KEY);
  return until !== null && Date.now() < Date.parse(until);
}

export async function clearOnboardingFlags(): Promise<void> {
  await Promise.all([deleteMeta(COMPLETE_KEY), deleteMeta(SNOOZE_KEY)]);
}
