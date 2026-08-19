import { supabase } from './supabase';
import * as db from './db';
import { savePhotoFromUrl, readPhotoBytes } from './photos';

const BUCKET = 'sightings';
const LAST_PULL_KEY = 'last_pulled_at';
/** Signed photo URLs only need to live long enough for one download. */
const SIGNED_URL_TTL_SECONDS = 60;

let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

export type SyncStatus = {
  syncing: boolean;
  /** Writes not yet accepted by the server. */
  pending: number;
  /** Of those, how many have failed repeatedly and need attention. */
  stuck: number;
  lastError: string | null;
};

export async function getSyncStatus(): Promise<SyncStatus> {
  const { pending, stuck, lastError } = await db.outboxStatus();
  return { syncing: inFlight !== null, pending, stuck, lastError };
}

/** Screens subscribe so the UI refreshes when the server sends something new. */
export function onSynced(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// --- push -------------------------------------------------------------------

async function runJob(job: db.OutboxJob, userId: string): Promise<void> {
  const payload = job.payload as any;

  switch (job.kind) {
    case 'species.upsert': {
      // Another user may have added this species already; that is fine.
      const { error } = await supabase.from('species').upsert(
        {
          slug: payload.slug,
          common_name: payload.commonName,
          scientific_name: payload.scientificName,
          description: payload.description,
          category_id: payload.categoryId,
        },
        { onConflict: 'slug', ignoreDuplicates: true },
      );
      if (error) throw new Error(error.message);
      return;
    }

    case 'sighting.insert': {
      const { error } = await supabase.from('sightings').upsert(
        {
          id: payload.id,
          user_id: userId,
          species_slug: payload.speciesSlug,
          location: payload.location ?? null,
          seen_at: payload.seenAt,
        },
        { onConflict: 'id' },
      );
      if (error) throw new Error(error.message);
      return;
    }

    case 'photo.upload': {
      const database = await db.getDb();
      const row = await database.getFirstAsync<{ photo_local_uri: string | null }>(
        'select photo_local_uri from sightings where id = ?',
        payload.sightingId,
      );

      const bytes = readPhotoBytes(payload.sightingId, row?.photo_local_uri ?? null);
      if (!bytes) return; // Local copy is gone; nothing left to upload.

      const path = `${userId}/${payload.sightingId}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      const { error: linkError } = await supabase
        .from('sightings')
        .update({ photo_path: path })
        .eq('id', payload.sightingId);
      if (linkError) throw new Error(linkError.message);

      await db.setSightingPhotoPath(payload.sightingId, path);
      return;
    }

    case 'profile.update': {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: payload.name,
          look: payload.look,
          streak: payload.streak,
          last_activity_date: payload.lastActivityDate ?? null,
        })
        .eq('id', userId);
      if (error) throw new Error(error.message);
      return;
    }

    case 'ama.insert': {
      const { error } = await supabase.from('ama_messages').upsert(
        {
          id: payload.id,
          user_id: userId,
          species_slug: payload.speciesSlug,
          role: payload.role,
          body: payload.body,
          created_at: payload.createdAt,
        },
        { onConflict: 'id' },
      );
      if (error) throw new Error(error.message);
      return;
    }
  }
}

/**
 * Drains queued local writes in the order they were made. Stops at the first
 * failure so a sighting never lands before the species row it references.
 */
async function flush(userId: string): Promise<void> {
  for (;;) {
    const jobs = await db.takeOutbox();
    if (jobs.length === 0) return;

    for (const job of jobs) {
      // A job still serving its backoff holds the whole queue, on purpose:
      // letting later writes jump ahead would land a sighting before the
      // species row it points at.
      if (job.nextAttemptAt && job.nextAttemptAt > new Date().toISOString()) return;

      try {
        await runJob(job, userId);
        await db.completeJob(job.id);
      } catch (error) {
        await db.failJob(job.id, job.attempts, errorMessage(error));
        return;
      }
    }
  }
}

// --- pull -------------------------------------------------------------------

async function pull(): Promise<void> {
  const since = await db.getMeta(LAST_PULL_KEY);
  const startedAt = new Date().toISOString();

  const profileQuery = supabase.from('profiles').select('name, look, streak, last_activity_date').maybeSingle();

  let sightingQuery = supabase
    .from('sightings')
    .select('id, species_slug, photo_path, location, seen_at, species(slug, common_name, scientific_name, description, category_id)')
    .order('seen_at', { ascending: true });
  if (since) sightingQuery = sightingQuery.gt('created_at', since);

  let amaQuery = supabase
    .from('ama_messages')
    .select('id, species_slug, role, body, created_at')
    .order('created_at', { ascending: true });
  if (since) amaQuery = amaQuery.gt('created_at', since);

  const [profileResult, sightingResult, amaResult] = await Promise.all([profileQuery, sightingQuery, amaQuery]);

  if (profileResult.error) throw new Error(profileResult.error.message);
  if (sightingResult.error) throw new Error(sightingResult.error.message);
  if (amaResult.error) throw new Error(amaResult.error.message);

  if (profileResult.data) {
    await db.writeProfile({
      name: profileResult.data.name,
      look: profileResult.data.look,
      streak: profileResult.data.streak,
      lastActivityDate: profileResult.data.last_activity_date,
    });
  }

  for (const row of sightingResult.data ?? []) {
    const species = row.species as any;
    if (species) {
      await db.upsertSpecies({
        slug: species.slug,
        commonName: species.common_name,
        scientificName: species.scientific_name,
        description: species.description,
        categoryId: species.category_id,
      });
    }

    await db.insertSighting({
      id: row.id,
      speciesSlug: row.species_slug,
      photoLocalUri: null,
      photoPath: row.photo_path,
      location: row.location,
      seenAt: row.seen_at,
    });
  }

  for (const row of amaResult.data ?? []) {
    await db.insertAmaMessage({
      id: row.id,
      speciesSlug: row.species_slug,
      role: row.role as 'user' | 'assistant',
      body: row.body,
      createdAt: row.created_at,
    });
  }

  await db.setMeta(LAST_PULL_KEY, startedAt);
}

/**
 * Fetches photos for sightings this device knows about but has never held a
 * copy of — the case after a reinstall or on a second phone.
 */
async function fetchMissingPhotos(): Promise<void> {
  const database = await db.getDb();
  const rows = await database.getAllAsync<{ id: string; photo_path: string }>(
    'select id, photo_path from sightings where photo_local_uri is null and photo_path is not null limit 20',
  );

  for (const row of rows) {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.photo_path, SIGNED_URL_TTL_SECONDS);
      if (error || !data) continue;

      const uri = await savePhotoFromUrl(row.id, data.signedUrl);
      await db.setSightingLocalUri(row.id, uri);
    } catch {
      // A photo that fails to download is retried on the next sync.
    }
  }
}

// --- entry point ------------------------------------------------------------

/**
 * Push local changes, then pull server changes. Safe to call often — repeat
 * calls join the run already in progress instead of stacking up.
 */
export function sync(userId: string): Promise<void> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      await flush(userId);
      await pull();
      await fetchMissingPhotos();
      notify();
    } catch {
      // Offline or server trouble: local data is untouched and the outbox
      // still holds every pending write, so the next attempt picks up here.
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
