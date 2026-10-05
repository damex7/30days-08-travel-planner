import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage.js'

const KEY = 'passport-recents'
const MAX = 6

/*
  Recently viewed places, newest first, kept in localStorage. We store the
  few fields a card needs (not the whole API answer), so the list still
  shows when you're offline.
*/
export function useRecents() {
  const [recents, setRecents] = useLocalStorage(KEY, [])

  const addRecent = useCallback(
    (place) => {
      const entry = { id: place.id, name: place.name, label: place.label, countryCode: place.countryCode, timezone: place.timezone }
      setRecents((list) => [entry, ...(Array.isArray(list) ? list : []).filter((p) => p.id !== place.id)].slice(0, MAX))
    },
    [setRecents],
  )

  const clearRecents = useCallback(() => setRecents([]), [setRecents])
  return { recents: Array.isArray(recents) ? recents : [], addRecent, clearRecents }
}
