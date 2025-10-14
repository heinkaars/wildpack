import { useQuery } from '@tanstack/react-query';
import { getCityFromCoordinates } from '@/utils/geocoding';
import { Coordinates } from './useGeolocation';

export const useCityName = (coordinates: Coordinates | null) => {
  return useQuery({
    queryKey: ['city-name', coordinates?.latitude, coordinates?.longitude],
    queryFn: () => {
      if (!coordinates) return null;
      return getCityFromCoordinates(coordinates.latitude, coordinates.longitude);
    },
    enabled: !!coordinates,
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
  });
};
