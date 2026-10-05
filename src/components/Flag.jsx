import { useState } from 'react'
import { cx } from '../lib/cx.js'

/*
  A country flag image from flagcdn.com (free, no key). We don't use flag
  emoji because Windows doesn't draw them: 🇬🇭 shows up as "GH".
  If the image fails, the two-letter code is shown in a small box instead.
  Decorative by default (alt=""), since the country name is always next to it.
*/
export function Flag({ code, className = 'h-4 w-6', alt = '' }) {
  const [broken, setBroken] = useState(false)
  if (!code) return null
  const lower = code.toLowerCase()
  if (broken) {
    return (
      <span className={cx('inline-grid place-items-center rounded-sm bg-panel-2 font-mono text-[0.6rem] text-ink-soft', className)}>
        {code}
      </span>
    )
  }
  return (
    <img
      src={`https://flagcdn.com/w40/${lower}.png`}
      srcSet={`https://flagcdn.com/w80/${lower}.png 2x`}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
      className={cx('inline-block rounded-sm object-cover shadow-[0_0_0_1px_rgb(0_0_0/0.08)]', className)}
    />
  )
}
