export interface Species {
  id: string;
  name: string;
  scientificName: string;
  category: 'mammal' | 'bird' | 'reptile' | 'amphibian' | 'insect' | 'fish' | 'arachnid' | 'crustacean' | 'plant' | 'fungus' | 'other';
  region: string;
  imageUrl: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'endangered';
  coordinates?: {
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
  };
  // Optional iNaturalist fields
  inaturalistId?: number;
  wikipediaUrl?: string;
  description?: string;
  observationCount?: number;
}

// Species data now comes from the database and iNaturalist API
// Use the useSpecies() and useSpeciesById() hooks to fetch species data
