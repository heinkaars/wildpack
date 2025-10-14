export async function getCityFromCoordinates(lat: number, lon: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      {
        headers: {
          'User-Agent': 'WildlifeExplorerApp/1.0',
        },
      }
    );
    
    const data = await response.json();
    const address = data.address;
    
    // Build city string: "San Francisco, CA" or "London, UK"
    const city = address.city || address.town || address.village || address.county;
    const state = address.state || address.region;
    const country = address.country_code?.toUpperCase();
    
    if (city && state) {
      return `${city}, ${state}`;
    } else if (city && country) {
      return `${city}, ${country}`;
    } else if (state) {
      return state;
    }
    
    return 'your location';
  } catch (error) {
    console.error('Geocoding error:', error);
    return 'your location';
  }
}
