import { Link, NavLink, Outlet } from 'react-router-dom'
import { Icon } from './Icon.jsx'
import { ThemeToggle } from './ThemeToggle.jsx'
import { UnitToggle } from './UnitToggle.jsx'
import { useUnitsSearch } from '../hooks/useUnits.js'
import { cx } from '../lib/cx.js'

const NAV = [
  { to: '/', label: 'Explore', icon: 'globe', end: true },
  { to: '/trips', label: 'My trips', icon: 'suitcase' },
]

/*
  App shell: a zobo header band, the page, a footer that credits every data
  source (several of the APIs require it), and on phones a bottom tab bar.
*/
export function Layout() {
  const unitsSearch = useUnitsSearch()

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-panel px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <header className="route-band text-[#fff7ef]">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Link to={{ pathname: '/', search: unitsSearch }} className="flex items-center gap-2 rounded-md">
            <span className="grid size-9 place-items-center rounded-full bg-[#f2b84b] text-[#3a0f1f]">
              <Icon name="plane" className="size-5" />
            </span>
            <span className="font-display text-2xl leading-none">Passport</span>
          </Link>

          <nav aria-label="Main" className="ml-6 hidden md:block">
            <ul className="flex gap-1">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={{ pathname: item.to, search: unitsSearch }}
                    end={item.end}
                    className={({ isActive }) =>
                      cx(
                        'flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors',
                        isActive ? 'bg-[#fff7ef] text-[#7a1638]' : 'text-[#fff7ef]/85 hover:bg-white/10',
                      )
                    }
                  >
                    <Icon name={item.icon} className="size-4" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <UnitToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-12 outline-none">
        <Outlet />
      </main>

      <Footer />

      {/* Phone tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-[1000] border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-2">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={{ pathname: item.to, search: unitsSearch }}
                end={item.end}
                className={({ isActive }) =>
                  cx('flex flex-col items-center gap-0.5 py-2 text-xs font-bold', isActive ? 'text-zobo-ink' : 'text-ink-faint')
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={cx('rounded-full px-5 py-1', isActive && 'bg-zobo-soft')}>
                      <Icon name={item.icon} className="size-5" />
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

/*
  Attribution. Open-Meteo (CC BY 4.0), OpenStreetMap (ODbL), Wikipedia
  (CC BY-SA), the exchange-rate API's terms and the country dataset (ODbL)
  all ask to be credited. Sections also credit their own source in place.
*/
function Footer() {
  const link = 'underline decoration-line-strong underline-offset-2 hover:text-ink'
  return (
    <footer className="border-t border-line bg-panel/60 pb-24 md:pb-0">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-ink-faint">
        <p className="font-mono text-xs tracking-widest text-ink-soft uppercase">Data from</p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <li>
            <a className={link} href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Weather data by Open-Meteo.com
            </a>{' '}
            (CC BY 4.0)
          </li>
          <li>
            Places:{' '}
            <a className={link} href="https://www.geonames.org/" target="_blank" rel="noreferrer">
              GeoNames
            </a>{' '}
            via Open-Meteo
          </li>
          <li>
            Map ©{' '}
            <a className={link} href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              OpenStreetMap contributors
            </a>
          </li>
          <li>
            City summaries:{' '}
            <a className={link} href="https://en.wikipedia.org/" target="_blank" rel="noreferrer">
              Wikipedia
            </a>{' '}
            (CC BY-SA 4.0)
          </li>
          <li>
            <a className={link} href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">
              Rates By Exchange Rate API
            </a>
          </li>
          <li>
            Countries:{' '}
            <a className={link} href="https://github.com/mledoze/countries" target="_blank" rel="noreferrer">
              mledoze/countries
            </a>{' '}
            (ODbL), flags by{' '}
            <a className={link} href="https://flagcdn.com" target="_blank" rel="noreferrer">
              Flagpedia
            </a>
          </li>
        </ul>
      </div>
    </footer>
  )
}
