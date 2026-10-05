import { useState } from 'react'
import { ActivityForm } from './ActivityForm.jsx'
import { Icon } from '../Icon.jsx'
import { activitiesOn, addActivity, dayTotal, moveActivity, removeActivity, updateActivity } from '../../lib/trips.js'
import { formatDayLong, formatLocalMoney } from '../../lib/format.js'
import { cx } from '../../lib/cx.js'

/*
  One day of a trip: its activities in order, and a form to add more.
  Every change is a pure function from trips.js (addActivity,
  moveActivity...) whose result goes to `onChange`, which saves the trip.

  Reordering uses Up/Down buttons rather than drag and drop: they work
  with a keyboard, a screen reader and a thumb. At the ends the button is
  aria-disabled instead of disabled, so focus stays on it after a move
  (a disabled button would drop focus back to the top of the page).
*/
export function DayPlan({ trip, date, index, currencyCode, onChange }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const list = activitiesOn(trip, date)
  const total = dayTotal(trip, date)
  const headingId = `day-${date}`

  return (
    <section aria-labelledby={headingId} className="pass overflow-hidden">
      <header className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4 pb-3">
        <h3 id={headingId} className="text-xl">
          <span className="mr-2 font-mono text-sm tracking-widest text-saffron-ink uppercase">Day {index + 1}</span>
          {formatDayLong(date)}
        </h3>
        {total > 0 && <span className="font-mono text-sm text-ink-soft">{formatLocalMoney(total, currencyCode)}</span>}
      </header>
      <div className="perforation" />

      <div className="px-5 py-3">
        {list.length === 0 && !adding && <p className="py-2 text-sm text-ink-faint">Nothing planned yet: a free day.</p>}

        <ol className="divide-y divide-line">
          {list.map((a, i) =>
            editing === a.id ? (
              <li key={a.id} className="py-3">
                <ActivityForm
                  initial={a}
                  currencyCode={currencyCode}
                  submitLabel="Save"
                  onSubmit={(values) => {
                    onChange(updateActivity(trip, date, a.id, values))
                    setEditing(null)
                  }}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={a.id} className="flex items-start gap-3 py-3">
                <span className="w-12 shrink-0 pt-0.5 font-mono text-sm text-ink-soft">{a.time || '–'}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold break-words">{a.title}</p>
                  {a.notes && <p className="text-sm break-words text-ink-soft">{a.notes}</p>}
                  {a.cost != null && a.cost > 0 && <p className="font-mono text-sm text-sage">{formatLocalMoney(a.cost, currencyCode)}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-0.5 max-[420px]:w-[5.5rem]">
                  <IconButton icon="up" label={`Move ${a.title} up`} disabled={i === 0} onClick={() => onChange(moveActivity(trip, date, a.id, -1))} />
                  <IconButton
                    icon="down"
                    label={`Move ${a.title} down`}
                    disabled={i === list.length - 1}
                    onClick={() => onChange(moveActivity(trip, date, a.id, 1))}
                  />
                  <IconButton icon="edit" label={`Edit ${a.title}`} onClick={() => setEditing(a.id)} />
                  <IconButton
                    icon="trash"
                    label={`Delete ${a.title}`}
                    danger
                    onClick={() => {
                      if (window.confirm(`Delete “${a.title}”?`)) onChange(removeActivity(trip, date, a.id))
                    }}
                  />
                </div>
              </li>
            ),
          )}
        </ol>

        {adding ? (
          <div className="pt-2">
            <ActivityForm currencyCode={currencyCode} onSubmit={(values) => onChange(addActivity(trip, date, values))} onCancel={() => setAdding(false)} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 font-bold text-zobo-ink hover:bg-zobo-soft"
          >
            <Icon name="plus" className="size-4" /> Add activity
          </button>
        )}
      </div>
    </section>
  )
}

function IconButton({ icon, label, onClick, disabled = false, danger = false }) {
  return (
    <button
      type="button"
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      className={cx(
        'grid size-11 place-items-center rounded-full',
        disabled ? 'cursor-not-allowed text-line-strong' : danger ? 'text-ink-faint hover:bg-danger-soft hover:text-danger' : 'text-ink-soft hover:bg-panel-2 hover:text-ink',
      )}
    >
      <Icon name={icon} className="size-4" />
      <span className="sr-only">{label}</span>
    </button>
  )
}
