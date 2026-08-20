import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

const FOLDER = 'sighting-photos';

/**
 * expo-file-system is a no-op stub on web, so the browser keeps photo bytes
 * inline as a data URL instead. That renders directly in <Image> and still
 * decodes back to bytes for upload, which keeps the web build testable.
 */
const isWeb = Platform.OS === 'web';

const DATA_URL_PREFIX = 'data:image/jpeg;base64,';

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * A photo always lives at the same place for a given sighting, so the path is
 * derived from the id rather than remembered. iOS hands the app a different
 * container path after some reinstalls and updates, which would leave every
 * stored absolute URI pointing at nothing.
 */
function photoFile(sightingId: string): File {
  const dir = new Directory(Paths.document, FOLDER);
  // Created only when missing: `create` options vary between expo-file-system
  // builds, and a throw here would cost the sighting its photo.
  if (!dir.exists) dir.create({ intermediates: true });
  return new File(dir, `${sightingId}.jpg`);
}

/** True if the URI names a file that is really on disk right now. */
function fileExists(uri: string): boolean {
  if (isWeb || !uri.startsWith('file://')) return false;
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

function bytesFromBase64(base64: string): Uint8Array {
  // atob is quicker where the runtime has it, but not every JS engine the app
  // runs on does, so fall back to decoding the alphabet by hand.
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array((clean.length * 3) >> 2);

  let byte = 0;
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < clean.length; i += 1) {
    buffer = (buffer << 6) | BASE64_CHARS.indexOf(clean[i]);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[byte] = (buffer >> bits) & 0xff;
      byte += 1;
    }
  }

  return bytes.subarray(0, byte);
}

/**
 * Writes the captured photo into app storage so the lifelist can render it
 * immediately and keep rendering it after the camera's temp file is cleaned up.
 */
export function savePhoto(sightingId: string, base64: string): string {
  if (isWeb) return `${DATA_URL_PREFIX}${base64}`;

  const file = photoFile(sightingId);
  // Bytes rather than a base64 string with a write option: the option is a
  // recent addition, and an older native build rejects the extra argument.
  file.write(bytesFromBase64(base64));
  return file.uri;
}

export function localPhotoUri(sightingId: string): string | null {
  if (isWeb) return null;

  const file = photoFile(sightingId);
  return file.exists ? file.uri : null;
}

/**
 * What <Image> should render for a sighting, worked out from what is on disk
 * now instead of trusting the URI recorded when the photo was taken.
 */
export function resolvePhotoUri(sightingId: string, storedUri: string | null): string | null {
  if (isWeb) return storedUri?.startsWith(DATA_URL_PREFIX) ? storedUri : null;

  const own = localPhotoUri(sightingId);
  if (own) return own;

  // A photo the app has not taken charge of yet — a capture from an older
  // build still sitting in the camera's cache.
  return storedUri && fileExists(storedUri) ? storedUri : null;
}

/** True while the photo is on this device; false means it has to be recovered. */
export function hasLocalPhoto(sightingId: string, storedUri: string | null): boolean {
  return resolvePhotoUri(sightingId, storedUri) !== null;
}

/**
 * Copies a photo the app does not own — a camera temp file, say — into app
 * storage, so it survives the system clearing out caches.
 */
export function adoptPhoto(sightingId: string, sourceUri: string): string | null {
  if (isWeb || !fileExists(sourceUri)) return null;

  const file = photoFile(sightingId);
  file.write(new File(sourceUri).bytesSync());
  return file.uri;
}

/** Pulls a photo down on a device that did not take it. */
export async function savePhotoFromUrl(sightingId: string, url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Photo download failed: ${response.status}`);

  const buffer = await response.arrayBuffer();

  if (isWeb) {
    const binary = Array.from(new Uint8Array(buffer), (b) => String.fromCharCode(b)).join('');
    return `${DATA_URL_PREFIX}${btoa(binary)}`;
  }

  const file = photoFile(sightingId);
  file.write(new Uint8Array(buffer));
  return file.uri;
}

/**
 * expo-image-picker's web implementation hands back whatever bytes the
 * chosen file has, unconverted — including formats like HEIC, which OpenAI's
 * vision API rejects outright. The native picker always re-encodes to JPEG,
 * so only the web path needs this: decode into a canvas and re-export as a
 * real JPEG, which also fixes anything else the browser can decode but the
 * app assumes is already JPEG (PNG-with-alpha, WEBP, GIF).
 *
 * Throws if the browser cannot decode the file at all (e.g. HEIC in Chrome,
 * which has no built-in HEIC decoder).
 */
export async function normalizeWebImage(uri: string): Promise<{ uri: string; base64: string }> {
  const img = new Image();
  img.decoding = 'async';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Could not decode this image in the browser'));
    img.src = uri;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(img, 0, 0);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  const base64 = dataUrl.slice(DATA_URL_PREFIX.length);
  return { uri: dataUrl, base64 };
}

/**
 * Bytes for upload, or null if the local copy has gone missing. On web the
 * bytes live in the stored data URL rather than on disk.
 */
export function readPhotoBytes(sightingId: string, localUri: string | null): Uint8Array | null {
  if (isWeb) {
    if (!localUri?.startsWith(DATA_URL_PREFIX)) return null;
    return bytesFromBase64(localUri.slice(DATA_URL_PREFIX.length));
  }

  const uri = resolvePhotoUri(sightingId, localUri);
  return uri ? new File(uri).bytesSync() : null;
}
