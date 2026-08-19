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

function photoFile(sightingId: string): File {
  const dir = new Directory(Paths.document, FOLDER);
  dir.create({ intermediates: true, idempotent: true });
  return new File(dir, `${sightingId}.jpg`);
}

function bytesFromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Writes the captured photo into app storage so the lifelist can render it
 * immediately and keep rendering it after the camera's temp file is cleaned up.
 */
export function savePhoto(sightingId: string, base64: string): string {
  if (isWeb) return `${DATA_URL_PREFIX}${base64}`;

  const file = photoFile(sightingId);
  file.create({ intermediates: true, overwrite: true });
  file.write(base64, { encoding: 'base64' });
  return file.uri;
}

export function localPhotoUri(sightingId: string): string | null {
  if (isWeb) return null;

  const file = photoFile(sightingId);
  return file.exists ? file.uri : null;
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
  file.create({ intermediates: true, overwrite: true });
  file.write(new Uint8Array(buffer));
  return file.uri;
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

  const file = photoFile(sightingId);
  return file.exists ? file.bytesSync() : null;
}
