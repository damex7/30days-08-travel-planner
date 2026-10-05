import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/*
  Temperature units live in the URL (?units=f), not in state or storage,
  so a shared link opens in the same units. °C is the default, so the
  parameter is left out entirely for °C and links stay short.

  Data is always fetched in °C and only converted for display (see
  format.js), so switching units never refetches or splits the cache.
*/
export function useUnits() {
  const [params, setParams] = useSearchParams()
  const units = params.get('units') === 'f' ? 'f' : 'c'

  const setUnits = useCallback(
    (next) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          if (next === 'f') p.set('units', 'f')
          else p.delete('units')
          return p
        },
        // replace: a unit switch shouldn't add a Back-button step
        { replace: true },
      )
    },
    [setParams],
  )

  return [units, setUnits]
}

/** Keep ?units=f when linking to another page, so the choice follows you around. */
export function useUnitsSearch() {
  const [units] = useUnits()
  return units === 'f' ? '?units=f' : ''
}
