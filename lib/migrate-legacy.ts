import AsyncStorage from '@react-native-async-storage/async-storage';
import * as db from './db';
import { LifelistEntry, Profile } from './types';
import { uuid } from './uuid';

const LEGACY_KEYS = {
  entries: 'wildpack.lifelist.entries',
  profile: 'wildpack.lifelist.profile',
  streak: 'wildpack.lifelist.streak',
  lastActivityDate: 'wildpack.lifelist.lastActivityDate',
} as const;

const DONE_FLAG = 'legacy_migrated';

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Spreads a species' repeat sightings evenly across the span it was seen over,
 * so the count carried by the old single-row format survives the move to one
 * row per sighting.
 */
function sightingTimes(entry: LifelistEntry): string[] {
  const count = Math.max(1, entry.sightingCount);
  if (count === 1) return [entry.firstSeenAt];

  const start = new Date(entry.firstSeenAt).getTime();
  const end = new Date(entry.lastSeenAt).getTime();
  const step = (end - start) / (count - 1);

  return Array.from({ length: count }, (_, i) => new Date(start + step * i).toISOString());
}

/**
 * Moves anything saved by the pre-Supabase build into the local database and
 * queues it for upload. Runs once; afterwards the flag short-circuits it.
 */
export async function migrateLegacyData(): Promise<boolean> {
  if (await db.getMeta(DONE_FLAG)) return false;

  const [entries, profile, streak, lastActivityDate] = await Promise.all([
    readJson<LifelistEntry[]>(LEGACY_KEYS.entries),
    readJson<Profile>(LEGACY_KEYS.profile),
    readJson<number>(LEGACY_KEYS.streak),
    readJson<string>(LEGACY_KEYS.lastActivityDate),
  ]);

  let migrated = false;

  for (const entry of entries ?? []) {
    const species = {
      slug: entry.id,
      commonName: entry.commonName,
      scientificName: entry.scientificName,
      description: entry.description,
      categoryId: entry.categoryId,
    };

    await db.upsertSpecies(species);
    await db.enqueue('species.upsert', species);

    const times = sightingTimes(entry);
    for (const [index, seenAt] of times.entries()) {
      const sightingId = uuid();
      const isFirst = index === 0;

      await db.insertSighting({
        id: sightingId,
        speciesSlug: entry.id,
        // The old photo lived at a camera temp path that may already be gone.
        // Keeping it costs nothing and the tile still renders if it survived.
        photoLocalUri: isFirst ? entry.photoUri || null : null,
        photoPath: null,
        location: index === times.length - 1 ? entry.location : null,
        seenAt,
      });

      await db.enqueue('sighting.insert', {
        id: sightingId,
        speciesSlug: entry.id,
        location: index === times.length - 1 ? entry.location : null,
        seenAt,
      });
    }

    migrated = true;
  }

  if (profile || streak != null) {
    const profileRow = {
      name: profile?.name ?? 'TrailUser_42',
      look: profile?.look ?? 'fox',
      streak: streak ?? 0,
      lastActivityDate: lastActivityDate ?? null,
    };
    await db.writeProfile(profileRow);
    await db.enqueue('profile.update', profileRow);
    migrated = true;
  }

  await db.setMeta(DONE_FLAG, new Date().toISOString());
  return migrated;
}
