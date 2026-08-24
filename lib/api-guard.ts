/**
 * Server-side gate for the `+api.ts` routes. Never import this from a screen:
 * it builds its own Supabase client with no session persistence, because a
 * route handler has no device storage and no session of its own — it only ever
 * inspects the one the caller presents.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase config. The API routes cannot check who is calling without ' +
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
  );
}

const verifier = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let usage: SupabaseClient | null = null;

/**
 * The counter's home. Writing it needs the service role key, because the table
 * deliberately has no policies: a caller able to delete rows could erase the
 * ceiling that limits them.
 */
function usageStore(): SupabaseClient | null {
  if (!supabaseUrl || !serviceRoleKey) return null;
  if (!usage) {
    usage = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return usage;
}

/**
 * The id of the caller, or null when they presented no valid session.
 *
 * getUser() hands the token to Supabase to be checked. getSession() would only
 * decode whatever bytes the caller sent, which proves nothing — anyone can
 * write a JWT that *says* they are somebody.
 *
 * Anonymous accounts pass deliberately: the app mints one on first launch so a
 * user can photograph something before ever seeing a sign-up screen, and that
 * flow must keep working.
 */
export async function requireUser(request: Request): Promise<string | null> {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;

  const token = header.slice('Bearer '.length).trim();
  if (!token) return null;

  const { data, error } = await verifier.auth.getUser(token);
  return error || !data.user ? null : data.user.id;
}

const WINDOW_MS = 60_000;
/** Past this many tracked keys, drop the ones whose window has already passed. */
const SWEEP_AT = 5_000;

const hits = new Map<string, number[]>();

/**
 * True once `key` has spent its allowance for the current minute.
 *
 * This is the FALLBACK counter, used only when the Postgres table cannot be
 * reached. `anyOverBudget` is the real ceiling.
 *
 * It does not count at all in `npm start`: the dev server re-instantiates the
 * route module on every request so it can pick up edits, handing each request a
 * brand new empty map. It does hold in a production export, where the module
 * persists — verified. To test limits, use `npx expo export -p web && npx expo
 * serve`, never the dev server.
 */
export function rateLimited(key: string, max: number): boolean {
  const now = Date.now();

  // Without this the map grows one entry per caller, forever.
  if (hits.size > SWEEP_AT) {
    for (const [tracked, times] of hits) {
      if (times.every((time) => now - time >= WINDOW_MS)) hits.delete(tracked);
    }
  }

  const recent = (hits.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);

  return recent.length > max;
}

/** Best-effort caller address, for a ceiling a fresh account cannot reset. */
function callerIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || null;
}

type Bucket = { bucket: string; max: number };

/** How often a request also clears out counts nobody will read again. */
const SWEEP_CHANCE = 0.02;
const SWEEP_OLDER_THAN_MS = 60 * 60 * 1000;

function sweep(store: SupabaseClient): void {
  if (Math.random() > SWEEP_CHANCE) return;
  const cutoff = new Date(Date.now() - SWEEP_OLDER_THAN_MS).toISOString();
  // Fire and forget: tidying is never worth delaying somebody's photo for.
  void store
    .from('api_usage')
    .delete()
    .lt('created_at', cutoff)
    .then(({ error }) => {
      if (error) console.error('[rate-limit] sweep failed', error.message);
    });
}

/**
 * True when any of these buckets has spent its allowance for the last minute,
 * counted in Postgres so the ceiling survives a restart and is shared by every
 * instance.
 *
 * Falls back to the in-process counter — never to no limit at all — when the
 * table cannot be reached. An outage should cost accuracy, not the whole
 * ceiling: unlimited access to a paid endpoint is the one outcome to avoid.
 */
async function anyOverBudget(buckets: Bucket[]): Promise<boolean> {
  const store = usageStore();
  if (!store) return buckets.some((entry) => rateLimited(entry.bucket, entry.max));

  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  try {
    // Counted before the call is recorded, so a caller who is already over the
    // line stops causing writes. Recording first would let anyone hammering the
    // endpoint keep growing a table they are no longer allowed to use.
    const { data, error } = await store
      .from('api_usage')
      .select('bucket')
      .in('bucket', buckets.map((entry) => entry.bucket))
      .gt('created_at', since);
    if (error) throw new Error(error.message);

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      counts.set(row.bucket, (counts.get(row.bucket) ?? 0) + 1);
    }

    if (buckets.some((entry) => (counts.get(entry.bucket) ?? 0) >= entry.max)) return true;

    const { error: writeError } = await store
      .from('api_usage')
      .insert(buckets.map((entry) => ({ bucket: entry.bucket })));
    if (writeError) throw new Error(writeError.message);

    sweep(store);
    return false;
  } catch (error) {
    console.error(
      '[rate-limit] durable store unavailable, falling back to this process only',
      error,
    );
    return buckets.some((entry) => rateLimited(entry.bucket, entry.max));
  }
}

type Allowed = { userId: string; response?: undefined };
type Refused = { userId?: undefined; response: Response };

/**
 * One call at the top of a route: proves who is asking, then holds them to a
 * per-account and a per-address budget.
 *
 * Both ceilings matter. The per-account one stops an ordinary user's runaway
 * loop; the per-address one is what an attacker hits, since signing up for a
 * fresh anonymous account is free and would otherwise hand them a clean
 * allowance every time.
 */
export async function guard(
  request: Request,
  route: string,
  perUser: number,
  perIp: number,
): Promise<Allowed | Refused> {
  const userId = await requireUser(request);
  if (!userId) {
    return { response: Response.json({ error: 'Sign in required' }, { status: 401 }) };
  }

  const buckets: Bucket[] = [{ bucket: `${route}:user:${userId}`, max: perUser }];

  const ip = callerIp(request);
  if (ip) buckets.push({ bucket: `${route}:ip:${ip}`, max: perIp });

  if (await anyOverBudget(buckets)) {
    return { response: Response.json({ error: 'Too many requests' }, { status: 429 }) };
  }

  return { userId };
}
