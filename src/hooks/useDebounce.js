import { useEffect, useState } from 'react'

/*
  Returns `value`, but only after it has stopped changing for `delay` ms.
  Typing "Nairobi" fires one search for "Nairobi" instead of seven (N, Na,
  Nai...), which is kinder to the API and stops results flickering.
*/
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}
