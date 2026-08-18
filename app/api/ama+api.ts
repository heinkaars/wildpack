import OpenAI from 'openai';
import { AmaMessage, LifelistEntry } from '../../lib/types';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  const { entry, question, history } = (await request.json()) as {
    entry: LifelistEntry;
    question: string;
    history: AmaMessage[];
  };

  if (!entry || !question) {
    return Response.json({ error: 'entry and question are required' }, { status: 400 });
  }

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          `You are a wildlife expert helping a user in a nature app understand a species they just identified: ` +
          `${entry.commonName} (${entry.scientificName}). Stick to identification help and factual information about ` +
          `this species — behavior, habitat, diet, look-alikes, conservation status, and similar. Keep answers ` +
          `conversational and concise (2-4 sentences unless the question needs more). If asked something unrelated ` +
          `to this species or wildlife identification, politely redirect to the topic.`,
      },
      ...history.map((message) => ({
        role: message.role,
        content: message.text,
      })),
      { role: 'user', content: question },
    ],
  });

  const answer = completion.choices[0]?.message?.content;
  if (!answer) {
    return Response.json({ error: 'No answer returned' }, { status: 502 });
  }

  return Response.json({ answer });
}
