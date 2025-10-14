import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import SpeciesCard from '@/components/SpeciesCard';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Navigation2 } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useCityName } from '@/hooks/useCityName';
import { getRegionFromCoordinates } from '@/utils/locationUtils';
import { FilterMenu } from '@/components/FilterMenu';
import { Skeleton } from '@/components/ui/skeleton';
import { useSpecies } from '@/hooks/useSpecies';
import { Button } from '@/components/ui/button';

const Explore = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [useLocation, setUseLocation] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [maxDistance, setMaxDistance] = useState(5);
  
  const { coordinates, loading: locationLoading, error: locationError } = useGeolocation();
  const { data: cityName, isLoading: cityLoading } = useCityName(useLocation ? coordinates : null);

  const detectedRegion = useMemo(() => {
    if (coordinates) {
      return getRegionFromCoordinates(coordinates);
    }
    return null;
  }, [coordinates]);

  useEffect(() => {
    if (detectedRegion && useLocation) {
      setSelectedRegion(detectedRegion);
    }
  }, [detectedRegion, useLocation]);

  // Use hybrid species hook with category filtering
  const { 
    data: allSpecies = [], 
    isLoading: speciesLoading,
  } = useSpecies({
    coordinates: useLocation ? coordinates : null,
    maxDistance,
    searchQuery,
    categories: selectedCategories,
  });

  // Filter by manual region if not using location
  const filteredSpecies = useMemo(() => {
    let filtered = allSpecies;

    if (!useLocation && selectedRegion !== 'All Regions') {
      filtered = filtered.filter(s => s.region === selectedRegion);
    }

    return filtered;
  }, [allSpecies, useLocation, selectedRegion]);

  const isLoading = locationLoading || speciesLoading;

  const getHeaderText = () => {
    if (locationLoading || cityLoading) {
      return 'Detecting your location...';
    }
    
    if (coordinates && useLocation && cityName) {
      return `${filteredSpecies.length} species likely today near ${cityName}`;
    }
    
    if (useLocation && locationError) {
      return 'Location unavailable - showing all species';
    }
    
    return `Explore ${filteredSpecies.length} Wildlife Species`;
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground relative">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-1">Explore Wildlife</h1>
            <p className="text-sm text-primary-foreground/90">
              {getHeaderText()}
            </p>
          </div>
          
          <FilterMenu
            selectedCategories={selectedCategories}
            onCategoriesChange={setSelectedCategories}
            selectedRegion={selectedRegion}
            onRegionChange={setSelectedRegion}
            maxDistance={maxDistance}
            onDistanceChange={setMaxDistance}
            useLocation={useLocation}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-4 relative">
        <div className="bg-card rounded-lg shadow-soft p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search species..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSpecies.map((species) => (
                <SpeciesCard
                  key={species.id}
                  species={species}
                  onClick={() => navigate(`/species/${species.id}`)}
                />
              ))}
            </div>

            {filteredSpecies.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No species found {searchQuery ? 'matching your search' : 'with current filters'}.
                </p>
              </div>
            )}
          </>
        )}

        <Button
          size="icon"
          variant={useLocation ? "default" : "outline"}
          className="fixed bottom-28 right-6 h-14 w-14 rounded-full shadow-lg z-10 hover:scale-110 transition-transform"
          onClick={() => setUseLocation(!useLocation)}
        >
          {useLocation ? (
            <Navigation2 className="h-6 w-6 fill-current" />
          ) : (
            <MapPin className="h-6 w-6" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default Explore;
