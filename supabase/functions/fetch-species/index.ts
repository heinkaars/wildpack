import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, radius = 50, perPage = 30 } = await req.json();

    console.log(`Fetching species near ${latitude}, ${longitude} within ${radius}km`);

    // Call iNaturalist observations API
    const url = new URL('https://api.inaturalist.org/v1/observations');
    url.searchParams.set('lat', latitude.toString());
    url.searchParams.set('lng', longitude.toString());
    url.searchParams.set('radius', radius.toString());
    url.searchParams.set('per_page', perPage.toString());
    url.searchParams.set('quality_grade', 'research');
    url.searchParams.set('photos', 'true');
    url.searchParams.set('order', 'desc');
    url.searchParams.set('order_by', 'votes');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'WildlifeExplorerApp/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`iNaturalist API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Retrieved ${data.results?.length || 0} observations`);

    // Transform iNaturalist data to our format
    const species = data.results.map((obs: any) => {
      const taxon = obs.taxon;
      const photo = obs.photos?.[0];
      
      return {
        id: `inaturalist-${taxon.id}`,
        name: taxon.preferred_common_name || taxon.name,
        scientificName: taxon.name,
        category: mapIconicTaxon(taxon.iconic_taxon_name),
        region: obs.place_guess || 'Unknown',
        imageUrl: photo?.url?.replace('square', 'medium') || '',
        imageUrls: obs.photos?.map((p: any) => p.url?.replace('square', 'medium')) || [],
        rarity: determineRarity(obs.quality_grade, taxon.observations_count),
        coordinates: obs.location ? {
          latMin: obs.location[0] - 1,
          latMax: obs.location[0] + 1,
          lonMin: obs.location[1] - 1,
          lonMax: obs.location[1] + 1,
        } : undefined,
        inaturalistId: taxon.id,
        wikipediaUrl: taxon.wikipedia_url,
        description: taxon.wikipedia_summary,
        observationCount: taxon.observations_count,
        source: 'inaturalist',
      };
    });

    console.log(`Transformed ${species.length} species`);

    return new Response(JSON.stringify({ species }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching species:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      species: [] 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function mapIconicTaxon(iconicTaxon: string): string {
  const mapping: Record<string, string> = {
    'Mammalia': 'mammal',
    'Aves': 'bird',
    'Reptilia': 'reptile',
    'Amphibia': 'amphibian',
    'Insecta': 'insect',
    'Actinopterygii': 'fish',
    'Arachnida': 'arachnid',
    'Plantae': 'plant',
    'Fungi': 'fungus',
    'Mollusca': 'other',
    'Crustacea': 'crustacean',
  };
  return mapping[iconicTaxon] || 'other';
}

function determineRarity(quality: string, observationCount: number): string {
  if (observationCount > 100000) return 'common';
  if (observationCount > 10000) return 'uncommon';
  return 'rare';
}
