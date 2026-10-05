import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/*
  A map centred on the city, using Leaflet with OpenStreetMap tiles.

  Why not Google Maps? It needs an API key tied to a billing account with
  a card, charges per map load past a free allowance, and its terms limit
  how you mix it with other data. Leaflet is a free, open-source library
  and OSM tiles need no key. In return we follow the OSM tile policy:
  credit "© OpenStreetMap contributors" and only load tiles for normal
  viewing (no bulk downloading).

  Why plain Leaflet instead of react-leaflet? It's one more library, and
  the React part is small: create the map in an effect, destroy it in the
  cleanup. Leaflet owns everything inside the <div>; React never touches it.

  This file is lazy-loaded (React.lazy in the page), so Leaflet's ~40 KB
  only downloads when a destination page opens.
*/
export default function PlaceMap({ lat, lon, name }) {
  const el = useRef(null)
  const mapRef = useRef(null)
  const [tilesFailed, setTilesFailed] = useState(false)

  useEffect(() => {
    const map = L.map(el.current, {
      center: [lat, lon],
      zoom: 11,
      scrollWheelZoom: false, // don't hijack page scrolling; use +/− or pinch
      attributionControl: true,
    })
    mapRef.current = map

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
    })
      .on('tileerror', () => setTilesFailed(true))
      .on('load', () => setTilesFailed(false))
      .addTo(map)

    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noreferrer">Leaflet</a>')

    /*
      A CSS pin (divIcon) instead of Leaflet's default marker image: the
      default icon's image paths break under bundlers like Vite, and a
      CSS pin can match our colours.
    */
    L.marker([lat, lon], {
      icon: L.divIcon({ className: '', html: '<div class="map-pin"></div>', iconSize: [26, 26], iconAnchor: [13, 26] }),
      title: name,
      alt: `Pin marking ${name}`,
      keyboard: false,
    }).addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [lat, lon, name])

  return (
    <div className="relative">
      <div
        ref={el}
        role="region"
        aria-label={`Map of ${name}. Use the arrow keys to pan and plus or minus to zoom.`}
        className="z-0 h-72 w-full overflow-hidden rounded-xl bg-panel-2"
      />
      {tilesFailed && (
        <div role="alert" className="absolute inset-x-3 bottom-8 z-[500] flex flex-wrap items-center gap-2 rounded-lg bg-panel p-3 text-sm shadow-pop">
          <span className="flex-1">Some map tiles didn’t load.</span>
          <button
            type="button"
            onClick={() => {
              setTilesFailed(false)
              mapRef.current?.eachLayer((layer) => layer.redraw?.())
            }}
            className="min-h-11 rounded-full bg-zobo px-4 font-bold text-on-zobo hover:bg-zobo-hover"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
