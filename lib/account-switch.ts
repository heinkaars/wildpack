import * as db from './db';
import { adoptPhoto, resolvePhotoUri } from './photos';
import { markOnboardingComplete } from './onboarding-flags';
import { uuid } from './uuid';

/**
 * Signing in swaps one account for another, and `claimForUser` clears the local
 * database so two lifelists never blend. Anything captured anonymously would go
 * with it, so it is read out first and re-queued against the account being
 * signed into — the sightings move, rather than being lost.
 *
 * Nothing here talks to the server. The outbox jobs it writes are the ordinary
 * ones, and `runJob` stamps whichever user is signed in at the time onto each
 * row, so the existing sync engine does the actual move on its next run.
 *
 * Everything moved is given a fresh id. Reusing the old one looks tempting but
 * cannot work: if the sighting already reached the server it belongs to the
 * previous account there, and the row-level security rule checks the *existing*
 * row's owner, so the new account is refused. A new id makes it a plain insert
 * that the new account owns outright. The originals are left where they are,
 * unreachable behind the abandoned account, rather than risking a delete.
 */

export type MergeResult = {
  species: number;
  sightings: number;
  amaMessages: number;
  /** Sightings whose photo file was gone, so only the record could be moved. */
  photosLost: number;
};

type PendingSwitch = {
  fromUserId: string | null;
  snapshot: db.LocalSnapshot;
};

let pending: PendingSwitch | null = null;

/** What a merge would carry, for the confirmation copy before signing in. */
export async function previewMerge(): Promise<{ species: number; sightings: number }> {
  const snapshot = await db.exportLocalData();
  return { species: snapshot.species.length, sightings: snapshot.sightings.length };
}

/**
 * Reads the current account's local data aside. Call immediately before a
 * sign-in attempt; the snapshot is only applied if the account actually changes.
 */
export async function beginAccountSwitch(fromUserId: string | null): Promise<void> {
  pending = { fromUserId, snapshot: await db.exportLocalData() };
}

/** The sign-in did not happen, so nothing is moving. */
export function cancelAccountSwitch(): void {
  pending = null;
}

export function hasPendingSwitch(): boolean {
  return pending !== null;
}

/**
 * Replays the snapshot into the freshly claimed database and queues it for
 * upload. Runs after `claimForUser`, which is what emptied the tables.
 */
export async function completeAccountSwitch(userId: string): Promise<MergeResult | null> {
  const current = pending;
  if (!current) return null;

  // The lifelist store re-runs for reasons other than a sign-in. Seeing the
  // same account here means the swap has not happened yet, so the snapshot is
  // left in place rather than thrown away before it can be used.
  if (current.fromUserId === userId) return null;

  pending = null;

  const { species, sightings, amaMessages } = current.snapshot;
  let photosLost = 0;

  // Someone with an account to sign into has been past onboarding already, and
  // the flags were just cleared with the rest of the database.
  await markOnboardingComplete();

  // Species first: a sighting cannot land on the server before the row it
  // references, and the outbox drains oldest-first.
  for (const row of species) {
    await db.upsertSpecies(row);
    await db.enqueue('species.upsert', row);
  }

  for (const row of sightings) {
    const id = uuid();

    // Photo files are named after the sighting, so a new id needs its own copy.
    // On the web the photo *is* the stored data URL and travels with the row.
    const existing = resolvePhotoUri(row.id, row.photoLocalUri);
    const photoLocalUri = existing
      ? existing.startsWith('data:')
        ? existing
        : adoptPhoto(id, existing)
      : null;

    // The old photo_path points into the previous account's storage folder,
    // which this user has no permission to read, so it is dropped and the
    // picture is uploaded again from the local copy.
    if (!photoLocalUri && (row.photoPath || row.photoLocalUri)) photosLost += 1;

    await db.insertSighting({
      id,
      speciesSlug: row.speciesSlug,
      photoLocalUri,
      photoPath: null,
      location: row.location,
      seenAt: row.seenAt,
    });
    await db.enqueue('sighting.insert', {
      id,
      speciesSlug: row.speciesSlug,
      location: row.location,
      seenAt: row.seenAt,
    });

    if (photoLocalUri) await db.enqueue('photo.upload', { sightingId: id });
  }

  for (const row of amaMessages) {
    const message = { ...row, id: uuid() };
    await db.insertAmaMessage(message);
    await db.enqueue('ama.insert', message);
  }

  // The profile is deliberately not carried over: the account being signed into
  // already has a name, avatar and streak, and those are the ones to keep.

  if (photosLost > 0) {
    // The sighting still moved; only its picture could not be re-uploaded,
    // which is what an empty lifelist tile looks like afterwards.
    console.warn(`Moved ${sightings.length} sightings, but ${photosLost} had no local photo left`);
  }

  return {
    species: species.length,
    sightings: sightings.length,
    amaMessages: amaMessages.length,
    photosLost,
  };
}
