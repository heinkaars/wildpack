import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as db from './db';
import { savePhoto } from './photos';
import { onSynced, sync } from './sync';
import { migrateLegacyData } from './migrate-legacy';
import { useAuth } from './auth';
import { slugify } from './slug';
import { uuid } from './uuid';
import { milestoneForCount } from './milestones';
import { CelebrationPayload, LifelistEntry, Profile, SpeciesGuess } from './types';
import { DEFAULT_LOOK } from '../components/Avatar';

// A friendly stand-in until the user picks a name on A4. The suffix is drawn
// once per launch and then persisted with the profile row, so the name a user
// sees on their lifelist never changes underneath them.
const DEFAULT_PROFILE: Profile = {
  name: `Explorer_${Math.floor(10 + Math.random() * 90)}`,
  look: DEFAULT_LOOK,
};

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isYesterday(previousKey: string, todayKey: string): boolean {
  const previous = new Date(previousKey);
  const today = new Date(todayKey);
  const diffDays = Math.round((today.getTime() - previous.getTime()) / 86_400_000);
  return diffDays === 1;
}

function nextStreakValue(current: number, lastActivityDate: string | null, todayKey: string): number {
  if (lastActivityDate === todayKey) return current || 1;
  if (lastActivityDate && isYesterday(lastActivityDate, todayKey)) return current + 1;
  return 1;
}

type LifelistState = {
  ready: boolean;
  profile: Profile;
  entries: LifelistEntry[];
  streak: number;
  lastActivityDate: string | null;
};

type LifelistContextValue = Omit<LifelistState, 'lastActivityDate'> & {
  getEntry: (id: string) => LifelistEntry | undefined;
  /** Takes the photo's base64 so the sighting keeps a durable local copy. */
  addSighting: (guess: SpeciesGuess, photoBase64: string, location: string | null) => Promise<CelebrationPayload>;
  updateProfile: (profile: Partial<Profile>) => Promise<void>;
};

const LifelistContext = createContext<LifelistContextValue | null>(null);

export function LifelistProvider({ children }: { children: React.ReactNode }) {
  const { ready: authReady, userId, justCreated } = useAuth();
  const [state, setState] = useState<LifelistState>({
    ready: false,
    profile: DEFAULT_PROFILE,
    entries: [],
    streak: 0,
    lastActivityDate: null,
  });

  // Everything the screens show comes from the local database, so this is the
  // only thing that stands between launch and a rendered lifelist.
  const refresh = useCallback(async () => {
    const [entries, profile] = await Promise.all([db.readLifelist(), db.readProfile()]);
    setState({
      ready: true,
      entries,
      profile: profile ? { name: profile.name, look: profile.look } : DEFAULT_PROFILE,
      streak: profile?.streak ?? 0,
      lastActivityDate: profile?.lastActivityDate ?? null,
    });
  }, []);

  useEffect(() => {
    if (!authReady || !userId) return;
    let cancelled = false;

    (async () => {
      await db.claimForUser(userId);
      await migrateLegacyData();

      if (!(await db.readProfile())) {
        const starter = { ...DEFAULT_PROFILE, streak: 0, lastActivityDate: null };
        await db.writeProfile(starter);

        // The server creates its own profile row with a placeholder name, and
        // the next pull would overwrite ours with it. Claim the row for this
        // device's generated name — but only for an account created moments
        // ago, so signing an existing account in on a new device never
        // overwrites the name that account already chose.
        if (justCreated) await db.enqueue('profile.update', starter);
      }

      if (cancelled) return;
      await refresh();
      // Render first, reconcile with the server afterwards.
      sync(userId);
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, userId, justCreated, refresh]);

  useEffect(() => onSynced(refresh), [refresh]);

  // Catch up on anything that happened elsewhere while the app was backgrounded.
  useEffect(() => {
    if (!userId) return;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') sync(userId);
    });
    return () => subscription.remove();
  }, [userId]);

  const stateRef = useRef(state);
  stateRef.current = state;

  const value = useMemo<LifelistContextValue>(() => {
    const { lastActivityDate: _ignored, ...visible } = state;

    return {
      ...visible,

      getEntry: (id) => state.entries.find((entry) => entry.id === id),

      updateProfile: async (partial) => {
        const profile = { ...stateRef.current.profile, ...partial };
        setState((prev) => ({ ...prev, profile }));

        await db.writeProfile({
          ...profile,
          streak: stateRef.current.streak,
          lastActivityDate: stateRef.current.lastActivityDate,
        });
        await db.enqueue('profile.update', {
          ...profile,
          streak: stateRef.current.streak,
          lastActivityDate: stateRef.current.lastActivityDate,
        });

        if (userId) sync(userId);
      },

      addSighting: async (guess, photoBase64, location) => {
        const current = stateRef.current;
        const speciesSlug = slugify(guess.scientificName || guess.commonName);
        const sightingId = uuid();
        const now = new Date();
        const seenAt = now.toISOString();
        const todayKey = dateKey(now);

        const isNewSpecies = !current.entries.some((entry) => entry.id === speciesSlug);

        // Write the photo to app storage before anything else so the tile has
        // something to render even if the upload never succeeds.
        let photoLocalUri: string | null = null;
        try {
          photoLocalUri = savePhoto(sightingId, photoBase64);
        } catch (error) {
          // The sighting is still worth keeping without its photo, but a
          // silent failure here is what an empty lifelist tile looks like.
          console.warn('Could not save the captured photo', error);
          photoLocalUri = null;
        }

        const species = {
          slug: speciesSlug,
          commonName: guess.commonName,
          scientificName: guess.scientificName,
          description: guess.description,
          categoryId: guess.categoryId,
        };

        await db.upsertSpecies(species);
        await db.insertSighting({
          id: sightingId,
          speciesSlug,
          photoLocalUri,
          photoPath: null,
          location,
          seenAt,
        });

        const streak = nextStreakValue(current.streak, current.lastActivityDate, todayKey);
        const profileRow = { ...current.profile, streak, lastActivityDate: todayKey };
        await db.writeProfile(profileRow);

        // Queued in dependency order: the species row must exist on the server
        // before the sighting that points at it.
        await db.enqueue('species.upsert', species);
        await db.enqueue('sighting.insert', { id: sightingId, speciesSlug, location, seenAt });
        if (photoLocalUri) await db.enqueue('photo.upload', { sightingId });
        await db.enqueue('profile.update', profileRow);

        const entries = await db.readLifelist();
        setState((prev) => ({ ...prev, entries, streak, lastActivityDate: todayKey }));

        if (userId) sync(userId);

        const entry = entries.find((candidate) => candidate.id === speciesSlug) as LifelistEntry;

        return {
          entry,
          isNewSpecies,
          streak,
          milestone: isNewSpecies ? milestoneForCount(entries.length) : null,
          speciesNumber: entries.length,
        };
      },
    };
  }, [state, userId]);

  return <LifelistContext.Provider value={value}>{children}</LifelistContext.Provider>;
}

export function useLifelist(): LifelistContextValue {
  const ctx = useContext(LifelistContext);
  if (!ctx) throw new Error('useLifelist must be used within a LifelistProvider');
  return ctx;
}
