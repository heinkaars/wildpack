import { IdentifyOutcome } from './types';

export async function identifySpecies(imageBase64: string): Promise<IdentifyOutcome> {
  const response = await fetch('/api/identify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg' }),
  });

  if (!response.ok) {
    throw new Error(`Identify request failed: ${response.status}`);
  }

  return response.json();
}
