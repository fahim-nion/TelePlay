/**
 * Utility for formatting and sorting country codes with English names and flag emojis.
 */

// Regional indicator symbol conversion for flag emoji: 'US' -> 🇺🇸
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const code = countryCode.toUpperCase();
  const offset = 127397;
  const first = code.charCodeAt(0) + offset;
  const second = code.charCodeAt(1) + offset;
  try {
    return String.fromCodePoint(first, second);
  } catch {
    return '🌐';
  }
}

// Fallback lookup table for common ISO codes if Intl is unavailable
const COUNTRY_NAME_FALLBACKS: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  IN: 'India',
  BD: 'Bangladesh',
  PK: 'Pakistan',
  RU: 'Russia',
  UA: 'Ukraine',
  JP: 'Japan',
  KR: 'South Korea',
  CN: 'China',
  BR: 'Brazil',
  MX: 'Mexico',
  AR: 'Argentina',
  TR: 'Turkey',
  SA: 'Saudi Arabia',
  AE: 'United Arab Emirates',
  EG: 'Egypt',
  ZA: 'South Africa',
  NG: 'Nigeria',
  KE: 'Kenya',
  ID: 'Indonesia',
  MY: 'Malaysia',
  TH: 'Thailand',
  VN: 'Vietnam',
  PH: 'Philippines',
  SG: 'Singapore',
  NZ: 'New Zealand',
  NL: 'Netherlands',
  BE: 'Belgium',
  CH: 'Switzerland',
  AT: 'Austria',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  PL: 'Poland',
  CZ: 'Czech Republic',
  HU: 'Hungary',
  RO: 'Romania',
  GR: 'Greece',
  PT: 'Portugal',
  IE: 'Ireland',
  IL: 'Israel',
  IR: 'Iran',
  IQ: 'Iraq',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
  VE: 'Venezuela',
};

let displayNamesInstance: Intl.DisplayNames | null = null;
try {
  if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames !== 'undefined') {
    displayNamesInstance = new Intl.DisplayNames(['en'], { type: 'region' });
  }
} catch {
  displayNamesInstance = null;
}

export function getCountryName(countryCode: string): string {
  if (!countryCode) return 'International';
  const upper = countryCode.toUpperCase().trim();
  if (displayNamesInstance) {
    try {
      const name = displayNamesInstance.of(upper);
      if (name) return name;
    } catch {
      // Fallback
    }
  }
  return COUNTRY_NAME_FALLBACKS[upper] || upper;
}

export interface FormattedCountry {
  code: string;
  name: string;
  flag: string;
  count: number;
}

/**
 * Transforms raw country count records into formatted, alphabetically sorted entries.
 */
export function formatAndSortCountries(
  countries: { country: string; count: number }[]
): FormattedCountry[] {
  return countries
    .map((c) => ({
      code: c.country.toUpperCase(),
      name: getCountryName(c.country),
      flag: getCountryFlag(c.country),
      count: c.count,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
}
