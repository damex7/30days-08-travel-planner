import { describeWeather } from '../lib/api/weather.js'

/*
  Weather icons drawn as inline SVG, one per group of WMO codes. They use
  fixed colours (a saffron sun, grey clouds, sage rain) so the meaning
  doesn't depend on the text colour, and each has an accessible label
  ("Light rain") unless the label is already printed next to it.
*/
const SUN = '#e2a12b'
const CLOUD = '#9a8f8a'
const CLOUD_DARK = '#6f6560'
const RAIN = '#4f8a6e'
const SNOW = '#8fb3c9'
const BOLT = '#e2a12b'

const cloud = (fill, dx = 0, dy = 0) => (
  <path
    transform={`translate(${dx} ${dy})`}
    d="M7.5 19h9a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 6.4 12.1 3.5 3.5 0 0 0 7.5 19Z"
    fill={fill}
  />
)
const sun = (r = 4, cx = 12, cy = 12, rays = true) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill={SUN} />
    {rays &&
      [0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line
          key={a}
          x1={cx}
          y1={cy - r - 2}
          x2={cx}
          y2={cy - r - 3.6}
          stroke={SUN}
          strokeWidth="1.6"
          strokeLinecap="round"
          transform={`rotate(${a} ${cx} ${cy})`}
        />
      ))}
  </g>
)
const drops = (color, n = 3, len = 2.6) => (
  <g stroke={color} strokeWidth="1.6" strokeLinecap="round">
    {Array.from({ length: n }, (_, i) => {
      const x = 8.5 + i * 3.5
      return <line key={i} x1={x} y1="20.5" x2={x - 1} y2={20.5 + len} />
    })}
  </g>
)

const ICONS = {
  clear: sun(4.5),
  partly: (
    <>
      {sun(3.6, 9, 8.5)}
      {cloud(CLOUD, 1.5, 2)}
    </>
  ),
  cloudy: (
    <>
      {cloud(CLOUD_DARK, 2, -2)}
      {cloud(CLOUD)}
    </>
  ),
  fog: (
    <g stroke={CLOUD} strokeWidth="1.8" strokeLinecap="round">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="6" y1="13" x2="18" y2="13" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </g>
  ),
  drizzle: (
    <>
      {cloud(CLOUD, 0, -3)}
      {drops(RAIN, 3, 1.4)}
    </>
  ),
  rain: (
    <>
      {cloud(CLOUD_DARK, 0, -3)}
      {drops(RAIN, 3, 3)}
    </>
  ),
  snow: (
    <>
      {cloud(CLOUD, 0, -3)}
      <g fill={SNOW}>
        <circle cx="8.5" cy="21" r="1.2" />
        <circle cx="12" cy="22.5" r="1.2" />
        <circle cx="15.5" cy="21" r="1.2" />
      </g>
    </>
  ),
  storm: (
    <>
      {cloud(CLOUD_DARK, 0, -3)}
      <path d="M12.5 16.5 10 20.5h3l-1.5 3.5" fill="none" stroke={BOLT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
}

export function WeatherIcon({ code, className = 'size-8', decorative = false }) {
  const { label, icon } = describeWeather(code)
  return (
    <svg
      viewBox="0 0 24 25"
      className={className}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
    >
      {ICONS[icon]}
    </svg>
  )
}
