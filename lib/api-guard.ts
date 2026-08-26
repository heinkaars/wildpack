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

/**
 * How many proxies sit in front of this app: a single host like Vercel or
 * Netlify is 1, that host behind Cloudflare as well is 2. Left unset there is
 * no address worth trusting, so the per-address ceiling is skipped rather than
 * fed a value the caller picked for themselves.
 */
const TRUSTED_PROXY_HOPS = Number(process.env.TRUSTED_PROXY_HOPS ?? 0);

/** The longest a real address can be: an IPv4-mapped IPv6 one. */
const MAX_IP_CHARS = 45;

let warnedAboutForwarding = false;

/**
 * The address a proxy we actually run behind observed, or null.
 *
 * Proxies APPEND to x-forwarded-for — each one adds the address it received
 * the request from, on the right — so the chain reads
 * `<whatever the caller sent>, <real caller>, <proxy>, …`. Reading the leftmost
 * entry therefore reads a string the caller typed, and a caller who changes it
 * on every request draws a fresh budget on every request. Counting in from the
 * RIGHT by the number of proxies we genuinely run behind lands on the entry the
 * outermost one wrote, which the caller cannot forge.
 *
 * The length cap matters as much as the position. A bucket key is written to
 * the database, and a header is whatever length its sender chose.
 */
function callerIp(request: Request): string | null {
  const header = request.headers.get('x-forwarded-for');

  if (TRUSTED_PROXY_HOPS < 1) {
    // Said once rather than every request: silently having no ceiling is how
    // this gets missed, but a line per call would bury the log.
    if (header && !warnedAboutForwarding) {
      warnedAboutForwarding = true;
      console.warn(
        '[rate-limit] x-forwarded-for is present but TRUSTED_PROXY_HOPS is unset, so the ' +
          'per-address ceiling is off. Set it to the number of proxies in front of this app ' +
          '(usually 1) to turn it on.',
      );
    }
    return null;
  }

  const chain =
    header
      ?.split(',')
      .map((entry) => entry.trim())
      .filter(Boolean) ?? [];

  // A chain shorter than the hops we expect means the request did not arrive
  // the way we think it did; no address is better than the wrong one.
  const ip = chain[chain.length - TRUSTED_PROXY_HOPS];
  return ip && ip.length <= MAX_IP_CHARS ? ip : null;
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
 * database cannot be reached. An outage should cost accuracy, not the whole
 * ceiling: unlimited access to a paid endpoint is the one outcome to avoid.
 */
async function anyOverBudget(buckets: Bucket[]): Promise<boolean> {
  const store = usageStore();
  if (!store) return buckets.some((entry) => rateLimited(entry.bucket, entry.max));

  try {
    // Counting, deciding and recording happen inside one locked transaction in
    // the database rather than across three round trips from here. Split apart,
    // requests arriving together all read the same under-budget count before
    // any of them had recorded itself, and all of them passed — which is not a
    // ceiling. See claim_api_budget in supabase/schema.sql.
    const { data, error } = await store.rpc('claim_api_budget', {
      p_buckets: buckets.map((entry) => entry.bucket),
      p_maxes: buckets.map((entry) => entry.max),
      p_window_seconds: WINDOW_MS / 1000,
    });
    if (error) throw new Error(error.message);

    sweep(store);
    // The function records the calls it allows and records nothing when it
    // refuses, so a caller already past the line stops growing the table.
    return data !== true;
  } catch (error) {
    console.error(
      '[rate-limit] durable store unavailable, falling back to this process only. If this ' +
        'is every request, claim_api_budget is probably missing — run supabase/schema.sql.',
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
 *
 * The per-address ceiling only engages where TRUSTED_PROXY_HOPS says how far
 * into x-forwarded-for the real address is — see callerIp. Without it there is
 * no address a caller cannot forge, and a forgeable ceiling is not one.
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
