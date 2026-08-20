// Type-only: the runtime module is imported lazily in connect() below, because
// expo-sqlite's web build cannot load during Expo's Node server render.
import type { SQLiteDatabase } from 'expo-sqlite';
import { resolvePhotoUri } from './photos';
import { AmaMessage, LifelistEntry, Profile } from './types';

const DATABASE_NAME = 'wildpack.db';

/**
 * Local mirror of the Supabase tables plus an outbox of writes that have not
 * reached the server yet. Every screen reads from here, so the UI never waits
 * on the network.
 */
const SCHEMA = `
create table if not exists species (
  slug            text primary key,
  common_name     text not null,
  scientific_name text not null,
  description     text not null default '',
  category_id     text not null
);

create table if not exists sightings (
  id              text primary key,
  species_slug    text not null,
  photo_path      text,
  photo_local_uri text,
  location        text,
  seen_at         text not null
);

create index if not exists sightings_species_idx on sightings (species_slug, seen_at);

create table if not exists ama_messages (
  id           text primary key,
  species_slug text not null,
  role         text not null,
  body         text not null,
  created_at   text not null
);

create index if not exists ama_thread_idx on ama_messages (species_slug, created_at);

create table if not exists profile (
  id                 integer primary key check (id = 1),
  name               text not null,
  look               text not null,
  streak             integer not null default 0,
  last_activity_date text
);

create table if not exists outbox (
  id         integer primary key autoincrement,
  kind       text not null,
  payload    text not null,
  created_at      text not null,
  attempts        integer not null default 0,
  last_error      text,
  next_attempt_at text
);

create table if not exists meta (
  key   text primary key,
  value text
);
`;

let dbPromise: Promise<SQLiteDatabase> | null = null;

async function connect(): Promise<SQLiteDatabase> {
  const SQLite = await import('expo-sqlite');
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('pragma journal_mode = WAL;');
  await db.execAsync(SCHEMA);

  // Devices set up before retry backoff existed already have an outbox table,
  // which `create table if not exists` leaves untouched.
  try {
    await db.execAsync('alter table outbox add column next_attempt_at text');
  } catch {
    // Column is already there.
  }

  return db;
}

export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) dbPromise = connect();
  return dbPromise;
}

// --- meta -------------------------------------------------------------------

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('select value from meta where key = ?', key);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'insert into meta (key, value) values (?, ?) on conflict (key) do update set value = excluded.value',
    key,
    value,
  );
}

export async function deleteMeta(key: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('delete from meta where key = ?', key);
}

/**
 * The local database holds exactly one user's data. If a different account
 * signs in, throw the old copy away rather than blending two lifelists.
 */
export async function claimForUser(userId: string): Promise<void> {
  const owner = await getMeta('owner_user_id');
  if (owner === userId) return;

  const db = await getDb();
  if (owner !== null) {
    await db.execAsync(
      'delete from sightings; delete from ama_messages; delete from profile; delete from outbox; delete from meta;',
    );
  }
  await setMeta('owner_user_id', userId);
}

// --- reads ------------------------------------------------------------------

const LIFELIST_QUERY = `
select
  sp.slug                     as id,
  sp.common_name              as commonName,
  sp.scientific_name          as scientificName,
  sp.description              as description,
  sp.category_id              as categoryId,
  agg.first_seen_at           as firstSeenAt,
  agg.last_seen_at            as lastSeenAt,
  agg.sighting_count          as sightingCount,
  photo.id                    as photoSightingId,
  photo.photo_local_uri       as photoLocalUri,
  loc.location                as location
from species sp
join (
  select species_slug,
         min(seen_at) as first_seen_at,
         max(seen_at) as last_seen_at,
         count(*)     as sighting_count
  from sightings
  group by species_slug
) agg on agg.species_slug = sp.slug
left join sightings photo on photo.id = (
  select id from sightings
  where species_slug = sp.slug and (photo_local_uri is not null or photo_path is not null)
  order by seen_at asc limit 1
)
left join sightings loc on loc.id = (
  select id from sightings
  where species_slug = sp.slug and location is not null
  order by seen_at desc limit 1
)
order by agg.last_seen_at desc
`;

type LifelistRow = Omit<LifelistEntry, 'photoUri'> & {
  photoSightingId: string | null;
  photoLocalUri: string | null;
};

export async function readLifelist(): Promise<LifelistEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LifelistRow>(LIFELIST_QUERY);

  return rows.map(({ photoSightingId, photoLocalUri, ...entry }) => ({
    ...entry,
    // Only a file that is on this device can be rendered. Anything else is
    // empty until sync fetches the photo back from the server.
    photoUri: photoSightingId ? resolvePhotoUri(photoSightingId, photoLocalUri) ?? '' : '',
  }));
}

export async function readProfile(): Promise<(Profile & { streak: number; lastActivityDate: string | null }) | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    name: string;
    look: string;
    streak: number;
    last_activity_date: string | null;
  }>('select name, look, streak, last_activity_date from profile where id = 1');

  if (!row) return null;
  return { name: row.name, look: row.look, streak: row.streak, lastActivityDate: row.last_activity_date };
}

export async function readAmaMessages(speciesSlug: string): Promise<AmaMessage[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; role: 'user' | 'assistant'; body: string }>(
    'select id, role, body from ama_messages where species_slug = ? order by created_at asc',
    speciesSlug,
  );
  return rows.map((row) => ({ id: row.id, role: row.role, text: row.body }));
}

// --- writes -----------------------------------------------------------------

export async function upsertSpecies(species: {
  slug: string;
  commonName: string;
  scientificName: string;
  description: string;
  categoryId: string;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `insert into species (slug, common_name, scientific_name, description, category_id)
     values (?, ?, ?, ?, ?)
     on conflict (slug) do update set
       common_name     = excluded.common_name,
       scientific_name = excluded.scientific_name,
       description     = excluded.description,
       category_id     = excluded.category_id`,
    species.slug,
    species.commonName,
    species.scientificName,
    species.description,
    species.categoryId,
  );
}

export async function insertSighting(sighting: {
  id: string;
  speciesSlug: string;
  photoLocalUri: string | null;
  photoPath: string | null;
  location: string | null;
  seenAt: string;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `insert into sightings (id, species_slug, photo_local_uri, photo_path, location, seen_at)
     values (?, ?, ?, ?, ?, ?)
     on conflict (id) do update set
       photo_local_uri = coalesce(excluded.photo_local_uri, sightings.photo_local_uri),
       photo_path      = coalesce(excluded.photo_path, sightings.photo_path),
       location        = coalesce(excluded.location, sightings.location)`,
    sighting.id,
    sighting.speciesSlug,
    sighting.photoLocalUri,
    sighting.photoPath,
    sighting.location,
    sighting.seenAt,
  );
}

/** Every sighting that claims a photo, for the sync engine's repair pass. */
export async function readPhotoRecords(): Promise<
  { id: string; photoLocalUri: string | null; photoPath: string | null }[]
> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; photo_local_uri: string | null; photo_path: string | null }>(
    `select id, photo_local_uri, photo_path from sightings
     where photo_local_uri is not null or photo_path is not null
     order by seen_at desc`,
  );
  return rows.map((row) => ({ id: row.id, photoLocalUri: row.photo_local_uri, photoPath: row.photo_path }));
}

export async function setSightingPhotoPath(id: string, photoPath: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('update sightings set photo_path = ? where id = ?', photoPath, id);
}

export async function setSightingLocalUri(id: string, uri: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('update sightings set photo_local_uri = ? where id = ?', uri, id);
}

export async function writeProfile(profile: {
  name: string;
  look: string;
  streak: number;
  lastActivityDate: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `insert into profile (id, name, look, streak, last_activity_date)
     values (1, ?, ?, ?, ?)
     on conflict (id) do update set
       name               = excluded.name,
       look               = excluded.look,
       streak             = excluded.streak,
       last_activity_date = excluded.last_activity_date`,
    profile.name,
    profile.look,
    profile.streak,
    profile.lastActivityDate,
  );
}

export async function insertAmaMessage(message: {
  id: string;
  speciesSlug: string;
  role: 'user' | 'assistant';
  body: string;
  createdAt: string;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `insert into ama_messages (id, species_slug, role, body, created_at)
     values (?, ?, ?, ?, ?)
     on conflict (id) do nothing`,
    message.id,
    message.speciesSlug,
    message.role,
    message.body,
    message.createdAt,
  );
}

// --- outbox -----------------------------------------------------------------

export type OutboxKind =
  | 'species.upsert'
  | 'sighting.insert'
  | 'photo.upload'
  | 'profile.update'
  | 'ama.insert';

export type OutboxJob = {
  id: number;
  kind: OutboxKind;
  payload: Record<string, unknown>;
  attempts: number;
  /** Set while a failed job is waiting out its backoff. */
  nextAttemptAt: string | null;
};

export async function enqueue(kind: OutboxKind, payload: Record<string, unknown>): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'insert into outbox (kind, payload, created_at) values (?, ?, ?)',
    kind,
    JSON.stringify(payload),
    new Date().toISOString(),
  );
}

/**
 * Failed jobs retry on a widening delay instead of being abandoned. A queued
 * write is somebody's sighting, so it is never dropped — it waits for whatever
 * was wrong (no signal, a server hiccup) to clear.
 */
function backoffSeconds(attempts: number): number {
  return Math.min(2 ** attempts * 5, 3600);
}

/** Oldest first, so a species insert always precedes the sighting that needs it. */
export async function takeOutbox(limit = 25): Promise<OutboxJob[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    kind: OutboxKind;
    payload: string;
    attempts: number;
    next_attempt_at: string | null;
  }>('select id, kind, payload, attempts, next_attempt_at from outbox order by id asc limit ?', limit);

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
  }));
}

export async function completeJob(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('delete from outbox where id = ?', id);
}

export async function failJob(id: number, attempts: number, error: string): Promise<void> {
  const db = await getDb();
  const nextAttemptAt = new Date(Date.now() + backoffSeconds(attempts) * 1000).toISOString();
  await db.runAsync(
    'update outbox set attempts = attempts + 1, last_error = ?, next_attempt_at = ? where id = ?',
    error,
    nextAttemptAt,
    id,
  );
}

export async function pendingCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('select count(*) as n from outbox');
  return row?.n ?? 0;
}

/** What the queue is currently stuck on, for the sync indicator and debugging. */
export async function outboxStatus(): Promise<{ pending: number; stuck: number; lastError: string | null }> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ pending: number; stuck: number; last_error: string | null }>(
    `select
       count(*)                                        as pending,
       coalesce(sum(case when attempts >= 3 then 1 else 0 end), 0) as stuck,
       max(last_error)                                 as last_error
     from outbox`,
  );
  return {
    pending: row?.pending ?? 0,
    stuck: row?.stuck ?? 0,
    lastError: row?.last_error ?? null,
  };
}

// --- account switching ------------------------------------------------------

/**
 * Everything one account holds locally, in the shape the write helpers take.
 * Read before signing a different account in, so an anonymous user's sightings
 * can be re-queued against the account they sign into instead of being dropped.
 */
export type LocalSnapshot = {
  species: {
    slug: string;
    commonName: string;
    scientificName: string;
    description: string;
    categoryId: string;
  }[];
  sightings: {
    id: string;
    speciesSlug: string;
    photoLocalUri: string | null;
    photoPath: string | null;
    location: string | null;
    seenAt: string;
  }[];
  amaMessages: {
    id: string;
    speciesSlug: string;
    role: 'user' | 'assistant';
    body: string;
    createdAt: string;
  }[];
};

export async function exportLocalData(): Promise<LocalSnapshot> {
  const db = await getDb();

  const [species, sightings, amaMessages] = await Promise.all([
    db.getAllAsync<{
      slug: string;
      common_name: string;
      scientific_name: string;
      description: string;
      category_id: string;
    }>('select slug, common_name, scientific_name, description, category_id from species'),

    db.getAllAsync<{
      id: string;
      species_slug: string;
      photo_local_uri: string | null;
      photo_path: string | null;
      location: string | null;
      seen_at: string;
    }>(
      `select id, species_slug, photo_local_uri, photo_path, location, seen_at
       from sightings order by seen_at asc`,
    ),

    db.getAllAsync<{
      id: string;
      species_slug: string;
      role: 'user' | 'assistant';
      body: string;
      created_at: string;
    }>('select id, species_slug, role, body, created_at from ama_messages order by created_at asc'),
  ]);

  return {
    species: species.map((row) => ({
      slug: row.slug,
      commonName: row.common_name,
      scientificName: row.scientific_name,
      description: row.description,
      categoryId: row.category_id,
    })),
    sightings: sightings.map((row) => ({
      id: row.id,
      speciesSlug: row.species_slug,
      photoLocalUri: row.photo_local_uri,
      photoPath: row.photo_path,
      location: row.location,
      seenAt: row.seen_at,
    })),
    amaMessages: amaMessages.map((row) => ({
      id: row.id,
      speciesSlug: row.species_slug,
      role: row.role,
      body: row.body,
      createdAt: row.created_at,
    })),
  };
}
