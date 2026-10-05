/*
  Formatting helpers. All built on Intl, so no date or number library.
  Money uses the en-NG locale, which writes Naira as "₦".
*/

/** °C → the display string for the chosen units: "31°". */
export function formatTemp(celsius, units = 'c') {
  if (celsius == null || Number.isNaN(celsius)) return '–'
  const value = units === 'f' ? (celsius * 9) / 5 + 32 : celsius
  return `${Math.round(value)}°`
}

export const unitLabel = (units) => (units === 'f' ? '°F' : '°C')

/*
  Forecast dates are calendar dates in the destination's timezone
  ("2026-10-05"). Parsing "2026-10-05" with new Date() would treat it as
  UTC midnight, and then formatting in Lagos time could show the wrong
  day. So we pin it to noon UTC and format in UTC: the date never shifts.
*/
const noonUtc = (isoDate) => new Date(`${isoDate}T12:00:00Z`)

/** "Mon" */
export function weekdayShort(isoDate) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(noonUtc(isoDate))
}

/** "Monday 5 Oct" */
export function formatDayLong(isoDate) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(noonUtc(isoDate))
}

/** "5 Oct 2026" */
export function formatDate(isoDate) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(noonUtc(isoDate))
}

/** "5 – 12 Oct 2026" or "28 Oct – 3 Nov 2026" */
export function formatDateRange(start, end) {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).formatRange(noonUtc(start), noonUtc(end))
  } catch {
    return `${formatDate(start)} – ${formatDate(end)}`
  }
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/**
 * "₦76,333", "€50", "GH₵ 857.70". Whole amounts and anything over 1,000
 * show no decimals (nobody budgets ₦76,332.85); small fractional amounts
 * keep two.
 */
export function formatMoney(amount, currency, { decimals } = {}) {
  if (amount == null || !Number.isFinite(amount)) return '–'
  const digits = decimals ?? (Math.abs(amount) >= 1000 || Number.isInteger(amount) ? 0 : 2)
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount)
  } catch {
    // A currency code Intl doesn't know: still show something sensible
    return `${currency} ${formatNumber(amount, digits)}`
  }
}

/** Money in a trip's currency. A trip saved without a currency shows a plain number, never a wrong symbol. */
export function formatLocalMoney(amount, code) {
  return code ? formatMoney(amount, code) : `${formatNumber(amount, Number.isInteger(amount) ? 0 : 2)} (local)`
}

export function formatNumber(n, digits = 0) {
  return new Intl.NumberFormat('en-NG', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)
}

/** Enough significant digits to be useful for tiny rates: 0.000655 → "0.000655" */
export function formatRate(n) {
  if (n == null || !Number.isFinite(n)) return '–'
  if (n >= 100) return formatNumber(n, 2)
  return new Intl.NumberFormat('en-NG', { maximumSignificantDigits: 4 }).format(n)
}

/** "2 hours ago", "yesterday" */
export function timeAgo(ms) {
  const diff = ms - Date.now()
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const abs = Math.abs(diff)
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute')
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), 'hour')
  return rtf.format(Math.round(diff / 86_400_000), 'day')
}
