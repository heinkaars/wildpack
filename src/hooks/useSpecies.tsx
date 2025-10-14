import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Species } from '@/data/species';
import { Coordinates } from './useGeolocation';

interface UseSpeciesOptions {
  coordinates?: Coordinates | null;
  maxDistance?: number;
  searchQuery?: string;
  categories?: string[];
}

export const useSpecies = ({ coordinates, maxDistance = 50, searchQuery = '', categories = [] }: UseSpeciesOptions = {}) => {
  return useQuery({
    queryKey: ['species', coordinates?.latitude, coordinates?.longitude, maxDistance, searchQuery, categories],
    queryFn: async () => {
      let allSpecies: Species[] = [];

      // Step 1: Fetch cached species from database
      console.log('Fetching cached species from database...');
      const { data: cachedSpecies, error: dbError } = await supabase
        .from('species')
        .select('*');

      if (dbError) {
        console.error('Database error:', dbError);
      } else {
        allSpecies = transformDbToSpecies(cachedSpecies || []);
        console.log(`Loaded ${allSpecies.length} cached species`);
      }

      // Step 2: If user has location, fetch live data from iNaturalist
      if (coordinates) {
        console.log('Fetching live species from iNaturalist...');
        try {
          const { data: apiData, error: apiError } = await supabase.functions.invoke('fetch-species', {
            body: {
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              radius: maxDistance,
              perPage: 30,
            },
          });

          if (apiError) throw apiError;

          const apiSpecies = apiData.species || [];
          console.log(`Fetched ${apiSpecies.length} species from iNaturalist`);

          // Step 3: Merge and deduplicate (prioritize API data as more recent)
          const mergedSpecies = mergeSpeciesLists(allSpecies, apiSpecies);
          allSpecies = mergedSpecies;
        } catch (error) {
          console.error('iNaturalist API error (falling back to cache):', error);
        }
      }

      // Step 4: Apply search filter if provided
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        allSpecies = allSpecies.filter(s =>
          s.name.toLowerCase().includes(query) ||
          s.scientificName.toLowerCase().includes(query)
        );
      }

      // Step 5: Apply category filter if provided
      if (categories && categories.length > 0) {
        allSpecies = allSpecies.filter(s => categories.includes(s.category));
      }

      return allSpecies;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useSpeciesById = (id: string) => {
  return useQuery({
    queryKey: ['species', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('species')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return transformDbToSpecies([data])[0];
      }

      return undefined;
    },
    enabled: !!id,
  });
};

function transformDbToSpecies(dbSpecies: any[]): Species[] {
  return dbSpecies.map(s => ({
    id: s.id,
    name: s.name,
    scientificName: s.scientific_name,
    category: s.category,
    region: s.region || 'Unknown',
    imageUrl: s.primary_image_url,
    rarity: s.conservation_status || 'common',
    coordinates: s.lat_min && s.lat_max && s.lon_min && s.lon_max ? {
      latMin: s.lat_min,
      latMax: s.lat_max,
      lonMin: s.lon_min,
      lonMax: s.lon_max,
    } : undefined,
  }));
}

function mergeSpeciesLists(cached: Species[], api: Species[]): Species[] {
  const seen = new Set<string>();
  const merged: Species[] = [];

  // Add API species first (they're more recent/relevant)
  for (const species of api) {
    if (!seen.has(species.scientificName)) {
      merged.push(species);
      seen.add(species.scientificName);
    }
  }

  // Add cached species that aren't duplicates
  for (const species of cached) {
    if (!seen.has(species.scientificName)) {
      merged.push(species);
      seen.add(species.scientificName);
    }
  }

  return merged;
}
