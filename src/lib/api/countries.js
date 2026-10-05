import { DAY, request } from './request.js'
import { drivingSide } from '../drivingSide.js'

/*
  Country facts: currency, languages, capital, calling code, flag.

  Why not REST Countries? Its keyless v3.1 API was shut down in 2026 (it
  now answers "This API version has been deprecated") and v5 needs an
  API key. REST Countries was built on the open mledoze/countries dataset
  (ODbL licence), which is published to npm as `world-countries`, so we
  read that same data from the jsDelivr CDN: no key, CORS open.

  The trade-off: it's one file for every country (~1.4 MB, ~148 KB
  gzipped) rather than one small answer per country. Two caches make
  that cheap:
  - the browser's HTTP cache: jsDelivr sends `max-age=604800` (7 days),
    so after the first download the file comes from disk;
  - our sessionStorage cache: select() keeps ONE country (~1 KB), cached
    a day per country code (country facts change about once a decade).

  The dataset has no driving side, so that comes from drivingSide.js.
  Flags are images from flagcdn.com, because Windows shows flag emoji as
  two plain letters ("GH").
*/
const DATASET = 'https://cdn.jsdelivr.net/npm/world-countries@5/countries.json'

/** One country by ISO code ("GH"), or null if the dataset doesn't have it. */
export function getCountry(code, { signal } = {}) {
  const cca2 = String(code ?? '').toUpperCase()
  return request(DATASET, {
    signal,
    ttl: DAY,
    key: `country:${cca2}`,
    source: 'The country data service',
    select: (all) => normaliseCountry(Array.isArray(all) ? all.find((c) => c.cca2 === cca2) : null),
  })
}

export function normaliseCountry(raw) {
  if (!raw) return null
  const code = raw.cca2
  const currencies = Object.entries(raw.currencies ?? {}).map(([currencyCode, c]) => ({
    code: currencyCode,
    name: c.name,
    symbol: c.symbol ?? currencyCode,
  }))
  return {
    code,
    name: raw.name?.common ?? code,
    officialName: raw.name?.official ?? null,
    capital: raw.capital?.[0] ?? null,
    region: raw.region ?? null,
    subregion: raw.subregion ?? null,
    currencies,
    languages: Object.values(raw.languages ?? {}),
    callingCode: callingCode(raw.idd),
    drivingSide: drivingSide(code),
    landlocked: Boolean(raw.landlocked),
    flag: {
      src: `https://flagcdn.com/w160/${code.toLowerCase()}.png`,
      srcSet: `https://flagcdn.com/w320/${code.toLowerCase()}.png 2x`,
      alt: `Flag of ${raw.name?.common ?? code}`,
    },
  }
}

/*
  The dataset splits calling codes into a root and suffixes: Ghana is
  root "+2", suffix "33". The USA is root "+1" with hundreds of area-code
  suffixes; for those the root alone is the country code.
*/
function callingCode(idd) {
  if (!idd?.root) return null
  const suffixes = idd.suffixes ?? []
  return suffixes.length === 1 ? idd.root + suffixes[0] : idd.root
}
