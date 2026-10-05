/*
  Countries and territories that drive on the LEFT (ISO 3166 alpha-2).
  Everywhere else drives on the right, including Nigeria, which switched
  from left to right in 1972 (so a Nigerian driver in Nairobi or London
  has to think about it).

  The country dataset we use has no driving side, so this list fills the
  gap. Source: Wikipedia, "Left- and right-hand traffic".
*/
const LEFT = new Set([
  // Africa
  'BW', 'KE', 'LS', 'MW', 'MU', 'MZ', 'NA', 'SC', 'ZA', 'SZ', 'TZ', 'UG', 'ZM', 'ZW', 'SH',
  // Asia
  'BD', 'BT', 'BN', 'HK', 'IN', 'ID', 'JP', 'MO', 'MY', 'MV', 'NP', 'PK', 'SG', 'LK', 'TH', 'TL', 'CX', 'CC',
  // Europe
  'GB', 'IE', 'CY', 'MT', 'IM', 'JE', 'GG',
  // Americas and the Caribbean
  'AG', 'AI', 'BS', 'BB', 'BM', 'VG', 'KY', 'DM', 'FK', 'GD', 'GY', 'JM', 'MS', 'KN', 'LC', 'VC', 'SR', 'TT', 'TC', 'VI',
  // Oceania
  'AU', 'NZ', 'FJ', 'KI', 'NR', 'PG', 'WS', 'SB', 'TO', 'TV', 'CK', 'NU', 'NF', 'PN', 'TK',
])

/** 'left' | 'right' */
export function drivingSide(countryCode) {
  return LEFT.has(String(countryCode).toUpperCase()) ? 'left' : 'right'
}
