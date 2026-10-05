import { useEffect, useState } from 'react'

/*
  The current time, updated at the start of every minute, for live clocks.
  Waiting until the minute turns over (rather than a plain 60 s interval)
  keeps the clock in step with the real one.
*/
export function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer
    const schedule = () => {
      timer = setTimeout(() => {
        setNow(new Date())
        schedule()
      }, 60_000 - (Date.now() % 60_000) + 50)
    }
    schedule()
    return () => clearTimeout(timer)
  }, [])
  return now
}
