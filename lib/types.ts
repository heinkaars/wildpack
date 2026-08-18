export type Profile = {
  name: string;
  look: string;
};

export type LifelistEntry = {
  id: string;
  commonName: string;
  scientificName: string;
  description: string;
  categoryId: string;
  photoUri: string;
  firstSeenAt: string;
  lastSeenAt: string;
  sightingCount: number;
  location: string | null;
};

export type Milestone = {
  threshold: number;
  label: string;
};

/** A single candidate species returned by identification. */
export type SpeciesGuess = {
  commonName: string;
  scientificName: string;
  description: string;
  categoryId: string;
  confidence: number;
};

/** The best guess plus the runners-up shown behind "See other matches". */
export type IdentifyOutcome = {
  best: SpeciesGuess;
  alternates: SpeciesGuess[];
};

export type CelebrationPayload = {
  entry: LifelistEntry;
  isNewSpecies: boolean;
  streak: number;
  milestone: Milestone | null;
  speciesNumber: number;
};

export type AmaMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};
