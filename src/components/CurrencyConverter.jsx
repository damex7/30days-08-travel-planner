import { useId, useState } from 'react'
import { convert } from '../lib/api/rates.js'
import { formatMoney } from '../lib/format.js'
import { Icon } from './Icon.jsx'

const NAIRA_PRESETS = [10_000, 50_000, 100_000, 500_000]

/*
  Two linked boxes: type in either one and the other updates. We store
  only the number you typed and which side you typed it in; the other
  side is always calculated from it, so the two can never drift apart.
*/
export function CurrencyConverter({ currency, rates }) {
  const id = useId()
  const [input, setInput] = useState({ side: 'local', text: '50' })

  const typed = parseAmount(input.text)
  const local = input.side === 'local' ? typed : convert(typed, 'NGN', currency.code, rates)
  const naira = input.side === 'naira' ? typed : convert(typed, currency.code, 'NGN', rates)

  const show = (side, value) => (input.side === side ? input.text : value == null ? '' : roundForInput(value))

  return (
    <div className="rounded-xl border border-line p-4">
      <p className="font-mono text-[0.7rem] tracking-widest text-ink-faint uppercase">Converter</p>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <AmountField
          id={`${id}-local`}
          label={`${currency.name} (${currency.code})`}
          prefix={currency.symbol}
          value={show('local', local)}
          onChange={(text) => setInput({ side: 'local', text })}
        />
        <Icon name="swap" className="mb-3.5 size-5 text-ink-faint" />
        <AmountField
          id={`${id}-ngn`}
          label="Naira (NGN)"
          prefix="₦"
          value={show('naira', naira)}
          onChange={(text) => setInput({ side: 'naira', text })}
        />
      </div>
      <p className="mt-3 text-sm" aria-live="polite">
        {typed != null && local != null && naira != null ? (
          <>
            <span className="font-mono font-medium">{formatMoney(local, currency.code)}</span> ≈{' '}
            <span className="font-mono font-medium">{formatMoney(naira, 'NGN')}</span>
          </>
        ) : (
          <span className="text-ink-faint">Type an amount in either box.</span>
        )}
      </p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Quick Naira amounts">
        {NAIRA_PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setInput({ side: 'naira', text: String(n) })}
            className="min-h-11 rounded-full border border-line px-3 font-mono text-sm hover:border-zobo hover:bg-zobo-soft"
          >
            ₦{n >= 1000 ? `${n / 1000}k` : n}
          </button>
        ))}
      </div>
    </div>
  )
}

function AmountField({ id, label, prefix, value, onChange }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block truncate text-xs font-bold text-ink-soft">
        {label}
      </label>
      <div className="mt-1 flex min-h-12 items-center rounded-lg border-2 border-line-strong bg-panel focus-within:border-zobo">
        <span aria-hidden="true" className="max-w-12 truncate pl-2.5 font-mono text-sm text-ink-faint">
          {prefix}
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 bg-transparent px-2 py-2 font-mono text-lg outline-none"
        />
      </div>
    </div>
  )
}

/** "100,000" or "1 500.50" → 100000 / 1500.5; empty or junk → null */
function parseAmount(text) {
  const clean = String(text).replace(/[\s,]/g, '')
  if (!clean) return null
  const n = Number(clean)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function roundForInput(n) {
  return String(n >= 1000 ? Math.round(n) : Math.round(n * 100) / 100)
}
