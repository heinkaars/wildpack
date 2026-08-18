import OpenAI from 'openai';
import { CATEGORIES } from '../../lib/categories';
import { IdentifyOutcome } from '../../lib/types';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CATEGORY_IDS = CATEGORIES.map((category) => category.id);

const speciesGuessSchema = {
  type: 'object',
  properties: {
    commonName: { type: 'string' },
    scientificName: { type: 'string' },
    description: { type: 'string' },
    categoryId: { type: 'string', enum: CATEGORY_IDS },
    confidence: { type: 'number' },
  },
  required: ['commonName', 'scientificName', 'description', 'categoryId', 'confidence'],
  additionalProperties: false,
};

const outcomeSchema = {
  type: 'object',
  properties: {
    best: speciesGuessSchema,
    alternates: { type: 'array', items: speciesGuessSchema },
  },
  required: ['best', 'alternates'],
  additionalProperties: false,
};

export async function POST(request: Request) {
  const { imageBase64, mimeType } = await request.json();

  if (!imageBase64) {
    return Response.json({ error: 'imageBase64 is required' }, { status: 400 });
  }

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a wildlife identification assistant for a nature app. Identify the most likely species (animal, bird, insect, or plant) in the photo. Choose categoryId from exactly these options: ' +
          CATEGORY_IDS.join(', ') +
          ' — pick the closest match even if imperfect. Give one best guess plus up to three plausible alternates, each with a confidence between 0 and 1 reflecting your certainty.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Identify the species in this photo.' },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType ?? 'image/jpeg'};base64,${imageBase64}` },
          },
        ],
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'identify_outcome', schema: outcomeSchema, strict: true },
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    return Response.json({ error: 'No identification returned' }, { status: 502 });
  }

  const outcome: IdentifyOutcome = JSON.parse(raw);
  return Response.json(outcome);
}
