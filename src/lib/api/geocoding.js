import { ApiError, DAY, q, request } from './request.js'

/*
  Open-Meteo Geocoding: turns "Accra" into places with coordinates, a
  country code and a timezone. It's the first link in the chain: weather
  needs the coordinates, the country lookup needs the country code, the
  clock needs the timezone and Wikipedia needs the name.

  Places come from GeoNames, and each has a stable numeric id, which is
  what goes in our URLs (/place/2306104), so a link always means the same
  Accra, not whichever "Accra" a search happens to rank first.

  Free, no key, for non-commercial use. Place data barely changes, so
  both calls cache for a day.
*/
const BASE = 'https://geocoding-api.open-meteo.com/v1/'
const SOURCE = 'The place search'

/** Up to 8 places matching `name` (empty array when nothing matches). */
export function searchPlaces(name, { signal } = {}) {
  const term = name.trim()
  return request(`${BASE}search?name=${q(term)}&count=8&language=en&format=json`, {
    signal,
    ttl: DAY,
    key: `geo:search:${term.toLowerCase()}`,
    source: SOURCE,
    // No matches come back as an object with no `results` key at all
    select: (json) => (json?.results ?? []).map(normalisePlace).filter(Boolean),
  })
}

/** One place by its GeoNames id. Throws ApiError kind 'notfound' for an unknown id. */
export async function getPlace(id, { signal } = {}) {
  if (!/^\d{1,10}$/.test(String(id))) {
    throw new ApiError("That place link isn't valid.", { kind: 'notfound', source: SOURCE })
  }
  try {
    const place = await request(`${BASE}get?id=${id}`, { signal, ttl: DAY, key: `geo:get:${id}`, source: SOURCE, select: normalisePlace })
    if (!place) throw new ApiError("We couldn't find that place.", { kind: 'notfound', source: SOURCE })
    return place
  } catch (err) {
    // An unknown id is answered with 400 {"reason":"Location ID not found."}, not 404
    if (err.status === 400) throw new ApiError("We couldn't find that place.", { kind: 'notfound', status: 400, source: SOURCE })
    throw err
  }
}

/**
 * The clean place shape the rest of the app uses.
 * Returns null for entries we can't use (no coordinates or timezone).
 */
export function normalisePlace(raw) {
  if (!raw || raw.latitude == null || raw.longitude == null) return null
  const admin1 = raw.admin1 && raw.admin1 !== raw.name ? raw.admin1 : null
  return {
    id: String(raw.id),
    name: raw.name,
    admin1,
    country: raw.country ?? '',
    countryCode: (raw.country_code ?? '').toUpperCase(),
    lat: raw.latitude,
    lon: raw.longitude,
    timezone: raw.timezone || 'UTC',
    population: raw.population ?? null,
    elevation: raw.elevation ?? null,
    // "Accra, Greater Accra Region, Ghana": enough to tell two Accras apart
    label: [raw.name, admin1, raw.country].filter(Boolean).join(', '),
  }
}
