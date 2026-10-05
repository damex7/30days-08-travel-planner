import { useId, useRef, useState } from 'react'

/*
  Add or edit one activity: a title (required), and optionally a time,
  notes and an estimated cost in the destination's currency.
*/
export function ActivityForm({ initial, currencyCode, submitLabel = 'Add activity', onSubmit, onCancel }) {
  const id = useId()
  const titleRef = useRef(null)
  const [values, setValues] = useState({
    title: initial?.title ?? '',
    time: initial?.time ?? '',
    notes: initial?.notes ?? '',
    cost: initial?.cost != null ? String(initial.cost) : '',
  })
  const [error, setError] = useState('')
  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }))

  function submit(e) {
    e.preventDefault()
    if (!values.title.trim()) {
      setError('Give the activity a name.')
      titleRef.current?.focus()
      return
    }
    if (values.cost && !(Number(values.cost.replace(/,/g, '')) >= 0)) {
      setError('The cost should be a number, like 1500.')
      return
    }
    onSubmit(values)
    if (!initial) {
      setValues({ title: '', time: '', notes: '', cost: '' })
      setError('')
      titleRef.current?.focus() // ready for the next one
    }
  }

  const field =
    'mt-1 min-h-11 w-full rounded-lg border-2 border-line-strong bg-panel px-3 text-ink focus:border-zobo focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus'

  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-xl bg-panel-2/60 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_8rem]">
        <div>
          <label htmlFor={`${id}-title`} className="text-sm font-bold">
            Activity
          </label>
          <input
            ref={titleRef}
            id={`${id}-title`}
            value={values.title}
            onChange={set('title')}
            maxLength={80}
            placeholder="e.g. Makola Market"
            aria-invalid={Boolean(error) && !values.title.trim()}
            aria-describedby={`${id}-err`}
            className={field}
          />
        </div>
        <div>
          <label htmlFor={`${id}-time`} className="text-sm font-bold">
            Time <span className="font-normal text-ink-faint">(optional)</span>
          </label>
          <input id={`${id}-time`} type="time" value={values.time} onChange={set('time')} className={`${field} font-mono`} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_10rem]">
        <div>
          <label htmlFor={`${id}-notes`} className="text-sm font-bold">
            Notes <span className="font-normal text-ink-faint">(optional)</span>
          </label>
          <input id={`${id}-notes`} value={values.notes} onChange={set('notes')} maxLength={500} placeholder="Address, booking ref…" className={field} />
        </div>
        <div>
          <label htmlFor={`${id}-cost`} className="text-sm font-bold">
            Cost in {currencyCode ?? 'local money'} <span className="font-normal text-ink-faint">(est.)</span>
          </label>
          <input id={`${id}-cost`} inputMode="decimal" value={values.cost} onChange={set('cost')} placeholder="0" className={`${field} font-mono`} />
        </div>
      </div>
      <p id={`${id}-err`} role={error ? 'alert' : undefined} className="text-sm font-bold text-danger empty:hidden">
        {error}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="min-h-11 rounded-full bg-zobo px-5 font-bold text-on-zobo hover:bg-zobo-hover">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="min-h-11 rounded-full px-4 font-bold text-ink-soft hover:bg-panel">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
