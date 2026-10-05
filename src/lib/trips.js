import { convert } from './api/rates.js'
import { datesBetween, EMPTY_PACKING, normalisePacking } from './packing.js'
import { formatDateRange, formatDayLong, formatLocalMoney, formatMoney } from './format.js'

/*
  Trips as plain data plus pure functions that return a NEW trip (never
  mutate). Components call these and hand the result to TripsContext,
  which saves it to localStorage.

  A trip keeps a snapshot of its place (name, coordinates, timezone,
  currency), so My trips and the planner work without any network.

  Shape:
  {
    id, name, createdAt, updatedAt,
    place: { id, name, label, country, countryCode, timezone, lat, lon },
    currency: { code, name, symbol } | null,
    startDate: '2026-10-12', endDate: '2026-10-16',
    days: { '2026-10-12': [ { id, title, time, notes, cost } ] },
    packing: { checked, removed, custom },
  }
*/

export const MAX_TRIP_DAYS = 30

const newId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

/** null if the dates are fine, otherwise a message to show next to the form. */
export function validateDates(startDate, endDate) {
  if (!startDate || !endDate) return 'Choose a start and an end date.'
  if (endDate < startDate) return 'The trip has to end on or after the day it starts.'
  if (datesBetween(startDate, endDate).length > MAX_TRIP_DAYS) return `Trips can be up to ${MAX_TRIP_DAYS} days long.`
  return null
}

export function createTrip({ place, currency, startDate, endDate, name }) {
  const now = Date.now()
  return {
    id: newId('trip'),
    name: name?.trim() || `${place.name} trip`,
    createdAt: now,
    updatedAt: now,
    place: {
      id: place.id,
      name: place.name,
      label: place.label,
      country: place.country,
      countryCode: place.countryCode,
      timezone: place.timezone,
      lat: place.lat,
      lon: place.lon,
    },
    currency: currency ? { code: currency.code, name: currency.name, symbol: currency.symbol } : null,
    startDate,
    endDate,
    days: {},
    packing: EMPTY_PACKING,
  }
}

const touch = (trip, changes) => ({ ...trip, ...changes, updatedAt: Date.now() })

export const tripDates = (trip) => datesBetween(trip.startDate, trip.endDate)
export const nights = (trip) => Math.max(tripDates(trip).length - 1, 0)
export const activitiesOn = (trip, date) => trip.days?.[date] ?? []

/** Clean up what a person typed into the activity form. */
export function cleanActivity({ title, time, notes, cost }) {
  const amount = cost === '' || cost == null ? null : Number(String(cost).replace(/,/g, ''))
  return {
    title: String(title ?? '').trim().slice(0, 80),
    time: /^\d{2}:\d{2}$/.test(time ?? '') ? time : '',
    notes: String(notes ?? '').trim().slice(0, 500),
    cost: Number.isFinite(amount) && amount >= 0 ? amount : null,
  }
}

export function addActivity(trip, date, fields) {
  const activity = { id: newId('act'), ...cleanActivity(fields) }
  if (!activity.title) return trip
  return touch(trip, { days: { ...trip.days, [date]: [...activitiesOn(trip, date), activity] } })
}

export function updateActivity(trip, date, id, fields) {
  const clean = cleanActivity(fields)
  if (!clean.title) return trip
  return touch(trip, { days: { ...trip.days, [date]: activitiesOn(trip, date).map((a) => (a.id === id ? { ...a, ...clean } : a)) } })
}

export function removeActivity(trip, date, id) {
  return touch(trip, { days: { ...trip.days, [date]: activitiesOn(trip, date).filter((a) => a.id !== id) } })
}

/** Swap an activity with its neighbour: direction -1 = up, +1 = down. No-op at the ends. */
export function moveActivity(trip, date, id, direction) {
  const list = [...activitiesOn(trip, date)]
  const from = list.findIndex((a) => a.id === id)
  const to = from + direction
  if (from < 0 || to < 0 || to >= list.length) return trip
  ;[list[from], list[to]] = [list[to], list[from]]
  return touch(trip, { days: { ...trip.days, [date]: list } })
}

/** How many activities would be lost if the trip were changed to these dates. */
export function activitiesOutside(trip, startDate, endDate) {
  return Object.entries(trip.days ?? {})
    .filter(([date]) => date < startDate || date > endDate)
    .reduce((n, [, list]) => n + list.length, 0)
}

/** New dates; activities on days that are no longer in the trip are dropped. */
export function setDates(trip, startDate, endDate) {
  const days = Object.fromEntries(Object.entries(trip.days ?? {}).filter(([date]) => date >= startDate && date <= endDate))
  return touch(trip, { startDate, endDate, days })
}

export const renameTrip = (trip, name) => touch(trip, { name: name.trim().slice(0, 60) || trip.name })
export const setPacking = (trip, packing) => touch(trip, { packing: normalisePacking(packing) })

/** Sum of estimated costs, in the trip's local currency. */
export function dayTotal(trip, date) {
  return activitiesOn(trip, date).reduce((sum, a) => sum + (a.cost ?? 0), 0)
}
export function tripTotal(trip) {
  return tripDates(trip).reduce((sum, date) => sum + dayTotal(trip, date), 0)
}
export function activityCount(trip) {
  return tripDates(trip).reduce((n, date) => n + activitiesOn(trip, date).length, 0)
}

/** "upcoming" | "ongoing" | "past", compared with today's date in Lagos. */
export function tripStatus(trip, today = lagosToday()) {
  if (today < trip.startDate) return 'upcoming'
  if (today > trip.endDate) return 'past'
  return 'ongoing'
}

/** Whole days from today (Lagos) until the trip starts. */
export function daysUntil(trip, today = lagosToday()) {
  return (Date.parse(`${trip.startDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000
}

/** Today's date in Lagos as "2026-10-05" (en-CA formats dates as YYYY-MM-DD). */
export function lagosToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date())
}

/** Upcoming and ongoing trips first (soonest first), then past trips (most recent first). */
export function sortTrips(trips) {
  const today = lagosToday()
  return [...trips].sort((a, b) => {
    const pa = tripStatus(a, today) === 'past'
    const pb = tripStatus(b, today) === 'past'
    if (pa !== pb) return pa ? 1 : -1
    return pa ? b.startDate.localeCompare(a.startDate) : a.startDate.localeCompare(b.startDate)
  })
}

/*
  A summary to paste into WhatsApp. WhatsApp turns *text* into bold, so
  headings use that; everything else is plain text that reads fine
  anywhere else too.
*/
export function toShareText(trip, rates) {
  const code = trip.currency?.code
  const money = (amount) => {
    const local = formatLocalMoney(amount, code)
    if (!code || code === 'NGN') return local
    const naira = convert(amount, code, 'NGN', rates)
    return naira == null ? local : `${local} (≈ ${formatMoney(naira, 'NGN')})`
  }

  const n = nights(trip)
  const lines = [
    `*✈️ ${trip.name}*`,
    `Lagos → ${trip.place.label}`,
    `${formatDateRange(trip.startDate, trip.endDate)} · ${n} ${n === 1 ? 'night' : 'nights'}`,
  ]
  tripDates(trip).forEach((date, i) => {
    const list = activitiesOn(trip, date)
    lines.push('', `*Day ${i + 1} · ${formatDayLong(date)}*`)
    if (!list.length) lines.push('Free day')
    list.forEach((a) => {
      const parts = [a.time, a.title].filter(Boolean).join(' ')
      lines.push(`• ${parts}${a.cost ? ` — ${formatLocalMoney(a.cost, code)}` : ''}`)
      if (a.notes) lines.push(`   ${a.notes}`)
    })
  })
  const total = tripTotal(trip)
  if (total > 0) lines.push('', `*Estimated cost:* ${money(total)}`)
  lines.push('', 'Planned with Passport')
  return lines.join('\n')
}

/** Saved trips come from localStorage: keep only ones with the fields we rely on. */
export function normaliseTrips(raw) {
  if (!Array.isArray(raw)) return []
  return raw.filter((t) => t && t.id && t.place?.name && /^\d{4}-\d{2}-\d{2}$/.test(t.startDate ?? '') && /^\d{4}-\d{2}-\d{2}$/.test(t.endDate ?? ''))
    .map((t) => ({ ...t, days: t.days && typeof t.days === 'object' ? t.days : {}, packing: normalisePacking(t.packing) }))
}
