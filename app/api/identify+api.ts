import OpenAI from 'openai';
import { guard } from '../../lib/api-guard';
import { recordSpecies } from '../../lib/species-catalog';
import { CATEGORIES } from '../../lib/categories';
import { IdentifyOutcome } from '../../lib/types';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CATEGORY_IDS = CATEGORIES.map((category) => category.id);

/** A vision call is the expensive one, so the budget is the tighter of the two. */
const PER_USER_PER_MINUTE = 10;
const PER_IP_PER_MINUTE = 30;

/**
 * Roughly 8MB of JPEG once base64 is decoded — far more than a phone camera at
 * quality 0.7 produces, and far less than a payload sent to run up the bill.
 */
const MAX_BASE64_CHARS = 11_000_000;

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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
  try {
    return await identify(request);
  } catch (error) {
    // A malformed body or an OpenAI failure must not travel back to the phone:
    // the framework would render a stack trace with paths and internals. Full
    // detail goes to the server log, one flat sentence goes to the caller.
    console.error('[identify]', error);
    return Response.json({ error: 'Identification failed' }, { status: 500 });
  }
}

async function identify(request: Request): Promise<Response> {
  const caller = await guard(request, 'identify', PER_USER_PER_MINUTE, PER_IP_PER_MINUTE);
  if (caller.response) return caller.response;

  const { imageBase64, mimeType } = (await request.json()) as Record<string, unknown>;

  // Typed as a string upstream, but a request body is whatever the sender chose
  // to put in it, so the shape is established here rather than assumed.
  if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
    return Response.json({ error: 'imageBase64 is required' }, { status: 400 });
  }

  if (imageBase64.length > MAX_BASE64_CHARS) {
    return Response.json({ error: 'Image too large' }, { status: 413 });
  }

  const safeMimeType =
    typeof mimeType === 'string' && ALLOWED_MIME_TYPES.includes(mimeType) ? mimeType : 'image/jpeg';

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
            image_url: { url: `data:${safeMimeType};base64,${imageBase64}` },
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

  // Both the best guess and the alternates, because the user picks from all of
  // them on the next screen and whichever they pick has to already exist.
  await recordSpecies([outcome.best, ...(outcome.alternates ?? [])]);

  return Response.json(outcome);
}
