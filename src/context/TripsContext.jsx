import { createContext, useCallback, useContext, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { normaliseTrips, sortTrips } from '../lib/trips.js'

const TripsContext = createContext(null)
const KEY = 'passport-trips:v1'

/*
  All saved trips, in localStorage (no accounts, no backend). Every page
  reads trips from here, and every change goes through saveTrip /
  deleteTrip, so My trips and the planner always agree. useLocalStorage
  also listens for changes from other tabs.
*/
export function TripsProvider({ children }) {
  const [raw, setRaw] = useLocalStorage(KEY, [])
  const trips = useMemo(() => sortTrips(normaliseTrips(raw)), [raw])

  const saveTrip = useCallback(
    (trip) =>
      setRaw((list) => {
        const clean = normaliseTrips(list)
        return clean.some((t) => t.id === trip.id) ? clean.map((t) => (t.id === trip.id ? trip : t)) : [...clean, trip]
      }),
    [setRaw],
  )
  const deleteTrip = useCallback((id) => setRaw((list) => normaliseTrips(list).filter((t) => t.id !== id)), [setRaw])

  const value = useMemo(() => ({ trips, saveTrip, deleteTrip, getTrip: (id) => trips.find((t) => t.id === id) ?? null }), [trips, saveTrip, deleteTrip])
  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>
}

export function useTrips() {
  const ctx = useContext(TripsContext)
  if (!ctx) throw new Error('useTrips must be used inside <TripsProvider>')
  return ctx
}
