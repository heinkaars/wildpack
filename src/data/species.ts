export interface Species {
  id: string;
  name: string;
  scientificName: string;
  category: 'mammal' | 'bird' | 'reptile' | 'amphibian' | 'insect';
  region: string;
  imageUrl: string;
  rarity: 'common' | 'uncommon' | 'rare';
}

export const speciesData: Species[] = [
  {
    id: 'red-fox',
    name: 'Red Fox',
    scientificName: 'Vulpes vulpes',
    category: 'mammal',
    region: 'North America',
    imageUrl: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&q=80',
    rarity: 'common'
  },
  {
    id: 'bald-eagle',
    name: 'Bald Eagle',
    scientificName: 'Haliaeetus leucocephalus',
    category: 'bird',
    region: 'North America',
    imageUrl: 'https://images.unsplash.com/photo-1611068813806-c591a6d6a69a?w=800&q=80',
    rarity: 'uncommon'
  },
  {
    id: 'monarch-butterfly',
    name: 'Monarch Butterfly',
    scientificName: 'Danaus plexippus',
    category: 'insect',
    region: 'North America',
    imageUrl: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=800&q=80',
    rarity: 'common'
  },
  {
    id: 'white-tailed-deer',
    name: 'White-tailed Deer',
    scientificName: 'Odocoileus virginianus',
    category: 'mammal',
    region: 'North America',
    imageUrl: 'https://images.unsplash.com/photo-1551892374-ecf8629d6f1b?w=800&q=80',
    rarity: 'common'
  },
  {
    id: 'great-horned-owl',
    name: 'Great Horned Owl',
    scientificName: 'Bubo virginianus',
    category: 'bird',
    region: 'North America',
    imageUrl: 'https://images.unsplash.com/photo-1582967788606-a171c1080cb0?w=800&q=80',
    rarity: 'uncommon'
  },
  {
    id: 'american-black-bear',
    name: 'American Black Bear',
    scientificName: 'Ursus americanus',
    category: 'mammal',
    region: 'North America',
    imageUrl: 'https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=800&q=80',
    rarity: 'rare'
  },
  {
    id: 'ruby-throated-hummingbird',
    name: 'Ruby-throated Hummingbird',
    scientificName: 'Archilochus colubris',
    category: 'bird',
    region: 'North America',
    imageUrl: 'https://images.unsplash.com/photo-1599841380155-71c30e142b6d?w=800&q=80',
    rarity: 'common'
  },
  {
    id: 'painted-turtle',
    name: 'Painted Turtle',
    scientificName: 'Chrysemys picta',
    category: 'reptile',
    region: 'North America',
    imageUrl: 'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=800&q=80',
    rarity: 'common'
  }
];

export const getSpeciesById = (id: string): Species | undefined => {
  return speciesData.find(species => species.id === id);
};
