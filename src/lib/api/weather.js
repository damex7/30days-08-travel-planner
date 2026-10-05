import { DAY, MINUTE, request } from './request.js'

/*
  Open-Meteo Forecast and Historical Weather (archive). Free, no key,
  non-commercial use, and their licence (CC BY 4.0) asks for credit,
  which the forecast section and the footer give.

  Temperatures are always fetched in °C. The °F toggle only changes how
  numbers are displayed, so one cached forecast serves both units.
*/
const FORECAST = 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive'
const SOURCE = 'Open-Meteo'

const DAILY = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_probability_max',
  'precipitation_sum',
  'uv_index_max',
  'wind_speed_10m_max',
].join(',')

/**
 * 7-day forecast for a place, in the place's own timezone (so "Monday" is
 * Monday there, not in Lagos).
 * Cached for 15 minutes: forecasts are re-run through the day, and 15
 * minutes keeps it fresh without asking again on every page visit.
 */
export function getForecast(place, { signal } = {}) {
  const url = `${FORECAST}?latitude=${place.lat}&longitude=${place.lon}&daily=${DAILY}&timezone=auto&forecast_days=7`
  return request(url, { signal, ttl: 15 * MINUTE, key: `wx:forecast:${place.id}`, source: SOURCE, select: normaliseForecast })
}

export function normaliseForecast(json) {
  const d = json?.daily
  if (!d?.time?.length) return { days: [] }
  const days = d.time.map((date, i) => ({
    date, // "2026-10-05", a calendar date in the place's timezone
    code: d.weather_code?.[i] ?? null,
    high: d.temperature_2m_max?.[i] ?? null,
    low: d.temperature_2m_min?.[i] ?? null,
    rainChance: d.precipitation_probability_max?.[i] ?? null,
    rainMm: d.precipitation_sum?.[i] ?? null,
    uv: d.uv_index_max?.[i] ?? null,
    wind: d.wind_speed_10m_max?.[i] ?? null, // km/h
  }))
  // Drop days the model returned without temperatures (it happens at the edge of the range)
  return { days: days.filter((day) => day.high != null && day.low != null) }
}

/**
 * "Typical weather by month": averages over the last three full calendar
 * years of the ERA5 reanalysis. This answers "what's Nairobi like in
 * July?", which a 7-day forecast can't, and it's what the packing list
 * falls back on for a trip months away.
 *
 * The raw response is ~1,100 days x 3 values; select() boils it down to 12
 * rows BEFORE it's cached. Past weather doesn't change, so it's cached for
 * a day (the limit is only there so a long-open tab eventually refreshes).
 */
export function getTypicalYear(place, { signal } = {}) {
  const lastYear = new Date().getFullYear() - 1
  const url =
    `${ARCHIVE}?latitude=${place.lat}&longitude=${place.lon}` +
    `&start_date=${lastYear - 2}-01-01&end_date=${lastYear}-12-31` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`
  return request(url, { signal, ttl: DAY, key: `wx:typical:${place.id}:${lastYear}`, source: 'Open-Meteo (history)', select: normaliseTypicalYear })
}

export function normaliseTypicalYear(json) {
  const d = json?.daily
  if (!d?.time?.length) return { months: [], years: '' }
  const buckets = Array.from({ length: 12 }, () => ({ highs: [], lows: [], rainyDays: 0, rainMm: 0, days: 0 }))
  d.time.forEach((date, i) => {
    const b = buckets[Number(date.slice(5, 7)) - 1]
    const high = d.temperature_2m_max[i]
    const low = d.temperature_2m_min[i]
    const rain = d.precipitation_sum[i]
    if (high == null || low == null) return
    b.highs.push(high)
    b.lows.push(low)
    b.days++
    if (rain != null) {
      b.rainMm += rain
      if (rain >= 1) b.rainyDays++ // 1 mm is the usual "it actually rained" threshold
    }
  })
  const years = new Set(d.time.map((t) => t.slice(0, 4)))
  const yearCount = years.size || 1
  const months = buckets.map((b, i) => ({
    month: i + 1,
    high: b.days ? round1(avg(b.highs)) : null,
    low: b.days ? round1(avg(b.lows)) : null,
    rainyDays: b.days ? Math.round(b.rainyDays / yearCount) : null, // per month, averaged over the years
    rainMm: b.days ? Math.round(b.rainMm / yearCount) : null,
  }))
  const sorted = [...years].sort()
  return { months, years: `${sorted[0]}–${sorted[sorted.length - 1]}` }
}

const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length
const round1 = (n) => Math.round(n * 10) / 10

/*
  WMO weather codes (what Open-Meteo returns) to a label and one of our
  icon groups. https://open-meteo.com/en/docs#weathervariables
*/
const WMO = {
  0: ['Clear sky', 'clear'],
  1: ['Mainly clear', 'clear'],
  2: ['Partly cloudy', 'partly'],
  3: ['Overcast', 'cloudy'],
  45: ['Fog', 'fog'],
  48: ['Freezing fog', 'fog'],
  51: ['Light drizzle', 'drizzle'],
  53: ['Drizzle', 'drizzle'],
  55: ['Heavy drizzle', 'drizzle'],
  56: ['Freezing drizzle', 'drizzle'],
  57: ['Freezing drizzle', 'drizzle'],
  61: ['Light rain', 'rain'],
  63: ['Rain', 'rain'],
  65: ['Heavy rain', 'rain'],
  66: ['Freezing rain', 'rain'],
  67: ['Freezing rain', 'rain'],
  71: ['Light snow', 'snow'],
  73: ['Snow', 'snow'],
  75: ['Heavy snow', 'snow'],
  77: ['Snow grains', 'snow'],
  80: ['Light showers', 'rain'],
  81: ['Showers', 'rain'],
  82: ['Violent showers', 'rain'],
  85: ['Snow showers', 'snow'],
  86: ['Heavy snow showers', 'snow'],
  95: ['Thunderstorm', 'storm'],
  96: ['Thunderstorm with hail', 'storm'],
  99: ['Thunderstorm with hail', 'storm'],
}

/** { label: 'Light rain', icon: 'rain' } for a WMO code. */
export function describeWeather(code) {
  const [label, icon] = WMO[code] ?? ['Unknown', 'cloudy']
  return { label, icon }
}
