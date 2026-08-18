import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from './storage';
import { slugify } from './slug';
import { milestoneForCount } from './milestones';
import { CelebrationPayload, LifelistEntry, Profile, SpeciesGuess } from './types';

const DEFAULT_PROFILE: Profile = { name: 'TrailUser_42', look: 'fox' };

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isYesterday(previousKey: string, todayKey: string): boolean {
  const previous = new Date(previousKey);
  const today = new Date(todayKey);
  const diffDays = Math.round((today.getTime() - previous.getTime()) / 86_400_000);
  return diffDays === 1;
}

type LifelistState = {
  ready: boolean;
  profile: Profile;
  entries: LifelistEntry[];
  streak: number;
};

type LifelistContextValue = LifelistState & {
  getEntry: (id: string) => LifelistEntry | undefined;
  addSighting: (guess: SpeciesGuess, photoUri: string, location: string | null) => Promise<CelebrationPayload>;
  updateProfile: (profile: Partial<Profile>) => Promise<void>;
};

const LifelistContext = createContext<LifelistContextValue | null>(null);

export function LifelistProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LifelistState>({
    ready: false,
    profile: DEFAULT_PROFILE,
    entries: [],
    streak: 0,
  });

  useEffect(() => {
    (async () => {
      const [profile, entries, streak] = await Promise.all([
        storage.readJson<Profile>(storage.keys.profile),
        storage.readJson<LifelistEntry[]>(storage.keys.entries),
        storage.readJson<number>(storage.keys.streak),
      ]);
      setState({
        ready: true,
        profile: profile ?? DEFAULT_PROFILE,
        entries: entries ?? [],
        streak: streak ?? 0,
      });
    })();
  }, []);

  const value = useMemo<LifelistContextValue>(() => ({
    ...state,
    getEntry: (id) => state.entries.find((entry) => entry.id === id),
    updateProfile: async (partial) => {
      const nextProfile = { ...state.profile, ...partial };
      setState((prev) => ({ ...prev, profile: nextProfile }));
      await storage.writeJson(storage.keys.profile, nextProfile);
    },
    addSighting: async (guess, photoUri, location) => {
      const id = slugify(guess.scientificName || guess.commonName);
      const now = new Date();
      const nowIso = now.toISOString();
      const todayKey = dateKey(now);

      const existing = state.entries.find((entry) => entry.id === id);
      const isNewSpecies = !existing;

      let nextEntries: LifelistEntry[];
      let entry: LifelistEntry;
      if (existing) {
        entry = {
          ...existing,
          lastSeenAt: nowIso,
          sightingCount: existing.sightingCount + 1,
          location: location ?? existing.location,
        };
        nextEntries = state.entries.map((e) => (e.id === id ? entry : e));
      } else {
        entry = {
          id,
          commonName: guess.commonName,
          scientificName: guess.scientificName,
          description: guess.description,
          categoryId: guess.categoryId,
          photoUri,
          firstSeenAt: nowIso,
          lastSeenAt: nowIso,
          sightingCount: 1,
          location,
        };
        nextEntries = [entry, ...state.entries];
      }

      const lastActivityDate = await storage.readJson<string>(storage.keys.lastActivityDate);
      let nextStreak = state.streak;
      if (lastActivityDate === todayKey) {
        nextStreak = state.streak || 1;
      } else if (lastActivityDate && isYesterday(lastActivityDate, todayKey)) {
        nextStreak = state.streak + 1;
      } else {
        nextStreak = 1;
      }

      setState((prev) => ({ ...prev, entries: nextEntries, streak: nextStreak }));
      await Promise.all([
        storage.writeJson(storage.keys.entries, nextEntries),
        storage.writeJson(storage.keys.streak, nextStreak),
        storage.writeJson(storage.keys.lastActivityDate, todayKey),
      ]);

      const milestone = isNewSpecies ? milestoneForCount(nextEntries.length) : null;

      return {
        entry,
        isNewSpecies,
        streak: nextStreak,
        milestone,
        speciesNumber: nextEntries.length,
      };
    },
  }), [state]);

  return <LifelistContext.Provider value={value}>{children}</LifelistContext.Provider>;
}

export function useLifelist(): LifelistContextValue {
  const ctx = useContext(LifelistContext);
  if (!ctx) throw new Error('useLifelist must be used within a LifelistProvider');
  return ctx;
}
