import { locationsConfig } from '@/app/(shop)/locations/locationsConfig';
import type { LocationData } from '@/app/ui/components/LocationCard/location-card';

// Derived from the single source of truth (locationsConfig) so store details
// never drift between the slider, the menu and the /locations pages.
export const locationsData: LocationData[] = locationsConfig.map((l, i) => ({
  id: `location-${i + 1}`,
  name: l.name,
  address: l.address,
  locationStore: `Serving ${l.serving}`,
  phone: l.phone,
  backgroundImage: l.image,
  link: l.mapLink,
  // Feature 041: pickup is restricted to stores in the tires' city.
  city: l.city,
  google: l.google,
}));
