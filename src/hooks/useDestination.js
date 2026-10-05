import { useCallback, useEffect, useRef, useState } from 'react'
import { getPlace } from '../lib/api/geocoding.js'
import { loadDestination, SECTION_LOADERS, SECTION_NAMES } from '../lib/destination.js'
import { useAsync } from './useAsync.js'

const LOADING = { status: 'loading', data: undefined, error: null }
const allLoading = () => Object.fromEntries(SECTION_NAMES.map((name) => [name, LOADING]))
const isAbort = (err) => err?.name === 'AbortError'

/*
  Everything the destination page needs, in two stages:

  ① place: getPlace(id), via useAsync. If this fails there are no
    coordinates, so nothing else can run: that's the price of a waterfall
    step, and the page shows one page-level error with Retry.

  ② sections: once the place is known, loadDestination() starts all five
    requests at once. Each section gets its own { status, data, error }
    as soon as ITS request settles, so a slow Wikipedia never holds up
    the forecast. `retry(name)` re-runs just that one section.

  `report` is filled in when Promise.allSettled says every section has
  finished: which ones failed. The page announces it to screen readers.
*/
export function useDestination(id) {
  const placeState = useAsync((signal) => getPlace(id, { signal }), [id])
  const place = placeState.status === 'success' ? placeState.data : null

  const [sections, setSections] = useState(allLoading)
  const [report, setReport] = useState(null)
  const retryControllers = useRef({})

  useEffect(() => {
    if (!place) return
    const controller = new AbortController()
    setSections(allLoading())
    setReport(null)

    loadDestination(place, {
      signal: controller.signal,
      onSettle: (name, result) => {
        if (controller.signal.aborted || isAbort(result.error)) return
        setSections((s) => ({ ...s, [name]: result }))
      },
    }).then(({ failed }) => {
      if (!controller.signal.aborted) setReport({ failed })
    })

    return () => controller.abort()
  }, [place])

  // Abort any in-progress retries when the page goes away
  useEffect(() => () => Object.values(retryControllers.current).forEach((c) => c.abort()), [])

  const retry = useCallback(
    (name) => {
      if (!place) return
      retryControllers.current[name]?.abort()
      const controller = new AbortController()
      retryControllers.current[name] = controller

      setSections((s) => ({ ...s, [name]: LOADING }))
      SECTION_LOADERS[name](place, { signal: controller.signal }).then(
        (data) => {
          if (controller.signal.aborted) return
          setSections((s) => ({ ...s, [name]: { status: 'success', data, error: null } }))
          setReport((r) => (r ? { failed: r.failed.filter((n) => n !== name) } : r))
        },
        (error) => {
          if (controller.signal.aborted || isAbort(error)) return
          setSections((s) => ({ ...s, [name]: { status: 'error', data: undefined, error } }))
        },
      )
    },
    [place],
  )

  return { placeState, place, sections, report, retry }
}
