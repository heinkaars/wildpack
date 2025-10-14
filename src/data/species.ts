export interface Species {
  id: string;
  name: string;
  scientificName: string;
  category: 'mammal' | 'bird' | 'reptile' | 'amphibian' | 'insect';
  region: string;
  imageUrl: string;
  rarity: 'common' | 'uncommon' | 'rare';
  coordinates?: {
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
  };
}

export const speciesData: Species[] = [
  {
    id: 'red-fox',
    name: 'Red Fox',
    scientificName: 'Vulpes vulpes',
    category: 'mammal',
    region: 'North America',
    imageUrl: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&q=80',
    rarity: 'common',
    coordinates: { latMin: 25, latMax: 70, lonMin: -170, lonMax: -50 }
  },
  {
    id: 'bald-eagle',
    name: 'Bald Eagle',
    scientificName: 'Haliaeetus leucocephalus',
    category: 'bird',
    region: 'North America',
    imageUrl: 'https://images.unsplash.com/photo-1611068813806-c591a6d6a69a?w=800&q=80',
    rarity: 'uncommon',
    coordinates: { latMin: 25, latMax: 70, lonMin: -170, lonMax: -50 }
  },
  {
    id: 'monarch-butterfly',
    name: 'Monarch Butterfly',
    scientificName: 'Danaus plexippus',
    category: 'insect',
    region: 'North America',
    imageUrl: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=800&q=80',
    rarity: 'common',
    coordinates: { latMin: 15, latMax: 55, lonMin: -125, lonMax: -60 }
  },
  {
    id: 'white-tailed-deer',
    name: 'White-tailed Deer',
    scientificName: 'Odocoileus virginianus',
    category: 'mammal',
    region: 'North America',
    imageUrl: 'https://images.unsplash.com/photo-1551892374-ecf8629d6f1b?w=800&q=80',
    rarity: 'common',
    coordinates: { latMin: 20, latMax: 60, lonMin: -120, lonMax: -55 }
  },
  {
    id: 'great-horned-owl',
    name: 'Great Horned Owl',
    scientificName: 'Bubo virginianus',
    category: 'bird',
    region: 'North America',
    imageUrl: 'https://images.unsplash.com/photo-1582967788606-a171c1080cb0?w=800&q=80',
    rarity: 'uncommon',
    coordinates: { latMin: 20, latMax: 65, lonMin: -160, lonMax: -50 }
  },
  {
    id: 'american-black-bear',
    name: 'American Black Bear',
    scientificName: 'Ursus americanus',
    category: 'mammal',
    region: 'North America',
    imageUrl: 'https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=800&q=80',
    rarity: 'rare',
    coordinates: { latMin: 30, latMax: 65, lonMin: -150, lonMax: -60 }
  },
  {
    id: 'ruby-throated-hummingbird',
    name: 'Ruby-throated Hummingbird',
    scientificName: 'Archilochus colubris',
    category: 'bird',
    region: 'North America',
    imageUrl: 'https://images.unsplash.com/photo-1599841380155-71c30e142b6d?w=800&q=80',
    rarity: 'common',
    coordinates: { latMin: 25, latMax: 55, lonMin: -105, lonMax: -60 }
  },
  {
    id: 'painted-turtle',
    name: 'Painted Turtle',
    scientificName: 'Chrysemys picta',
    category: 'reptile',
    region: 'North America',
    imageUrl: 'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=800&q=80',
    rarity: 'common',
    coordinates: { latMin: 30, latMax: 55, lonMin: -125, lonMax: -65 }
  },
  {
    id: 'european-robin',
    name: 'European Robin',
    scientificName: 'Erithacus rubecula',
    category: 'bird',
    region: 'Europe',
    imageUrl: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800&q=80',
    rarity: 'common',
    coordinates: { latMin: 36, latMax: 70, lonMin: -10, lonMax: 40 }
  },
  {
    id: 'red-deer',
    name: 'Red Deer',
    scientificName: 'Cervus elaphus',
    category: 'mammal',
    region: 'Europe',
    imageUrl: 'https://images.unsplash.com/photo-1551892374-ecf8629d6f1b?w=800&q=80',
    rarity: 'uncommon',
    coordinates: { latMin: 40, latMax: 65, lonMin: -10, lonMax: 35 }
  },
  {
    id: 'bengal-tiger',
    name: 'Bengal Tiger',
    scientificName: 'Panthera tigris tigris',
    category: 'mammal',
    region: 'Asia',
    imageUrl: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=800&q=80',
    rarity: 'rare',
    coordinates: { latMin: 8, latMax: 30, lonMin: 68, lonMax: 105 }
  },
  {
    id: 'giant-panda',
    name: 'Giant Panda',
    scientificName: 'Ailuropoda melanoleuca',
    category: 'mammal',
    region: 'Asia',
    imageUrl: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=800&q=80',
    rarity: 'rare',
    coordinates: { latMin: 27, latMax: 34, lonMin: 102, lonMax: 108 }
  }
];

export const getSpeciesById = (id: string): Species | undefined => {
  return speciesData.find(species => species.id === id);
};
