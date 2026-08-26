-- WildPack database schema
-- Paste this whole file into the Supabase dashboard SQL editor and run it.
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per signed-in user. Created automatically by the trigger at the
-- bottom of this file, so the app never has to insert it.
create table if not exists public.profiles (
  id                 uuid primary key references auth.users on delete cascade,
  name               text not null default 'Explorer',
  look               text not null default 'fox',
  streak             integer not null default 0,
  last_activity_date date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Tables created before the onboarding flow still default to 'TrailUser'.
alter table public.profiles alter column name set default 'Explorer';

-- Shared catalog of species. Not user-scoped: when one user identifies a Red
-- Fox, every other user reuses the same row.
create table if not exists public.species (
  slug            text primary key,
  common_name     text not null,
  scientific_name text not null,
  description     text not null default '',
  category_id     text not null,
  created_at      timestamptz not null default now()
);

-- One row per photo the user captures. This is the source of truth: the
-- lifelist is derived from it, so counts and dates can never drift.
create table if not exists public.sightings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  species_slug text not null references public.species(slug),
  photo_path   text,
  location     text,
  seen_at      timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists sightings_user_species_idx on public.sightings (user_id, species_slug);
create index if not exists sightings_user_seen_idx    on public.sightings (user_id, seen_at desc);

-- AMA chat history, one row per message.
create table if not exists public.ama_messages (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  species_slug text not null references public.species(slug),
  role         text not null check (role in ('user', 'assistant')),
  body         text not null,
  created_at   timestamptz not null default now()
);

create index if not exists ama_messages_thread_idx on public.ama_messages (user_id, species_slug, created_at);

-- Rate limiting for the OpenAI-backed API routes. One row per call, counted
-- over the last minute. It lives here rather than in the server's memory so the
-- ceiling survives a restart and is shared by every instance — a counter that
-- resets on deploy is not a ceiling.
--
-- `bucket` is the thing being limited: 'identify:user:<uuid>' or
-- 'identify:ip:<address>'.
create table if not exists public.api_usage (
  id         bigserial primary key,
  bucket     text not null,
  created_at timestamptz not null default now()
);

create index if not exists api_usage_bucket_idx on public.api_usage (bucket, created_at desc);

-- ---------------------------------------------------------------------------
-- Lifelist view: the collapsed, one-row-per-species shape the app renders.
-- security_invoker means it obeys the row rules of whoever is querying it.
-- ---------------------------------------------------------------------------

create or replace view public.lifelist with (security_invoker = on) as
select
  s.user_id,
  s.species_slug                                as id,
  sp.common_name,
  sp.scientific_name,
  sp.description,
  sp.category_id,
  min(s.seen_at)                                as first_seen_at,
  max(s.seen_at)                                as last_seen_at,
  count(*)::integer                             as sighting_count,
  (array_agg(s.photo_path order by s.seen_at asc)
     filter (where s.photo_path is not null))[1] as photo_path,
  (array_agg(s.location order by s.seen_at desc)
     filter (where s.location is not null))[1]   as location
from public.sightings s
join public.species sp on sp.slug = s.species_slug
group by s.user_id, s.species_slug, sp.common_name, sp.scientific_name,
         sp.description, sp.category_id;

-- ---------------------------------------------------------------------------
-- Row Level Security: every table is locked down, then opened only to the
-- rows belonging to the requesting user.
-- ---------------------------------------------------------------------------

alter table public.profiles     enable row level security;
alter table public.species      enable row level security;
alter table public.sightings    enable row level security;
alter table public.ama_messages enable row level security;
alter table public.api_usage    enable row level security;

-- api_usage gets NO policies, and that is the point rather than an oversight:
-- with row level security on and nothing granted, clients can neither read nor
-- write it, while the service role bypasses row level security and does both.
-- A caller able to delete from this table could erase the ceiling limiting it,
-- so the ability is withheld from every caller.
-- (If you are auditing this file: "RLS enabled, no policies" is usually a bug.
-- Here it is the deny-everyone default doing exactly what it should.)

drop policy if exists "read own profile"   on public.profiles;
drop policy if exists "update own profile" on public.profiles;
drop policy if exists "insert own profile" on public.profiles;

create policy "read own profile"   on public.profiles for select using (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- The species catalog is shared and read by everyone, so it is read-only to
-- clients. It used to accept an insert from any signed-in user, which meant
-- whoever first identified a Red Fox chose what the description said for every
-- user, permanently — there is no update policy to correct it with. Anyone
-- could seed a slug with anything and every later user would read it.
--
-- Rows are written by app/api/identify instead, with the service role key,
-- straight from the model's answer. Revoking this policy is the half of that
-- change that lives in the database: apply it only once the server has
-- SUPABASE_SERVICE_ROLE_KEY, or nothing will be able to write the catalog.
drop policy if exists "read species"   on public.species;
drop policy if exists "insert species" on public.species;

create policy "read species" on public.species for select to authenticated using (true);

drop policy if exists "own sightings" on public.sightings;
create policy "own sightings" on public.sightings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own ama messages" on public.ama_messages;
create policy "own ama messages" on public.ama_messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Photo storage: a private bucket, each user confined to their own folder.
-- ---------------------------------------------------------------------------

-- The limits matter: without them the bucket accepts any bytes at any size,
-- because the only thing calling an upload a JPEG is the client that sent it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sightings', 'sightings', false, 10485760, array['image/jpeg'])
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "read own photos"   on storage.objects;
drop policy if exists "upload own photos" on storage.objects;
drop policy if exists "delete own photos" on storage.objects;

create policy "read own photos" on storage.objects for select to authenticated
  using (bucket_id = 'sightings' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "upload own photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'sightings' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "delete own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'sightings' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Rate limiting: counting and claiming a budget in one locked step.
-- ---------------------------------------------------------------------------

-- The server used to count, decide and record in three separate round trips,
-- which is not a ceiling. Requests arriving together all read the same
-- under-budget count before any of them had recorded itself, so a caller who
-- simply did not wait between requests took as many as they liked. All three
-- steps happen here now, inside one transaction, under one lock per bucket.
--
-- Deliberately NOT security definer. The service role bypasses row level
-- security on its own, which is all this needs; a definer function would hand
-- that same power to anybody who could reach it. Execute is revoked from the
-- client roles below, so the server is the only caller left.
create or replace function public.claim_api_budget(
  p_buckets        text[],
  p_maxes          integer[],
  p_window_seconds integer
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  since      timestamptz := now() - make_interval(secs => p_window_seconds);
  bucket_key text;
  used       integer;
  i          integer;
begin
  if p_buckets is null
     or array_length(p_buckets, 1) is null
     or array_length(p_buckets, 1) <> array_length(p_maxes, 1) then
    raise exception 'claim_api_budget: p_buckets and p_maxes must be the same non-empty length';
  end if;

  -- One lock per bucket, taken in a fixed order so two callers who share a
  -- bucket queue up behind each other instead of deadlocking. Advisory locks
  -- are released at the end of this transaction, which is the end of this call.
  for bucket_key in select t.b from unnest(p_buckets) as t(b) order by t.b loop
    perform pg_advisory_xact_lock(hashtext(bucket_key));
  end loop;

  for i in 1 .. array_length(p_buckets, 1) loop
    select count(*) into used
      from public.api_usage u
     where u.bucket = p_buckets[i]
       and u.created_at > since;

    -- Over on any one bucket refuses the whole call and records nothing, so a
    -- caller already past the line stops growing the table.
    if used >= p_maxes[i] then
      return false;
    end if;
  end loop;

  insert into public.api_usage (bucket)
  select unnest(p_buckets);

  return true;
end;
$$;

-- Supabase's default privileges grant execute on new functions to the client
-- roles too, so the grant has to be taken back rather than merely not given.
revoke all on function public.claim_api_budget(text[], integer[], integer) from public;
revoke all on function public.claim_api_budget(text[], integer[], integer) from anon, authenticated;
grant execute on function public.claim_api_budget(text[], integer[], integer) to service_role;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Give every new user (including anonymous ones) a profile row immediately.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.updated_at honest so sync can tell what changed.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
