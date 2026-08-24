import { supabase } from './supabase';
import { AmaMessage, LifelistEntry } from './types';

export async function askAma(entry: LifelistEntry, question: string, history: AmaMessage[]): Promise<string> {
  // The server checks this before it spends anything at OpenAI.
  const { data } = await supabase.auth.getSession();

  const response = await fetch('/api/ama', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token ?? ''}`,
    },
    body: JSON.stringify({ entry, question, history }),
  });

  // These messages reach the user, so they are written for one.
  if (response.status === 401) {
    throw new Error('We could not confirm your account. Close WildPack and open it again.');
  }
  if (response.status === 429) {
    throw new Error('That is a lot of questions at once. Give it a minute, then ask again.');
  }
  if (!response.ok) {
    throw new Error('Could not get an answer right now. Try again in a moment.');
  }

  const { answer } = await response.json();
  return answer;
}
