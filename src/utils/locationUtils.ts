import { Coordinates } from '@/hooks/useGeolocation';
import { Species } from '@/data/species';

// Calculate distance between two coordinates using Haversine formula (in km)
export const calculateDistance = (
  coord1: Coordinates,
  coord2: Coordinates
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.latitude)) *
    Math.cos(toRad(coord2.latitude)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

// Check if coordinates are within species range
export const isInRange = (
  userCoords: Coordinates,
  species: Species,
  maxDistance: number = 1000 // km
): boolean => {
  if (!species.coordinates) return false;
  
  const { latMin, latMax, lonMin, lonMax } = species.coordinates;
  
  // Check if user is within bounding box
  if (
    userCoords.latitude >= latMin &&
    userCoords.latitude <= latMax &&
    userCoords.longitude >= lonMin &&
    userCoords.longitude <= lonMax
  ) {
    return true;
  }
  
  // Calculate distance to nearest point in range
  const nearestLat = Math.max(latMin, Math.min(latMax, userCoords.latitude));
  const nearestLon = Math.max(lonMin, Math.min(lonMax, userCoords.longitude));
  
  const distance = calculateDistance(userCoords, {
    latitude: nearestLat,
    longitude: nearestLon
  });
  
  return distance <= maxDistance;
};

// Get region name from coordinates (simplified)
export const getRegionFromCoordinates = (coords: Coordinates): string => {
  const { latitude, longitude } = coords;
  
  // North America
  if (latitude >= 15 && latitude <= 72 && longitude >= -168 && longitude <= -52) {
    return 'North America';
  }
  // Europe
  if (latitude >= 36 && latitude <= 71 && longitude >= -10 && longitude <= 40) {
    return 'Europe';
  }
  // Asia
  if (latitude >= -10 && latitude <= 55 && longitude >= 40 && longitude <= 180) {
    return 'Asia';
  }
  // South America
  if (latitude >= -56 && latitude <= 13 && longitude >= -82 && longitude <= -34) {
    return 'South America';
  }
  // Africa
  if (latitude >= -35 && latitude <= 37 && longitude >= -18 && longitude <= 52) {
    return 'Africa';
  }
  // Australia/Oceania
  if (latitude >= -47 && latitude <= -10 && longitude >= 113 && longitude <= 180) {
    return 'Australia';
  }
  
  return 'Unknown';
};

// Filter species by location
export const filterSpeciesByLocation = (
  species: Species[],
  userCoords: Coordinates | null,
  maxDistance: number = 1000
): Species[] => {
  if (!userCoords) return species;
  
  return species.filter(s => isInRange(userCoords, s, maxDistance));
};
