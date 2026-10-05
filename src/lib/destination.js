import { getForecast, getTypicalYear } from './api/weather.js'
import { getCountry } from './api/countries.js'
import { getNairaRates } from './api/rates.js'
import { getCitySummary } from './api/wiki.js'

/*
  How the destination page loads: one WATERFALL step, then a PARALLEL fan-out.

      ① getPlace(id)                 waterfall: nothing else can start
            │                         until we know where the place is
            ├──► forecast   (lat, lon)
            ├──► typical    (lat, lon)
            ├──► country    (country code)      parallel: none of these needs
            ├──► rates      (base NGN)          another's answer, so they all
            └──► wiki       (name, region)      start at the same moment

  Waterfall vs parallel: if these five ran one after another, the waits
  would add up (5 × ~400 ms ≈ 2 s). Started together, the page waits only
  as long as the slowest one (~400 ms).

  Each loader takes the place and an options object ({ signal }), so a
  single section can be re-run on its own (that's what Retry does).
*/
export const SECTION_LOADERS = {
  forecast: (place, opts) => getForecast(place, opts),
  typical: (place, opts) => getTypicalYear(place, opts),
  country: (place, opts) => getCountry(place.countryCode, opts),
  rates: (_place, opts) => getNairaRates(opts), // doesn't depend on the place at all: see rates.js
  wiki: (place, opts) => getCitySummary(place, opts),
}

export const SECTION_NAMES = Object.keys(SECTION_LOADERS)

/**
 * Start every section's request at once.
 *
 * - `onSettle(name, result)` fires as EACH request finishes, so a fast
 *   section (rates from cache) shows immediately instead of waiting for
 *   the slowest one.
 * - The returned promise uses Promise.allSettled, which waits for all of
 *   them and NEVER rejects: it reports each outcome as
 *   { status: 'fulfilled', value } or { status: 'rejected', reason }.
 *   Promise.all would reject as soon as ONE failed, throwing away the
 *   four answers that worked. That's the whole difference.
 */
export function loadDestination(place, { signal, onSettle } = {}) {
  const promises = SECTION_NAMES.map((name) =>
    SECTION_LOADERS[name](place, { signal }).then(
      (data) => {
        onSettle?.(name, { status: 'success', data, error: null })
        return data
      },
      (error) => {
        onSettle?.(name, { status: 'error', data: undefined, error })
        throw error // keep it a rejection, so allSettled records it as one
      },
    ),
  )

  return Promise.allSettled(promises).then((results) => {
    const failed = SECTION_NAMES.filter((_, i) => results[i].status === 'rejected')
    return { results: Object.fromEntries(SECTION_NAMES.map((name, i) => [name, results[i]])), failed }
  })
}
