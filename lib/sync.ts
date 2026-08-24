import { supabase } from './supabase';
import * as db from './db';
import { adoptPhoto, hasLocalPhoto, savePhotoFromUrl, readPhotoBytes } from './photos';

const BUCKET = 'sightings';
const LAST_PULL_KEY = 'last_pulled_at';
/** Signed photo URLs only need to live long enough for one download. */
const SIGNED_URL_TTL_SECONDS = 60;
/** Keeps a big backlog from holding up a sync; the rest follow next time. */
const MAX_PHOTO_DOWNLOADS_PER_SYNC = 20;
/** Photos come back several at a time; one after another is painfully slow. */
const PHOTO_DOWNLOAD_CONCURRENCY = 4;

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

/**
 * Postgres codes that will never come good, however long the backoff waits:
 * a policy that refuses this write, or a row pointing at something absent.
 */
const PERMANENT_CODES = new Set(['42501', '23503']);

/** A job that retrying cannot fix. It is dropped rather than left in the way. */
class PermanentError extends Error {}

function rethrow(error: { message: string; code?: string }): never {
  if (error.code && PERMANENT_CODES.has(error.code)) throw new PermanentError(error.message);
  throw new Error(error.message);
}

// --- push -------------------------------------------------------------------

async function runJob(job: db.OutboxJob, userId: string): Promise<void> {
  const payload = job.payload as any;

  switch (job.kind) {
    case 'species.upsert': {
      // The shared catalog is written server-side now, in app/api/identify.
      // This job stays as the safety net for a database that has not had the
      // new policies applied yet: there it still works, and on a migrated one
      // it is refused and quietly dropped. Another user may have added the
      // species already; that is fine either way.
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
      if (error) rethrow(error);
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
      if (error) rethrow(error);
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
      if (uploadError) rethrow(uploadError);

      const { error: linkError } = await supabase
        .from('sightings')
        .update({ photo_path: path })
        .eq('id', payload.sightingId);
      if (linkError) rethrow(linkError);

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
      if (error) rethrow(error);
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
      if (error) rethrow(error);
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
        if (error instanceof PermanentError) {
          // Waiting cannot help this one, and leaving it queued would hold
          // every later write behind it forever — `flush` stops at the first
          // failure on purpose, so one stuck job would stop all syncing.
          if (job.kind !== 'species.upsert') {
            // A refused species write is expected once the catalog moved
            // server-side; anything else being refused is worth knowing about.
            console.warn(`Dropping ${job.kind}: ${errorMessage(error)}`);
          }
          await db.completeJob(job.id);
          continue;
        }
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
 * Puts photos back where the app can see them. A sighting loses its picture
 * whenever the file it points at is gone — a cleared camera cache, a reinstall,
 * a second phone — so anything not on disk is copied in or downloaded again.
 */
async function repairPhotos(): Promise<void> {
  const records = await db.readPhotoRecords();
  const toDownload: typeof records = [];

  for (const record of records) {
    if (hasLocalPhoto(record.id, record.photoLocalUri)) continue;

    try {
      // A file that is still on disk but outside app storage — a capture from
      // an older build — only needs copying in, no network at all.
      const adopted = record.photoLocalUri ? adoptPhoto(record.id, record.photoLocalUri) : null;
      if (adopted) {
        await db.setSightingLocalUri(record.id, adopted);
        if (!record.photoPath) await db.enqueue('photo.upload', { sightingId: record.id });
        continue;
      }

      if (record.photoPath) toDownload.push(record);
    } catch {
      // A photo that cannot be adopted is retried on the next sync.
    }
  }

  const queue = toDownload.slice(0, MAX_PHOTO_DOWNLOADS_PER_SYNC);
  let next = 0;

  // Several at a time, and each tile is announced the moment its own photo
  // lands, so the lifelist fills in rather than staying blank until the last
  // download finishes.
  const worker = async (): Promise<void> => {
    for (;;) {
      const record = queue[next];
      next += 1;
      if (!record) return;

      try {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(record.photoPath as string, SIGNED_URL_TTL_SECONDS);
        if (error || !data) continue;

        const uri = await savePhotoFromUrl(record.id, data.signedUrl);
        await db.setSightingLocalUri(record.id, uri);
        notify();
      } catch {
        // A photo that fails to come back is retried on the next sync.
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(PHOTO_DOWNLOAD_CONCURRENCY, queue.length) }, worker),
  );
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

      // The lifelist, the name and the streak are all in the local database by
      // now, so show them. Waiting until the photos have been fetched too left
      // a signed-in user staring at an empty list for as long as the slowest
      // download took.
      notify();

      await repairPhotos();
      // A repaired photo may have queued its own upload.
      await flush(userId);
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
