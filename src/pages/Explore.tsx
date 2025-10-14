import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { speciesData } from '@/data/species';
import SpeciesCard from '@/components/SpeciesCard';
import { Input } from '@/components/ui/input';
import { Search, MapPin } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { filterSpeciesByLocation, getRegionFromCoordinates } from '@/utils/locationUtils';
import LocationSelector from '@/components/LocationSelector';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

const Explore = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [useLocation, setUseLocation] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [maxDistance, setMaxDistance] = useState(50);
  const { coordinates, loading: locationLoading, error: locationError } = useGeolocation();

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

  const filteredSpecies = useMemo(() => {
    let filtered = speciesData;

    // Filter by location if enabled
    if (useLocation && coordinates) {
      filtered = filterSpeciesByLocation(filtered, coordinates, maxDistance);
    } else if (selectedRegion !== 'All Regions') {
      filtered = filtered.filter(s => s.region === selectedRegion);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(species =>
        species.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        species.scientificName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [coordinates, useLocation, selectedRegion, searchQuery, maxDistance]);

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground">
        <h1 className="text-3xl font-bold mb-2">Explore Wildlife</h1>
        <p className="text-primary-foreground/90">
          {locationLoading
            ? 'Detecting your location...'
            : coordinates && useLocation
            ? `Showing species near you (${detectedRegion})`
            : 'Discover species around the world'}
        </p>
        {locationError && useLocation && (
          <p className="text-sm text-primary-foreground/70 mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Location unavailable - showing all species
          </p>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-4">
        <div className="bg-card rounded-lg shadow-soft p-4 mb-6 space-y-4">
          <LocationSelector
            currentRegion={selectedRegion}
            onRegionChange={setSelectedRegion}
            useLocation={useLocation}
            onToggleLocation={() => setUseLocation(!useLocation)}
          />
          
          {useLocation && coordinates && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Distance: {maxDistance} km
              </Label>
              <Slider
                value={[maxDistance]}
                onValueChange={(value) => setMaxDistance(value[0])}
                min={5}
                max={1000}
                step={10}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Adjust the search radius for nearby species
              </p>
            </div>
          )}
          
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

        {locationLoading && useLocation ? (
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
                  No species found {searchQuery ? 'matching your search' : 'in this area'}.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Explore;
