import { useCallback, useEffect, useState } from 'react'

export const THEME_KEY = 'passport-theme'

const media = () => window.matchMedia('(prefers-color-scheme: dark)')

/*
  The inline script in index.html already set data-theme before the first
  paint (saved choice, or the OS preference). We start from that, so React
  and the page agree.

  Until you press the toggle, nothing is saved and the app follows the OS
  (switch your laptop to dark at night and the page follows). Once you
  choose, your choice is remembered and wins.
*/
export function useTheme() {
  const [theme, setTheme] = useState(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#3a0f1f' : '#7a1638')
  }, [theme])

  // Follow OS changes only while there's no saved choice
  useEffect(() => {
    const mq = media()
    const onChange = (e) => {
      if (!readSaved()) setTheme(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(THEME_KEY, next)
      } catch {
        // Storage blocked (private mode): the toggle still works for this visit.
      }
      return next
    })
  }, [])

  return { theme, toggleTheme }
}

function readSaved() {
  try {
    return localStorage.getItem(THEME_KEY)
  } catch {
    return null
  }
}
