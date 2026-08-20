import { IdentifyOutcome } from './types';

/** Identification is a round trip to OpenAI, so it is slow by nature — but a
 *  phone with one bar will otherwise hang on the spinner forever. */
const TIMEOUT_MS = 30_000;

/** Below this, the model is effectively guessing blind (e.g. no wildlife in
 *  frame at all) — treat it as "couldn't identify" rather than a real guess. */
export const LOW_CONFIDENCE_THRESHOLD = 0.3;

export type IdentifyErrorKind = 'offline' | 'timeout' | 'server';

export class IdentifyError extends Error {
  readonly kind: IdentifyErrorKind;

  constructor(kind: IdentifyErrorKind, message: string) {
    super(message);
    this.name = 'IdentifyError';
    this.kind = kind;
  }
}

export async function identifySpecies(imageBase64: string): Promise<IdentifyOutcome> {
  // AbortSignal.timeout() is not in Expo Go's Hermes build, so the timeout is
  // wired by hand.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch('/api/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg' }),
      signal: controller.signal,
    });
  } catch (error) {
    // fetch only rejects when the request never completed: either we aborted
    // it above, or the network is unreachable.
    if (controller.signal.aborted) {
      throw new IdentifyError('timeout', `Identify request timed out after ${TIMEOUT_MS}ms`);
    }
    throw new IdentifyError('offline', `Identify request could not reach the server: ${error}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new IdentifyError('server', `Identify request failed: ${response.status}`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new IdentifyError('server', `Identify response was not valid JSON: ${error}`);
  }
}
