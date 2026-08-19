-- One-off cleanup of the rows created while verifying the setup.
-- Run once in the Supabase SQL editor, then delete this file.
-- The editor runs the whole script as one transaction: if any statement fails,
-- none of them take effect.

-- Delete the throwaway account that recorded the fake Red Fox. Its profile and
-- sightings cascade away with it. Targeting that one account by the sighting it
-- made avoids touching any real device's anonymous account.
delete from auth.users
where id in (select user_id from public.sightings where species_slug = 'vulpes-vulpes');

-- Now the fake species itself, so a real Red Fox sighting never inherits the
-- description "A test fox."
delete from public.species where slug = 'vulpes-vulpes';
