import { useId, useState } from 'react'
import { addCustomItem, mergePacking, removeItem, restoreRemoved, toggleItem } from '../lib/packing.js'
import { Icon } from './Icon.jsx'
import { cx } from '../lib/cx.js'

const GROUP_ORDER = ['For the weather', 'Essentials', 'Your items']

/*
  Shows a packing list and lets you tick, remove and add items. It owns no
  data: `generated` comes from the rules in packing.js, `saved` (your
  ticks, removals and own items) comes from whoever stores it, and every
  change goes back through `onChange(nextSaved)`. The destination page
  stores it per city, a trip stores it inside the trip.
*/
export function PackingList({ generated, saved, onChange }) {
  const formId = useId()
  const [draft, setDraft] = useState('')
  const items = mergePacking(generated, saved)
  const packed = items.filter((i) => i.checked).length
  const removedCount = saved?.removed?.length ?? 0

  const groups = GROUP_ORDER.map((name) => [name, items.filter((i) => i.group === name)]).filter(([, list]) => list.length)

  function add(e) {
    e.preventDefault()
    if (!draft.trim()) return
    onChange(addCustomItem(saved, draft))
    setDraft('')
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-panel-2"
          role="progressbar"
          aria-label="Packed"
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={packed}
        >
          <div className="h-full rounded-full bg-sage transition-[width]" style={{ width: `${items.length ? (packed / items.length) * 100 : 0}%` }} />
        </div>
        <p className="font-mono text-sm text-ink-soft" aria-live="polite">
          {packed}/{items.length} packed
        </p>
      </div>

      <div className="mt-4 grid gap-x-8 gap-y-5 md:grid-cols-2">
        {groups.map(([name, list]) => (
          <fieldset key={name} className="min-w-0">
            <legend className="font-mono text-[0.7rem] tracking-widest text-ink-faint uppercase">{name}</legend>
            <ul className="mt-1.5 divide-y divide-line">
              {list.map((item) => (
                <li key={item.id} className="flex items-start gap-1">
                  <label className="flex min-h-11 flex-1 cursor-pointer items-start gap-3 py-2">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => onChange(toggleItem(saved, item.id))}
                      className="mt-0.5 size-5 shrink-0 accent-[var(--color-sage)]"
                    />
                    <span className="min-w-0">
                      <span className={cx('block font-semibold', item.checked && 'text-ink-faint line-through')}>{item.label}</span>
                      {item.reason && <span className="block text-xs text-ink-soft">{item.reason}</span>}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => onChange(removeItem(saved, item.id))}
                    className="grid size-11 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-danger-soft hover:text-danger"
                  >
                    <Icon name="x" className="size-4" />
                    <span className="sr-only">Remove {item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </fieldset>
        ))}
      </div>

      <form onSubmit={add} className="mt-4 flex flex-wrap gap-2">
        <label htmlFor={`${formId}-add`} className="sr-only">
          Add your own item
        </label>
        <input
          id={`${formId}-add`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={80}
          placeholder="Add your own item, e.g. Gifts for family"
          className="min-h-11 min-w-0 flex-1 rounded-full border-2 border-line-strong bg-panel px-4 focus:border-zobo focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
        <button type="submit" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-zobo px-4 font-bold text-on-zobo hover:bg-zobo-hover">
          <Icon name="plus" className="size-4" /> Add
        </button>
      </form>

      {removedCount > 0 && (
        <button
          type="button"
          onClick={() => onChange(restoreRemoved(saved))}
          className="mt-2 min-h-11 text-sm font-bold text-zobo-ink underline-offset-4 hover:underline"
        >
          Bring back {removedCount} removed {removedCount === 1 ? 'item' : 'items'}
        </button>
      )}
    </div>
  )
}
