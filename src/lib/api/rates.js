import { ApiError, HOUR, request } from './request.js'

/*
  Exchange rates from ExchangeRate-API's open endpoint (open.er-api.com).
  No key; their terms ask for an attribution link (in the money section
  and the footer) and say rates refresh once a day, so asking more than
  that only wastes their budget and can get us rate-limited.

  The design choice that matters: we ask for ALL rates with base NGN in
  one request. That means:
  - rates doesn't need to know the destination's currency first, so it
    doesn't have to wait for the country lookup: it runs IN PARALLEL with
    it instead of after it (one less waterfall step);
  - one cached response serves every destination you look at.

  Cached for an hour: fresh enough for a planning estimate, and well
  within the provider's "once a day" spirit.
*/
const URL_NGN = 'https://open.er-api.com/v6/latest/NGN'

export function getNairaRates({ signal } = {}) {
  return request(URL_NGN, { signal, ttl: HOUR, key: 'rates:NGN', source: 'The exchange-rate service', select: normaliseRates })
}

export function normaliseRates(json) {
  // This API reports its own failures with HTTP 200 and result: "error"
  if (json?.result !== 'success' || !json.rates) {
    throw new ApiError("The exchange-rate service didn't return rates.", { kind: 'parse', source: 'The exchange-rate service' })
  }
  return {
    base: 'NGN',
    rates: json.rates, // units of each currency per ₦1, e.g. { EUR: 0.000655, GHS: 0.0081, NGN: 1 }
    updatedAt: (json.time_last_update_unix ?? 0) * 1000,
  }
}

/** Is there a rate for this currency? */
export function hasRate(rates, code) {
  return Boolean(rates?.rates?.[code])
}

/**
 * Convert between any two currencies through the Naira base.
 * Returns null if either rate is missing.
 */
export function convert(amount, from, to, rates) {
  const r = rates?.rates
  if (!r?.[from] || !r?.[to] || !Number.isFinite(amount)) return null
  return (amount / r[from]) * r[to]
}

/** How many Naira one unit of `code` costs (e.g. 1 EUR ≈ ₦1,526.66). */
export function nairaPer(code, rates) {
  return convert(1, code, 'NGN', rates)
}
