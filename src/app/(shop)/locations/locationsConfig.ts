/** A single opening-hours span, in 24h `HH:MM`. */
export interface OpeningHours {
  /** Schema.org day names this span applies to. */
  days: string[];
  opens: string;
  closes: string;
}

/**
 * Store hours. Confirmed uniform across all seven stores (2026-07-31), but
 * modelled per store so a future divergence is an edit, not a refactor.
 */
export const DEFAULT_HOURS: OpeningHours[] = [
  {
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: '08:00',
    closes: '18:00',
  },
  { days: ['Sunday'], opens: '10:00', closes: '16:00' },
];

export interface LocationConfig {
  slug: string;
  name: string;
  address: string;
  /** Display form, `(305) 278-4632`. The dialable E.164 lives in `tel`. */
  phone: string;
  tel: string;
  /**
   * Google Maps CID — the stable identifier of this store's Business Profile,
   * taken from the `0x…:0x…` pair in the profile's Maps URL (the half after the
   * colon, in decimal).
   *
   * The link is derived from it rather than pasted, because a copied Maps URL
   * carries a locale (`hl=`), a session token (`g_ep=`) and tracking parameters
   * that rot, and — as we found — can silently point at a neighbouring business.
   * A CID names one listing and nothing else.
   */
  cid: string;
  /**
   * Canonical link to the store's Business Profile. Derived from {@link cid};
   * never hand-written.
   */
  mapLink: string;
  /**
   * Marker coordinates of the store's Business Profile pin.
   *
   * Verified store by store against Google Business Profile on 2026-08-04. Six
   * matched; Miami Gardens did not — it held the coordinates of a locksmith in
   * the same plaza, inherited from a link that pointed at the wrong listing.
   * A wrong pin sends a customer to the wrong store, so re-verify against the
   * profile rather than against a copied URL.
   */
  geo: { latitude: number; longitude: number };
  /** Opening hours for this store. Defaults to {@link DEFAULT_HOURS}. */
  hours: OpeningHours[];
  /** Background image for the home slider card and the location hero. */
  image: string;
  /** Short "areas served" tagline shown on the home slider card. */
  serving: string;
  neighborhoods: string[];
  city: 'Miami' | 'Orlando';
  description: string;
  /**
   * The store's Google rating, **copied by hand** from its Maps profile (053) —
   * never pulled from the Business Profile API, whose content may not be stored
   * over 30 days. `readOn` is the day it was read; a test fails 90 days later
   * as a reminder to re-read all seven (D7). Update the three together.
   */
  google: GoogleFigures;
}

export interface GoogleFigures {
  /** Stars out of 5, one decimal, as Maps shows it. */
  rating: number;
  /** Number of Google reviews. */
  reviews: number;
  /** `YYYY-MM-DD`, the day it was read on Maps. */
  readOn: string;
}

export const locationsConfig: LocationConfig[] = [
  {
    slug: 'cutler-bay',
    name: 'Cutler Bay',
    address: '18200 S Dixie Hwy, Miami, FL 33157',
    phone: '(305) 278-4632',
    tel: 'tel:+13052784632',
    cid: '5066795194871319329',
    mapLink: 'https://maps.google.com/?cid=5066795194871319329',
    geo: { latitude: 25.6004389, longitude: -80.3537558 },
    hours: DEFAULT_HOURS,
    image: '/assets/images/Locations/18200.jpg',
    serving: 'Cutler Bay • Palmetto Bay • South Miami • Kendall • Pinecrest',
    neighborhoods: ['Cutler Bay', 'Palmetto Bay', 'South Miami', 'Kendall', 'Pinecrest'],
    city: 'Miami',
    description:
      'Our South Dixie Highway location serves the communities of Cutler Bay, Palmetto Bay, South Miami, Kendall, and Pinecrest. Stop in for new or used tires, wheel alignment, oil changes, brake service, and more — no appointment needed.',
    google: { rating: 4.8, reviews: 2083, readOn: '2026-11-18' },
  },
  {
    slug: 'miami-airport',
    name: 'Miami Airport',
    address: '3251 NW 27th Ave, Miami, FL 33142',
    phone: '(305) 456-9588',
    tel: 'tel:+13054569588',
    cid: '2096624248671681511',
    mapLink: 'https://maps.google.com/?cid=2096624248671681511',
    geo: { latitude: 25.8060487, longitude: -80.2398748 },
    hours: DEFAULT_HOURS,
    image: '/assets/images/Locations/3251.webp',
    serving: 'Allapattah • Midtown • Near Miami Int’l Airport',
    neighborhoods: ['Allapattah', 'Midtown Miami', 'Wynwood', 'Near Miami International Airport'],
    city: 'Miami',
    description:
      'Conveniently located near Miami International Airport on NW 27th Ave, this location serves Allapattah, Midtown Miami, and Wynwood. We carry new and used tires for all makes and models, plus a full menu of automotive services.',
    google: { rating: 4.8, reviews: 1499, readOn: '2026-11-18' },
  },
  {
    slug: 'miami-gardens',
    name: 'Miami Gardens',
    address: '20282 NW 2nd Ave, Miami Gardens, FL 33169',
    phone: '(305) 770-1154',
    tel: 'tel:+13057701154',
    cid: '12040422701354621089',
    mapLink: 'https://maps.google.com/?cid=12040422701354621089',
    geo: { latitude: 25.9613707, longitude: -80.2062258 },
    hours: DEFAULT_HOURS,
    image: '/assets/images/Locations/20282.jpg',
    serving: 'Miami Gardens • Hollywood • Aventura',
    neighborhoods: ['Miami Gardens', 'Hollywood', 'Aventura', 'Opa-locka', 'North Miami'],
    city: 'Miami',
    description:
      'Our North Miami location on NW 2nd Ave serves Miami Gardens, Hollywood, Aventura, and North Miami. With 15,000+ tires across our 7 locations, we can quickly find the right tire for your vehicle.',
    google: { rating: 4.6, reviews: 1111, readOn: '2026-11-18' },
  },
  {
    slug: 'coral-gables',
    name: 'Coral Gables',
    address: '900 South Le Jeune Rd, Coral Gables, FL 33134',
    phone: '(305) 713-1258',
    tel: 'tel:+13057131258',
    cid: '9306129931212076132',
    mapLink: 'https://maps.google.com/?cid=9306129931212076132',
    geo: { latitude: 25.7633216, longitude: -80.2635377 },
    hours: DEFAULT_HOURS,
    image: '/assets/images/Locations/900.jpg',
    serving: 'Coral Gables • Westchester • Near MIA Airport',
    neighborhoods: [
      'Coral Gables',
      'Westchester',
      'West Miami',
      'Near Miami International Airport',
    ],
    city: 'Miami',
    description:
      'Located on South Le Jeune Road, our Coral Gables shop serves the upscale communities of Coral Gables, Westchester, and West Miami. Quality tire service from ASE-certified technicians.',
    google: { rating: 4.7, reviews: 394, readOn: '2026-11-18' },
  },
  {
    slug: 'hialeah',
    name: 'Hialeah',
    address: '4040 E 10th Ct, Hialeah, FL 33013',
    phone: '(305) 836-4200',
    tel: 'tel:+13058364200',
    cid: '10647748756063834745',
    mapLink: 'https://maps.google.com/?cid=10647748756063834745',
    geo: { latitude: 25.8598175, longitude: -80.2616707 },
    hours: DEFAULT_HOURS,
    image: '/assets/images/Locations/4040.webp',
    serving: 'Hialeah • Miami Springs • East Hialeah',
    neighborhoods: ['Hialeah', 'Miami Springs', 'East Hialeah', 'Medley'],
    city: 'Miami',
    description:
      'Our Hialeah location on E 10th Court serves Hialeah, Miami Springs, and East Hialeah. We offer the same full menu of tire and automotive services as all our locations — with the same ASE-certified technicians and 30-day warranty on used tires.',
    google: { rating: 4.7, reviews: 161, readOn: '2026-11-18' },
  },
  {
    slug: 'orlando-west-colonial',
    name: 'Orlando West Colonial',
    address: '4400 W Colonial Dr, Orlando, FL 32808',
    phone: '(407) 203-3912',
    tel: 'tel:+14072033912',
    cid: '7321587865564452670',
    mapLink: 'https://maps.google.com/?cid=7321587865564452670',
    geo: { latitude: 28.5522005, longitude: -81.4342076 },
    hours: DEFAULT_HOURS,
    image: '/assets/images/Locations/4400.jpg',
    serving: 'Winter Garden • Metrowest • West Orlando',
    neighborhoods: ['Winter Garden', 'Metrowest', 'West Orlando'],
    city: 'Orlando',
    description:
      'Our West Colonial Drive location serves Winter Garden, Metrowest, and West Orlando. Same quality tires and services as our Miami locations — now serving Central Florida drivers.',
    google: { rating: 4.7, reviews: 635, readOn: '2026-11-18' },
  },
  {
    slug: 'east-orlando',
    name: 'East Orlando',
    address: '575 N Semoran Blvd, Orlando, FL 32807',
    phone: '(407) 282-3100',
    tel: 'tel:+14072823100',
    cid: '7657616713785074051',
    mapLink: 'https://maps.google.com/?cid=7657616713785074051',
    geo: { latitude: 28.5519878, longitude: -81.3103062 },
    hours: DEFAULT_HOURS,
    image: '/assets/images/Locations/575.jpg',
    // Executive, not International. See the `description` below — the same
    // mistake lived in three fields and this one renders on the home page.
    serving: 'Azalea Park • Winter Park • East Orlando • Near Orlando Executive Airport',
    neighborhoods: ['Azalea Park', 'Winter Park', 'East Orlando', 'Near Orlando Executive Airport'],
    city: 'Orlando',
    description:
      /**
       * This said **Orlando International** until 2026-08-18. The shop is at
       * 575 N Semoran Blvd, beside Orlando **Executive** — about 20 km from MCO.
       * Anyone searching for tires near the International and driving here made
       * a wasted trip.
       *
       * The same error sat in `serving` and in `neighborhoods` above: one fact,
       * three copies, rendered on four surfaces including the home page's
       * locations slider. `storeFacts.guard.test.ts` now fails if the three ever
       * disagree again.
       *
       * Semoran Blvd leads because that is what someone nearby navigates by;
       * Executive is named behind it for accuracy.
       */
      'Located on N Semoran Blvd, minutes from Orlando Executive Airport, our East Orlando location serves Azalea Park, Winter Park, and surrounding communities. Walk in for new or used tires, mounting, balancing, alignment, and more.',
    google: { rating: 4.5, reviews: 69, readOn: '2026-11-18' },
  },
];

export function getLocationBySlug(slug: string): LocationConfig | undefined {
  return locationsConfig.find(l => l.slug === slug);
}
