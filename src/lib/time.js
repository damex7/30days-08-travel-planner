/*
  Time zones without a date library. The browser's Intl API already knows
  every zone and its daylight-saving rules; we just ask it.

  The trick: format a moment with timeZoneName: 'longOffset' and read the
  offset back ("GMT+03:00" for Nairobi, "GMT" for Accra).
*/
export const LAGOS = 'Africa/Lagos' // WAT, UTC+1 all year (Nigeria has no daylight saving)

/** Minutes ahead of UTC for `timeZone` at moment `date` (Nairobi → 180). */
export function offsetMinutes(timeZone, date = new Date()) {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(date)
      .find((p) => p.type === 'timeZoneName')?.value
    const m = /GMT([+-])(\d{2}):(\d{2})/.exec(part ?? '')
    if (!m) return 0 // plain "GMT"
    const mins = Number(m[2]) * 60 + Number(m[3])
    return m[1] === '-' ? -mins : mins
  } catch {
    return 0 // unknown zone name: treat as UTC rather than crash
  }
}

/** Minutes the place is ahead of Lagos (negative = behind). */
export function diffFromLagos(timeZone, date = new Date()) {
  return offsetMinutes(timeZone, date) - offsetMinutes(LAGOS, date)
}

/** "Same time as Lagos", "1 hr behind Lagos", "4 hrs 30 min ahead of Lagos". */
export function describeDiff(minutes) {
  if (minutes === 0) return 'Same time as Lagos'
  return `${durationText(Math.abs(minutes))} ${minutes > 0 ? 'ahead of' : 'behind'} Lagos`
}

/** Compact form for cards: "+3h", "−1h", "+4h30", "same". */
export function shortDiff(minutes) {
  if (minutes === 0) return 'same time'
  const sign = minutes > 0 ? '+' : '−'
  const h = Math.floor(Math.abs(minutes) / 60)
  const m = Math.abs(minutes) % 60
  return `${sign}${h}h${m ? String(m).padStart(2, '0') : ''}`
}

function durationText(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const hours = h ? `${h} ${h === 1 ? 'hr' : 'hrs'}` : ''
  return [hours, m ? `${m} min` : ''].filter(Boolean).join(' ')
}

/** "2:05 pm" in that zone. */
export function formatClock(timeZone, date = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-NG', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(date)
  } catch {
    return '—'
  }
}

/** "Monday, 5 October" in that zone (the local date can differ from Lagos's near midnight). */
export function formatLocalDate(timeZone, date = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'long', day: 'numeric', month: 'long' }).format(date)
  } catch {
    return ''
  }
}

/** "GMT+3" style label for the zone right now. */
export function offsetLabel(timeZone, date = new Date()) {
  const mins = offsetMinutes(timeZone, date)
  if (mins === 0) return 'GMT'
  const h = Math.floor(Math.abs(mins) / 60)
  const m = Math.abs(mins) % 60
  return `GMT${mins > 0 ? '+' : '−'}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`
}

/*
  Daylight saving: London is 0 hrs from Lagos in summer but 1 hr behind in
  winter. If the zone's offset in January differs from July, the gap to
  Lagos changes during the year, which is worth telling a traveller.
  Returns null when the zone doesn't change its clocks.
*/
export function seasonalNote(timeZone, now = new Date()) {
  const year = now.getUTCFullYear()
  const jan = diffFromLagos(timeZone, new Date(Date.UTC(year, 0, 15)))
  const jul = diffFromLagos(timeZone, new Date(Date.UTC(year, 6, 15)))
  if (jan === jul) return null
  const current = diffFromLagos(timeZone, now)
  const other = current === jan ? jul : jan
  const otherText = other === 0 ? 'the same time as Lagos' : describeDiff(other)
  return `Clocks change here during the year: at other times it's ${otherText}.`
}
