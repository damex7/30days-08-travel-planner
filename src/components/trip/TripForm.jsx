import { useId, useState } from 'react'
import { lagosToday, MAX_TRIP_DAYS, validateDates } from '../../lib/trips.js'
import { datesBetween } from '../../lib/packing.js'

/*
  Start and end dates (and, when creating, a name). Used both to create a
  trip from the destination page and to change a trip's dates. The
  validation message comes from trips.js, so the rule lives in one place.
*/
export function TripForm({ initial = {}, defaultName, submitLabel, onSubmit, onCancel, showName = true }) {
  const id = useId()
  const today = lagosToday()
  const [startDate, setStart] = useState(initial.startDate ?? today)
  const [endDate, setEnd] = useState(initial.endDate ?? addDays(initial.startDate ?? today, 4))
  const [name, setName] = useState(initial.name ?? '')
  const [touched, setTouched] = useState(false)

  const error = validateDates(startDate, endDate)
  const count = error ? 0 : datesBetween(startDate, endDate).length

  function submit(e) {
    e.preventDefault()
    setTouched(true)
    if (!error) onSubmit({ startDate, endDate, name })
  }

  const field =
    'mt-1 min-h-11 w-full rounded-lg border-2 border-line-strong bg-panel px-3 font-mono text-ink focus:border-zobo focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus'

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      {showName && (
        <div>
          <label htmlFor={`${id}-name`} className="text-sm font-bold">
            Trip name <span className="font-normal text-ink-faint">(optional)</span>
          </label>
          <input
            id={`${id}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder={defaultName}
            className={field.replace('font-mono ', '')}
          />
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
        <div>
          <label htmlFor={`${id}-start`} className="text-sm font-bold">
            First day
          </label>
          <input
            id={`${id}-start`}
            type="date"
            required
            value={startDate}
            onChange={(e) => {
              const next = e.target.value
              setStart(next)
              // Keep the end date sensible when the start jumps past it
              if (next && endDate < next) setEnd(next)
            }}
            className={field}
          />
        </div>
        <div>
          <label htmlFor={`${id}-end`} className="text-sm font-bold">
            Last day
          </label>
          <input
            id={`${id}-end`}
            type="date"
            required
            min={startDate}
            max={startDate ? addDays(startDate, MAX_TRIP_DAYS - 1) : undefined}
            value={endDate}
            onChange={(e) => setEnd(e.target.value)}
            aria-invalid={touched && Boolean(error)}
            aria-describedby={`${id}-msg`}
            className={field}
          />
        </div>
      </div>
      <p id={`${id}-msg`} aria-live="polite" className={touched && error ? 'text-sm font-bold text-danger' : 'text-sm text-ink-soft'}>
        {touched && error ? error : count ? `${count} ${count === 1 ? 'day' : 'days'}, ${count - 1} ${count - 1 === 1 ? 'night' : 'nights'}` : ''}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="min-h-11 rounded-full bg-zobo px-5 font-bold text-on-zobo hover:bg-zobo-hover">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="min-h-11 rounded-full px-4 font-bold text-ink-soft hover:bg-panel-2">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

function addDays(isoDate, n) {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
