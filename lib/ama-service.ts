import { AmaMessage, LifelistEntry } from './types';

export async function askAma(entry: LifelistEntry, question: string, history: AmaMessage[]): Promise<string> {
  const response = await fetch('/api/ama', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entry, question, history }),
  });

  if (!response.ok) {
    throw new Error(`AMA request failed: ${response.status}`);
  }

  const { answer } = await response.json();
  return answer;
}
