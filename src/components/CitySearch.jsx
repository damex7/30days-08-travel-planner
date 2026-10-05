import { useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchPlaces } from '../lib/api/geocoding.js'
import { useAsync } from '../hooks/useAsync.js'
import { useDebounce } from '../hooks/useDebounce.js'
import { useUnitsSearch } from '../hooks/useUnits.js'
import { Icon } from './Icon.jsx'
import { Flag } from './Flag.jsx'
import { cx } from '../lib/cx.js'

const MIN_CHARS = 2

/*
  City search with suggestions as you type, built as an ARIA combobox:
  - the input has role="combobox" and points at the list (aria-controls),
  - ↑/↓ move a "virtual" highlight (aria-activedescendant) while focus
    stays in the input, so you can keep typing,
  - Enter opens the highlighted place (or the first one), Esc closes the
    list, and a second Esc clears the text.

  Requests: the text is debounced (300 ms), searches need at least 2
  letters, and useAsync aborts the previous search when a new term
  arrives, so a slow answer for "Na" can never replace the answer for
  "Nairobi". Each term is cached for a day, so going back is instant.
*/
export function CitySearch({ autoFocus = false }) {
  const navigate = useNavigate()
  const unitsSearch = useUnitsSearch()
  const listId = useId()
  const inputRef = useRef(null)
  const wrapRef = useRef(null)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const term = useDebounce(query.trim(), 300)
  const enabled = term.length >= MIN_CHARS
  const search = useAsync(enabled ? (signal) => searchPlaces(term, { signal }) : null, [term])

  const results = enabled && search.status === 'success' ? search.data : []
  const typing = query.trim() !== term // the debounce hasn't caught up yet
  const showList = open && query.trim().length >= MIN_CHARS

  function choose(place) {
    setOpen(false)
    setQuery('')
    navigate({ pathname: `/place/${place.id}`, search: unitsSearch })
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      if (!results.length) return
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + step + results.length) % results.length)
    } else if (e.key === 'Enter') {
      if (search.status === 'error') {
        e.preventDefault()
        search.retry()
      } else if (showList && results.length && !typing) {
        e.preventDefault()
        choose(results[active >= 0 ? active : 0])
      }
    } else if (e.key === 'Escape') {
      if (open && query) setOpen(false)
      else setQuery('')
      setActive(-1)
    }
  }

  // Close only when focus leaves the whole widget (input, list and Retry button)
  function onBlur(e) {
    if (!wrapRef.current?.contains(e.relatedTarget)) setOpen(false)
  }

  const activeId = active >= 0 && results[active] ? `${listId}-${active}` : undefined
  const status = !showList
    ? ''
    : typing || search.status === 'loading'
      ? 'Searching…'
      : search.status === 'error'
        ? "Search failed."
        : results.length
          ? `${results.length} ${results.length === 1 ? 'place' : 'places'} found. Use the up and down arrows to choose.`
          : 'No places match.'

  return (
    <div ref={wrapRef} onBlur={onBlur} className="relative">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search for a city
      </label>
      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-faint" />
        <input
          ref={inputRef}
          id={`${listId}-input`}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          autoComplete="off"
          spellCheck="false"
          autoFocus={autoFocus}
          placeholder="Search a city: Accra, Nairobi, Dubai…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="min-h-14 w-full rounded-2xl border-2 border-line-strong bg-panel pr-12 pl-12 text-lg text-ink placeholder:text-ink-faint focus:border-zobo focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            className="absolute top-1/2 right-2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-ink-faint hover:bg-panel-2 hover:text-ink"
          >
            <Icon name="x" className="size-4" />
            <span className="sr-only">Clear search</span>
          </button>
        )}
      </div>

      {/* Announces result counts to screen readers without moving focus */}
      <p aria-live="polite" className="sr-only">
        {status}
      </p>

      {showList && (
        <div className="absolute inset-x-0 top-full z-[1100] mt-2 overflow-hidden rounded-2xl border border-line bg-panel shadow-pop">
          {typing || search.status === 'loading' ? (
            <div className="space-y-3 p-4" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-4 w-6 animate-shimmer rounded-sm bg-panel-2" />
                  <div className="h-3.5 animate-shimmer rounded bg-panel-2" style={{ width: `${60 - i * 12}%` }} />
                </div>
              ))}
            </div>
          ) : search.status === 'error' ? (
            <div className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <Icon name="alert" className="size-5 text-danger" />
              <span className="flex-1">{search.error?.message}</span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={search.retry}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-zobo px-4 font-bold text-on-zobo hover:bg-zobo-hover"
              >
                <Icon name="retry" className="size-4" /> Retry
              </button>
            </div>
          ) : results.length === 0 ? (
            <p className="p-4 text-sm text-ink-soft">
              No places match “{query.trim()}”. Check the spelling, or try a bigger city nearby.
            </p>
          ) : null}

          <ul id={listId} role="listbox" aria-label="Matching places" className={cx(!results.length || typing ? 'hidden' : 'py-1')}>
            {!typing &&
              results.map((place, i) => (
                <li
                  key={place.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  // mousedown would blur the input before the click lands
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(place)}
                  onMouseMove={() => setActive(i)}
                  className={cx('flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2', i === active && 'bg-zobo-soft')}
                >
                  <Flag code={place.countryCode} className="h-4 w-6 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{place.name}</span>
                    <span className="block truncate text-sm text-ink-soft">{[place.admin1, place.country].filter(Boolean).join(', ')}</span>
                  </span>
                  {place.population ? (
                    <span className="hidden font-mono text-xs text-ink-faint sm:block">{compactNumber(place.population)} people</span>
                  ) : null}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function compactNumber(n) {
  return new Intl.NumberFormat('en-NG', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}
