import { describeWeather } from './api/weather.js'
import { formatTemp } from './format.js'

/*
  The packing list, as pure functions: weather in, list out. No React, no
  storage, no fetching, so each rule can be read (and tested) on its own.

  1. summariseForecast / summariseClimate boil the weather down to a few
     numbers: coldest low, hottest high, rainy days, strongest UV, wind.
  2. RULES: each rule looks at that summary and, if it applies, adds
     items with a reason you can read ("Rain likely on 3 of 7 days").
  3. mergePacking combines the generated list with what you've done to
     it (ticked, removed, added your own), which is what gets saved.
*/

// ---------- 1. Weather summaries ----------

/** Summary of forecast days (all of them, or the ones inside a trip). */
export function summariseForecast(days) {
  if (!days?.length) return null
  return {
    source: 'forecast',
    dayCount: days.length,
    minLow: Math.min(...days.map((d) => d.low)),
    maxHigh: Math.max(...days.map((d) => d.high)),
    // A day counts as rainy if rain is more likely than not, or real rain (2 mm+) is forecast
    rainyDays: days.filter((d) => (d.rainChance ?? 0) >= 50 || (d.rainMm ?? 0) >= 2).length,
    maxUv: Math.max(...days.map((d) => d.uv ?? 0)),
    maxWind: Math.max(...days.map((d) => d.wind ?? 0)),
    snow: days.some((d) => describeWeather(d.code).icon === 'snow'),
  }
}

/**
 * Summary from typical-year months, for trips too far ahead for a forecast.
 * `monthNumbers` are the months the trip touches (1-12).
 */
export function summariseClimate(months, monthNumbers, dayCount = 7) {
  const picked = (months ?? []).filter((m) => monthNumbers.includes(m.month) && m.high != null)
  if (!picked.length) return null
  const rainyShare = Math.max(...picked.map((m) => m.rainyDays / 30))
  return {
    source: 'climate',
    dayCount,
    minLow: Math.min(...picked.map((m) => m.low)),
    maxHigh: Math.max(...picked.map((m) => m.high)),
    rainyDays: Math.round(rainyShare * dayCount),
    maxUv: null, // the archive has no UV; the sun rule falls back on heat
    maxWind: 0,
    snow: picked.some((m) => m.low <= 0),
  }
}

/*
  Which weather should a trip's list use? The forecast only covers the
  next 7 days. If at least half the trip falls inside it, use the
  forecast for those days; otherwise use typical weather for the
  months the trip touches.
*/
export function summariseForTrip({ forecastDays, typicalMonths, startDate, endDate }) {
  const tripDays = datesBetween(startDate, endDate)
  const inForecast = (forecastDays ?? []).filter((d) => d.date >= startDate && d.date <= endDate)
  if (inForecast.length && inForecast.length >= tripDays.length / 2) return summariseForecast(inForecast)
  const months = [...new Set(tripDays.map((d) => Number(d.slice(5, 7))))]
  return summariseClimate(typicalMonths, months, tripDays.length)
}

/** ["2026-10-05", "2026-10-06", ...] inclusive. Works on calendar dates, so no timezone shifts. */
export function datesBetween(start, end) {
  const out = []
  const d = new Date(`${start}T00:00:00Z`)
  const last = new Date(`${end}T00:00:00Z`)
  while (d <= last && out.length < 366) {
    out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

// ---------- 2. Rules ----------

/** "12°C" or "54°F": reasons are read on their own, so they name the unit. */
const temp = (celsius, units) => formatTemp(celsius, units) + (units === 'f' ? 'F' : 'C')

/*
  Each rule: { id, when(summary), items: [[id, label]], reason(summary, units) }.
  Item ids are stable ("umbrella"), so your ticks survive a forecast update.
*/
export const RULES = [
  {
    id: 'rain',
    when: (s) => s.rainyDays >= 1,
    items: [
      ['umbrella', 'Compact umbrella'],
      ['rain-jacket', 'Light rain jacket'],
    ],
    reason: (s) => (s.source === 'forecast' ? `Rain likely on ${s.rainyDays} of ${s.dayCount} days` : `About ${s.rainyDays} rainy days are typical for a trip this long`),
  },
  {
    id: 'wet',
    when: (s) => s.rainyDays >= 4,
    items: [['quick-dry-shoes', 'Shoes that cope with wet streets']],
    reason: () => 'A wet spell: more rainy days than dry ones',
  },
  {
    id: 'cool',
    when: (s) => s.minLow < 15,
    items: [
      ['jacket', 'Warm jacket'],
      ['trousers', 'Long trousers'],
    ],
    reason: (s, u) => `Lows of ${temp(s.minLow, u)}, colder than a Lagos harmattan morning`,
  },
  {
    id: 'cold',
    when: (s) => s.minLow < 5,
    items: [
      ['coat', 'Heavy winter coat'],
      ['gloves', 'Gloves'],
      ['beanie', 'Woolly hat'],
      ['thermals', 'Thermal base layer'],
    ],
    reason: (s, u) => `Near freezing: lows of ${temp(s.minLow, u)}`,
  },
  {
    id: 'snow',
    when: (s) => s.snow,
    items: [['boots', 'Waterproof boots with grip']],
    reason: () => 'Snow or ice is possible',
  },
  {
    id: 'evenings',
    // Warm days, but evenings cool enough (15–19 °C) to want a layer; below 15 the jacket rule covers it
    when: (s) => s.minLow >= 15 && s.minLow < 20 && s.maxHigh - s.minLow >= 8,
    items: [['light-layer', 'Light sweater for the evenings']],
    reason: (s, u) => `Evenings cool down to ${temp(s.minLow, u)}`,
  },
  {
    id: 'hot',
    when: (s) => s.maxHigh >= 30,
    items: [
      ['light-clothes', 'Light, breathable clothes'],
      ['water-bottle', 'Refillable water bottle'],
    ],
    reason: (s, u) => `Highs of ${temp(s.maxHigh, u)}`,
  },
  {
    id: 'sun',
    // UV 6+ is "high" on the WHO scale. Without UV data (climate), assume strong sun when it's hot.
    when: (s) => (s.maxUv != null ? s.maxUv >= 6 : s.maxHigh >= 28),
    items: [
      ['sunscreen', 'Sunscreen (SPF 30+)'],
      ['sunglasses', 'Sunglasses'],
      ['sun-hat', 'Sun hat or cap'],
    ],
    reason: (s) => (s.maxUv != null ? `UV index up to ${Math.round(s.maxUv)} (high)` : 'Hot and sunny for the time of year'),
  },
  {
    id: 'wind',
    when: (s) => s.maxWind >= 40,
    items: [['windbreaker', 'Windproof layer']],
    reason: (s) => `Gusty: winds up to ${Math.round(s.maxWind)} km/h`,
  },
]

/* Always on the list, whatever the weather. */
export function basics({ currencyCode } = {}) {
  return [
    ['passport', 'Passport (valid 6+ months) and visa'],
    ['yellow-fever', 'Yellow fever card'],
    ['tickets', 'Tickets and hotel booking (printed or offline)'],
    ['cash', currencyCode && currencyCode !== 'NGN' ? `Some cash in ${currencyCode}` : 'Some cash'],
    ['card', 'A card that works abroad'],
    ['charger', 'Phone charger and power bank'],
    ['adapter', 'Plug adapter'],
    ['medicine', 'Prescription medicine'],
    ['toiletries', 'Toiletries'],
  ].map(([id, label]) => ({ id, label, group: 'Essentials', reason: null }))
}

/**
 * The generated list: essentials plus every rule that applies.
 * Returns [{ id, label, group, reason }].
 */
export function buildPackingList(summary, { units = 'c', currencyCode } = {}) {
  const items = basics({ currencyCode })
  if (!summary) return items
  for (const rule of RULES) {
    if (!rule.when(summary)) continue
    const reason = rule.reason(summary, units)
    for (const [id, label] of rule.items) items.push({ id, label, group: 'For the weather', reason })
  }
  return items
}

// ---------- 3. Your changes ----------

export const EMPTY_PACKING = { checked: {}, removed: [], custom: [] }

/** Generated items minus the ones you removed, plus your own, each with a `checked` flag. */
export function mergePacking(generated, saved = EMPTY_PACKING) {
  const s = normalisePacking(saved)
  const removed = new Set(s.removed)
  const auto = generated.filter((item) => !removed.has(item.id))
  const own = s.custom.map((c) => ({ id: c.id, label: c.label, group: 'Your items', reason: null, custom: true }))
  return [...auto, ...own].map((item) => ({ ...item, checked: Boolean(s.checked[item.id]) }))
}

export function toggleItem(saved, id) {
  const s = normalisePacking(saved)
  const checked = { ...s.checked }
  if (checked[id]) delete checked[id]
  else checked[id] = true
  return { ...s, checked }
}

export function removeItem(saved, id) {
  const s = normalisePacking(saved)
  const checked = { ...s.checked }
  delete checked[id]
  if (s.custom.some((c) => c.id === id)) return { ...s, checked, custom: s.custom.filter((c) => c.id !== id) }
  return { ...s, checked, removed: [...new Set([...s.removed, id])] }
}

export function addCustomItem(saved, label) {
  const s = normalisePacking(saved)
  const clean = label.trim().slice(0, 80)
  if (!clean) return s
  return { ...s, custom: [...s.custom, { id: `own-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, label: clean }] }
}

export function restoreRemoved(saved) {
  return { ...normalisePacking(saved), removed: [] }
}

/** Saved data comes from localStorage, so never trust its shape. */
export function normalisePacking(saved) {
  return {
    checked: saved?.checked && typeof saved.checked === 'object' ? saved.checked : {},
    removed: Array.isArray(saved?.removed) ? saved.removed : [],
    custom: Array.isArray(saved?.custom) ? saved.custom.filter((c) => c && c.id && c.label) : [],
  }
}
