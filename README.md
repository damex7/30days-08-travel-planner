# Passport: a trip planner from Lagos

**Day 8 of my 30-day development challenge.** Search any city and get one page with everything a Nigerian traveller needs to decide and plan:

- the week's weather
- prices in Naira
- the time difference from Lagos
- country facts
- a packing list built from the actual forecast

Then you can plan the trip day by day.

The learning focus for today is **combining several APIs**: one request that has to finish first, a group of requests that run in parallel, and keeping the page useful when one of them fails.

## What it does

- **Explore:** search any city with suggestions as you type, see your recent searches, or pick a popular trip from Lagos (Accra, Nairobi, Dubai, London, Cape Town, Johannesburg).
- **Destination page** (`/place/:id`):
  - Wikipedia summary and photo
  - 7-day forecast
  - typical weather for each month
  - local time and difference from Lagos (WAT)
  - the exchange rate both ways, with a Naira converter
  - languages, calling code, driving side and flag
  - a map
  - a packing list for this week
- **Packing list:** generated from the forecast with clear rules (rain → umbrella, below 15 °C → jacket, UV 6+ → sunscreen, plus essentials). You can tick, add and remove items.
- **Trip planner** (`/trips/:id`):
  - pick dates, then add activities to each day (title, time, notes, estimated cost in the local currency)
  - reorder activities with up/down buttons
  - see the total in the local currency and in Naira
  - each trip has its own packing list, using typical weather if the trip is more than a week away
- **My trips** (`/trips`): every saved trip, **Export JSON**, and **Copy as text** for WhatsApp.
- **°C / °F** and the destination live in the URL (`/place/2306104?units=f`), so a link opens exactly what you saw.
- **Light and dark mode.** It follows your system setting until you choose one. The map has a dark version too.

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
npm run preview   # serve the build locally
```

No API keys or `.env` file needed. To deploy on Vercel, import the repo; `vercel.json` rewrites every path to `index.html`, so refreshing `/trips/…` or `/place/…` works.

**Stack:** Vite, React 19, react-router-dom 7, Tailwind CSS v4 (via `@tailwindcss/vite`, with design tokens in an `@theme` block in `src/index.css`), and Leaflet. There are no other libraries: no React Query, Axios or date library. Dates, time zones and money all use the browser's built-in `Intl` API.

## The APIs, and why each one

All of them are free and need no key.

| API | What we use it for | Cached for | Credit required |
|---|---|---|---|
| [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) | City search; coordinates, country code, timezone. Each place has a stable GeoNames id, which goes in the URL. | 1 day | Yes (CC BY 4.0) |
| [Open-Meteo Forecast](https://open-meteo.com/en/docs) | 7-day highs, lows, rain chance, UV and wind | 15 min | Yes |
| [Open-Meteo Historical (ERA5)](https://open-meteo.com/en/docs/historical-weather-api) | "Typical year": monthly averages over the last 3 full years | 1 day | Yes |
| [world-countries](https://github.com/mledoze/countries) on jsDelivr | Currency, languages, capital, calling code | 1 day | Yes (ODbL) |
| [open.er-api.com](https://www.exchangerate-api.com/docs/free) | Every exchange rate against NGN, in one request | 1 hour | Yes, an attribution link |
| [Wikipedia REST: page summary](https://en.wikipedia.org/api/rest_v1/) | A short description and a photo of the city | 1 day | Yes (CC BY-SA 4.0) |
| [OpenStreetMap tiles](https://operations.osmfoundation.org/policies/tiles/) + [Leaflet](https://leafletjs.com) | The map | browser cache | Yes |
| [flagcdn.com](https://flagcdn.com) | Flag images | browser cache | No |

Each source is credited where its data appears, and again in the footer.

A few notes on these choices:

- **REST Countries was the plan, but its keyless v3.1 API was shut down in 2026.** It now answers "This API version has been deprecated", and v5 needs an API key. REST Countries was built on the open mledoze/countries dataset, so the app reads that same data, published as `world-countries`, from jsDelivr instead.
  - It's one file for all countries (~148 KB gzipped). The browser caches it for 7 days, and we store only the one country we need.
  - That dataset has no driving side, so `src/lib/drivingSide.js` lists the countries that drive on the left.
- **I checked that the rates API includes NGN before relying on it:** 1 EUR ≈ ₦1,526 when this was built. The rate shown is the mid-market rate. Banks and bureaux de change give less, and the app says so.
- **Flags are images, not emoji:** Windows shows 🇬🇭 as the letters "GH".
- **Wikipedia asks apps to identify themselves.** Browsers don't let a page set `User-Agent`, so we send `Api-User-Agent`, which Wikipedia's API allows from the browser.

### Why Leaflet and not Google Maps?

- **Google Maps** needs an API key tied to a billing account with a card. It charges per map load after a free allowance, and its terms restrict mixing it with other data.
- **Leaflet** is a free, open-source library, and OpenStreetMap tiles need no key. In return we follow the [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/): credit the contributors, and only load tiles for normal viewing.
- **I used plain Leaflet instead of react-leaflet** because the React part is tiny: create the map in an effect and remove it in the cleanup.
- **Leaflet is lazy-loaded,** so its code only downloads when a destination page opens.
- **The pin is CSS, not Leaflet's default marker image,** because the default marker's image paths break under Vite.
- **In dark mode only the tile layer is inverted** with a CSS filter, because OSM doesn't serve dark tiles.

## The order requests run in

```
/place/:id
      │
      ▼
 ① geocoding  /v1/get?id=…        WATERFALL: nothing else can start until
      │                            we know where the place is
      │  → name, lat/lon, country code, timezone
      │
      ├──► ②a forecast       (lat, lon)         ┐
      ├──► ②b typical year   (lat, lon)         │ PARALLEL: all five start at
      ├──► ②c country        (country code)     │ the same moment. Each section
      ├──► ②d rates          (base NGN)         │ shows as soon as its own answer
      └──► ②e Wikipedia      (name, region)     ┘ arrives.

 Without any request: time difference (Intl), packing list (from ②a)
```

- **Waterfall vs parallel.**
  - In a **waterfall**, each request waits for the one before it, so the waits add up: five requests of ~400 ms take about 2 s.
  - In **parallel**, independent requests start together, and the page waits only as long as the slowest one (~400 ms).
  - Only step ① has to be a waterfall step, because every later request needs something it returns.
- **One choice removes a dependency.** Rates would normally need the country's currency code, which would make a second waterfall step. Asking for *all* rates against NGN means rates can run in parallel with the country lookup, and one cached answer serves every city.
- **Wikipedia has a small waterfall of its own.** Many place names are ambiguous ("Victoria" is a disambiguation page), so `wiki.js` tries `Name`, then `Name, Region`, then `Name, Country`, and stops at the first real article. Most cities stop at the first try.
- **Search is separate.** It is debounced by 300 ms and needs two letters. When a new term arrives, the previous request is aborted, so a slow answer for "Na" can't overwrite the answer for "Nairobi".

## How failures are handled

- **`request()`** (`src/lib/api/request.js`) is the only place the app calls `fetch`. It:
  - times out after 10 s;
  - retries once after a short pause when a failure looks temporary (dropped connection, timeout, 5xx, 429);
  - turns every failure into an `ApiError` with a kind (`offline`, `timeout`, `ratelimit`, `http`, `notfound`, `parse`) and a message that names the service, e.g. "Couldn't reach Wikipedia. Check your connection."
- **`Promise.allSettled`** collects the five parallel requests (`src/lib/destination.js`).
  - It never rejects: it reports each request as fulfilled or rejected.
  - `Promise.all` would reject as soon as *one* failed and throw away the four answers that worked.
  - When everything has settled, the page announces a summary to screen readers ("the city summary couldn't load").
- **Each section has its own state:**
  - **loading:** a skeleton shaped like the content
  - **error:** what went wrong, and a **Retry** that re-runs only that section's request
  - **empty:** for example no Wikipedia article, Nigeria itself ("Same currency as home", "Same time as Lagos"), or a currency with no rate
  - **content**
- **Sections that depend on others** use that request's state:
  - the packing list waits for the forecast, and its Retry re-runs the forecast;
  - Money needs both the country and the rates, says which one failed, and retries only that one.
- **If step ① fails,** there are no coordinates, so the page shows one page-level error with Retry, or "We couldn't find that place" for an unknown id. That's the cost of a waterfall step.
- **Trips are saved locally,** so the planner always opens. The network only adds extras:
  - If the rates fail, the local-currency total still shows and only the Naira line offers Retry.
  - The trip's weather uses `Promise.allSettled` over the forecast and typical year, so the packing list only fails if both do.

## Caching

Responses are cached in **sessionStorage** as `{ savedAt, ttl, data }`, with a different lifetime for each kind of data:

| Data | Lifetime | Why |
|---|---|---|
| Forecast | 15 minutes | Forecasts are updated through the day; this keeps it fresh without refetching on every visit |
| Exchange rates | 1 hour | The provider updates once a day; an hour respects their limits and is accurate enough for an estimate |
| Country facts, places, typical year, Wikipedia | 1 day | They hardly change |

- **Trim before caching.** Responses are reduced to what we use *before* they're stored: the country file is 1.4 MB raw, but we store ~1 KB, and three years of daily weather becomes 12 rows.
- **One request for duplicate callers.** If two parts of the page ask for the same URL at the same time, they share a single request.
- **Two cache layers.** The browser's own HTTP cache also helps; jsDelivr, for example, sends a 7-day `max-age`.
- **The caveat:** sessionStorage is cleared when the tab closes, so the lifetimes only matter in a tab that stays open for a long time.
- **What lives in localStorage:** trips, packing ticks, recent searches and the theme choice, because these must survive closing the browser.

## Where each concept lives

| Concept | File |
|---|---|
| Shared fetch: timeouts, retry, errors, TTL cache, shared requests | `src/lib/api/request.js` |
| One module and normaliser per API | `src/lib/api/geocoding.js`, `weather.js`, `countries.js`, `rates.js`, `wiki.js` |
| Waterfall then parallel requests, `Promise.allSettled` | `src/lib/destination.js` |
| Per-section state and Retry for one section | `src/hooks/useDestination.js` |
| Loading / error / empty / content for every section | `src/components/Section.jsx`, `src/components/States.jsx` |
| A section that combines two requests | `src/components/destination/MoneySection.jsx` |
| `allSettled` where either answer is enough | `src/pages/Trip.jsx` (`useTripData`) |
| Cancelling stale requests with AbortController | `src/hooks/useAsync.js` |
| Debounced search, accessible combobox | `src/hooks/useDebounce.js`, `src/components/CitySearch.jsx` |
| Packing rules as pure functions | `src/lib/packing.js` |
| Trip logic as pure functions, WhatsApp text | `src/lib/trips.js` |
| Time zones and the Lagos difference without a library | `src/lib/time.js` |
| Money, dates and temperatures with `Intl` | `src/lib/format.js` |
| Two-way currency converter | `src/components/CurrencyConverter.jsx` |
| Units in the URL | `src/hooks/useUnits.js` |
| Leaflet map, lazy-loaded, dark tiles | `src/components/PlaceMap.jsx`, `src/index.css` |
| Saved trips (localStorage) | `src/context/TripsContext.jsx`, `src/hooks/useLocalStorage.js` |
| Copy to clipboard with a fallback, JSON export | `src/lib/share.js` |
| Design tokens, light and dark | `src/index.css` |
| Theme without a flash | `index.html`, `src/hooks/useTheme.js` |
| SPA rewrite for Vercel | `vercel.json` |

## Accessibility

- Works down to 360 px wide with no sideways scrolling.
- Everything can be used with a keyboard, with a visible focus ring.
- Touch targets are at least 44 px.
- Text contrast is at least 4.5:1 in both themes.
- The search follows the ARIA combobox pattern.
- Loading, errors and results are announced through live regions.
- Activities are reordered with buttons rather than drag and drop.
- Images have meaningful alt text; decorative ones are hidden from screen readers.

## Known limits

- **Rainy-day counts can look high.** ERA5 reanalysis tends to over-count light drizzle in the tropics (Accra shows ~25 rainy days in October), so treat them as "how often it's damp", not "how often it pours".
- **Wikipedia can pick the wrong article.** It uses the place name, so a small town that shares its name with a famous city can show the famous city's article.
- **Data stays on one device.** Trips and packing ticks are saved in this browser only.

## Ideas for later (not built)

- Flight and hotel prices, and visa requirements for Nigerian passport holders
- Import trips from the exported JSON, and sync between devices
- A shareable read-only trip link
- Public holidays at the destination (e.g. the Nager.Date API)
- Plug and socket types per country, with a voltage warning
- Offline support with a service worker
- A tool to split costs between travellers

## Credits

- Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0)
- Places from [GeoNames](https://www.geonames.org/)
- Maps © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)
- City summaries from [Wikipedia](https://en.wikipedia.org/) (CC BY-SA 4.0)
- [Rates By Exchange Rate API](https://www.exchangerate-api.com)
- Country data from [mledoze/countries](https://github.com/mledoze/countries) (ODbL)
- Flags from [Flagpedia](https://flagcdn.com)
