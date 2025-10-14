-- Create species table for hybrid caching
CREATE TABLE public.species (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scientific_name TEXT NOT NULL,
  category TEXT CHECK (category IN ('mammal', 'bird', 'reptile', 'amphibian', 'insect', 'fish', 'arachnid', 'crustacean', 'plant', 'fungus', 'other')),
  region TEXT,
  
  -- iNaturalist data
  inaturalist_id INTEGER UNIQUE,
  taxon_id INTEGER,
  wikipedia_url TEXT,
  
  -- Images (store multiple from iNaturalist)
  primary_image_url TEXT,
  image_urls TEXT[],
  
  -- Location data
  lat_min DECIMAL(9,6),
  lat_max DECIMAL(9,6),
  lon_min DECIMAL(9,6),
  lon_max DECIMAL(9,6),
  
  -- Rich content
  description TEXT,
  habitat TEXT,
  diet TEXT,
  size_cm DECIMAL(10,2),
  weight_kg DECIMAL(10,2),
  conservation_status TEXT,
  
  -- Behavioral
  active_time TEXT CHECK (active_time IN ('diurnal', 'nocturnal', 'crepuscular', 'cathemeral')),
  
  -- Metadata
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'inaturalist', 'imported')),
  cache_expires_at TIMESTAMP WITH TIME ZONE,
  observation_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_species_category ON public.species(category);
CREATE INDEX idx_species_region ON public.species(region);
CREATE INDEX idx_species_coordinates ON public.species(lat_min, lat_max, lon_min, lon_max);
CREATE INDEX idx_species_inaturalist_id ON public.species(inaturalist_id);
CREATE INDEX idx_species_cache_expires ON public.species(cache_expires_at);

-- Enable Row Level Security
ALTER TABLE public.species ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view species)
CREATE POLICY "Species are viewable by everyone"
  ON public.species
  FOR SELECT
  USING (true);

-- Update trigger
CREATE TRIGGER update_species_updated_at
  BEFORE UPDATE ON public.species
  FOR EACH ROW
  EXECUTE FUNCTION update_lifelist_updated_at();

-- Seed with existing 12 species
INSERT INTO public.species (
  id, name, scientific_name, category, region, primary_image_url,
  lat_min, lat_max, lon_min, lon_max, source, conservation_status
) VALUES
  ('red-fox', 'Red Fox', 'Vulpes vulpes', 'mammal', 'North America', 
   'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&q=80',
   25, 70, -170, -50, 'manual', 'common'),
  ('great-blue-heron', 'Great Blue Heron', 'Ardea herodias', 'bird', 'North America',
   'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80',
   25, 70, -170, -50, 'manual', 'common'),
  ('eastern-box-turtle', 'Eastern Box Turtle', 'Terrapene carolina', 'reptile', 'North America',
   'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=800&q=80',
   25, 45, -100, -70, 'manual', 'uncommon'),
  ('american-bullfrog', 'American Bullfrog', 'Lithobates catesbeianus', 'amphibian', 'North America',
   'https://images.unsplash.com/photo-1599492673187-9f8b57e19eaa?w=800&q=80',
   25, 55, -130, -60, 'manual', 'common'),
  ('monarch-butterfly', 'Monarch Butterfly', 'Danaus plexippus', 'insect', 'North America',
   'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=800&q=80',
   25, 50, -125, -65, 'manual', 'uncommon'),
  ('european-robin', 'European Robin', 'Erithacus rubecula', 'bird', 'Europe',
   'https://images.unsplash.com/photo-1551958263-4d96e5e44e40?w=800&q=80',
   35, 70, -10, 40, 'manual', 'common'),
  ('red-deer', 'Red Deer', 'Cervus elaphus', 'mammal', 'Europe',
   'https://images.unsplash.com/photo-1551960413-7d8b0e726c80?w=800&q=80',
   35, 65, -10, 40, 'manual', 'common'),
  ('giant-panda', 'Giant Panda', 'Ailuropoda melanoleuca', 'mammal', 'Asia',
   'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=800&q=80',
   25, 35, 100, 115, 'manual', 'rare'),
  ('bengal-tiger', 'Bengal Tiger', 'Panthera tigris tigris', 'mammal', 'Asia',
   'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=800&q=80',
   8, 30, 70, 100, 'manual', 'rare'),
  ('scarlet-macaw', 'Scarlet Macaw', 'Ara macao', 'bird', 'South America',
   'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800&q=80',
   -20, 15, -85, -35, 'manual', 'uncommon'),
  ('african-elephant', 'African Elephant', 'Loxodonta africana', 'mammal', 'Africa',
   'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=800&q=80',
   -35, 20, 10, 50, 'manual', 'rare'),
  ('koala', 'Koala', 'Phascolarctos cinereus', 'mammal', 'Australia',
   'https://images.unsplash.com/photo-1549378725-c25e86443562?w=800&q=80',
   -38, -10, 140, 155, 'manual', 'uncommon');