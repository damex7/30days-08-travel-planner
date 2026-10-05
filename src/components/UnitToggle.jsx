import { useUnits } from '../hooks/useUnits.js'
import { cx } from '../lib/cx.js'

/*
  A two-option switch for °C / °F. It's a group of two toggle buttons
  (aria-pressed), so screen readers hear "°C, pressed".
*/
export function UnitToggle() {
  const [units, setUnits] = useUnits()
  return (
    <div role="group" aria-label="Temperature units" className="flex rounded-full bg-black/20 p-1">
      {[
        ['c', '°C'],
        ['f', '°F'],
      ].map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={units === value}
          onClick={() => setUnits(value)}
          className={cx(
            'min-h-9 min-w-11 rounded-full px-2 font-mono text-sm font-medium transition-colors',
            units === value ? 'bg-[#fff7ef] text-[#7a1638]' : 'text-[#fff7ef]/85 hover:bg-white/10',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
