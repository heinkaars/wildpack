import OpenAI from 'openai';
import { guard } from '../../lib/api-guard';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Text-only, so cheaper than an identification and allowed a longer leash. */
const PER_USER_PER_MINUTE = 20;
const PER_IP_PER_MINUTE = 60;

const MAX_HISTORY = 20;
const MAX_MESSAGE_CHARS = 2_000;
const MAX_QUESTION_CHARS = 500;
const MAX_NAME_CHARS = 120;
const MAX_ANSWER_TOKENS = 500;

export async function POST(request: Request) {
  try {
    return await answer(request);
  } catch (error) {
    // As in the identify route: the real error is for the log, not the client.
    console.error('[ama]', error);
    return Response.json({ error: 'Could not answer that right now' }, { status: 500 });
  }
}

async function answer(request: Request): Promise<Response> {
  const caller = await guard(request, 'ama', PER_USER_PER_MINUTE, PER_IP_PER_MINUTE);
  if (caller.response) return caller.response;

  const { entry, question, history } = (await request.json()) as Record<string, any>;

  if (!entry || typeof question !== 'string' || question.trim().length === 0) {
    return Response.json({ error: 'entry and question are required' }, { status: 400 });
  }

  // Everything below crosses into the prompt, so nothing crosses unmeasured.
  const commonName = String(entry.commonName ?? '').slice(0, MAX_NAME_CHARS);
  const scientificName = String(entry.scientificName ?? '').slice(0, MAX_NAME_CHARS);

  /**
   * The roles are rebuilt rather than passed through. A client that sends
   * `role: 'system'` would otherwise be writing this app's instructions —
   * replacing the wildlife expert with anything it liked, on our OpenAI bill.
   * Only the two roles the app itself writes survive the filter.
   */
  const safeHistory = (Array.isArray(history) ? history : [])
    .slice(-MAX_HISTORY)
    .filter(
      (message) =>
        message &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.text === 'string',
    )
    .map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: message.text.slice(0, MAX_MESSAGE_CHARS),
    }));

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: MAX_ANSWER_TOKENS,
    messages: [
      {
        role: 'system',
        content:
          `You are a wildlife expert helping a user in a nature app understand a species they just identified: ` +
          `${commonName} (${scientificName}). Stick to identification help and factual information about ` +
          `this species — behavior, habitat, diet, look-alikes, conservation status, and similar. Keep answers ` +
          `conversational and concise (2-4 sentences unless the question needs more). If asked something unrelated ` +
          `to this species or wildlife identification, politely redirect to the topic.`,
      },
      ...safeHistory,
      { role: 'user', content: question.slice(0, MAX_QUESTION_CHARS) },
    ],
  });

  const reply = completion.choices[0]?.message?.content;
  if (!reply) {
    return Response.json({ error: 'No answer returned' }, { status: 502 });
  }

  return Response.json({ answer: reply });
}
