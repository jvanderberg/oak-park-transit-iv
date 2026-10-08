import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet';

type Mode = 'subway' | 'train' | 'bus' | 'light_rail';

interface Route {
  id: number;
  mode: Mode | string;
  ref: string;
  name: string;
  from: string;
  to: string;
  color: string;
  segments: LatLngTuple[][];
}

interface Stop {
  id: number;
  lat: number;
  lon: number;
  name: string;
  kind: 'rail' | 'bus';
}

interface TransitData {
  source: string;
  bbox: { s: number; n: number; w: number; e: number };
  stops: Stop[];
  routes: Route[];
}

// Visual checkbox drawn from React state; the real input stays visually hidden for keyboard and screen readers.
function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
        checked ? 'border-sky-600 bg-sky-600' : 'border-slate-400 bg-white dark:border-slate-500 dark:bg-slate-900'
      }`}
    >
      {checked && (
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5l3 3 7-7" />
        </svg>
      )}
    </span>
  );
}

const OAK_PARK_CENTER: LatLngTuple = [41.8886, -87.7845];
const OAK_PARK_BOUNDS: LatLngBoundsExpression = [
  [41.872, -87.812],
  [41.906, -87.762],
];

const MODE_LABEL: Record<string, string> = {
  subway: 'L (rail)',
  train: 'Metra',
  light_rail: 'Light rail',
  bus: 'Bus',
};

const DEFAULT_COLOR: Record<string, string> = {
  subway: '#0066b3',
  train: '#7a4f9c',
  light_rail: '#00a651',
  bus: '#d9730d',
};

// Named CTA/Metra line colours; OSM tags are used when present.
const LINE_COLOR: Record<string, string> = {
  Blue: '#00a1de',
  Green: '#009b3a',
  'UP-W': '#e27c1f',
};

function routeColor(r: Route): string {
  if (r.color) return r.color;
  if (LINE_COLOR[r.ref]) return LINE_COLOR[r.ref];
  return DEFAULT_COLOR[r.mode] ?? '#666666';
}

function routeKey(r: Route): string {
  return `${r.mode}:${r.ref}`;
}

function routeLabel(r: Route): string {
  if (r.mode === 'bus') return `Bus ${r.ref}`;
  if (r.ref) return `${MODE_LABEL[r.mode] ?? r.mode} ${r.ref}`;
  return r.name || MODE_LABEL[r.mode] || r.mode;
}

function FitBounds() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(OAK_PARK_BOUNDS, { padding: [16, 16] });
  }, [map]);
  return null;
}

export default function App() {
  const [data, setData] = useState<TransitData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showBus, setShowBus] = useState(true);
  const [showRail, setShowRail] = useState(true);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    fetch('data/oak_park_transit.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<TransitData>;
      })
      .then(setData)
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, []);

  const routeGroups = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, Route[]>();
    for (const r of data.routes) {
      const key = routeKey(r);
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return [...map.entries()]
      .map(([key, routes]) => ({ key, routes, label: routeLabel(routes[0]), mode: routes[0].mode }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [data]);

  const visibleRoutes = useMemo(
    () =>
      routeGroups.filter((g) => {
        if (hidden.has(g.key)) return false;
        if (g.mode === 'bus') return showBus;
        return showRail;
      }),
    [routeGroups, hidden, showBus, showRail],
  );

  const visibleStops = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.stops.filter((s) => {
      if (s.kind === 'rail' ? !showRail : !showBus) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, showBus, showRail, query]);

  const toggleRoute = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
      <MapContainer
        center={OAK_PARK_CENTER}
        zoom={14}
        className="absolute inset-0 z-0 h-full w-full"
        scrollWheelZoom
      >
        <FitBounds />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {data &&
          visibleRoutes.map((g) =>
            g.routes.flatMap((r) =>
              r.segments.map((seg, i) => (
                <Polyline
                  key={`${r.id}-${i}`}
                  positions={seg}
                  pathOptions={{ color: routeColor(r), weight: g.mode === 'bus' ? 4 : 6, opacity: 0.85 }}
                >
                  <Popup>
                    <strong>{g.label}</strong>
                    {r.from || r.to ? (
                      <div>
                        {r.from} → {r.to}
                      </div>
                    ) : null}
                  </Popup>
                </Polyline>
              )),
            ),
          )}
        {visibleStops.map((s) => (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lon]}
            radius={s.kind === 'rail' ? 7 : 4}
            pathOptions={{
              color: s.kind === 'rail' ? '#1f2937' : '#334155',
              weight: s.kind === 'rail' ? 2 : 1,
              fillColor: s.kind === 'rail' ? '#ffffff' : '#94a3b8',
              fillOpacity: 1,
            }}
          >
            <Popup>{s.name || (s.kind === 'rail' ? 'Rail station' : 'Bus stop')}</Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <section
        aria-label="Transit panel"
        className={`absolute bottom-0 left-0 right-0 z-[500] flex flex-col rounded-t-2xl bg-white/95 shadow-2xl backdrop-blur dark:bg-slate-800/95 sm:bottom-auto sm:left-3 sm:top-3 sm:w-80 sm:rounded-2xl ${
          panelOpen ? 'max-h-[55dvh] sm:max-h-[calc(100dvh-1.5rem)]' : 'max-h-none'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Oak Park Transit</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Bus and rail routes and stops</p>
          </div>
          <button
            type="button"
            onClick={() => setPanelOpen((o) => !o)}
            aria-expanded={panelOpen}
            aria-label={panelOpen ? 'Collapse panel' : 'Expand panel'}
            title={panelOpen ? 'Collapse panel' : 'Expand panel'}
            className="flex h-11 min-w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${panelOpen ? '' : 'rotate-180'}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </header>

        {panelOpen && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
            {loadError && (
              <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                Could not load transit data ({loadError}).
              </p>
            )}

            <fieldset className="flex gap-2">
              <legend className="sr-only">Show modes</legend>
              <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm text-slate-800 has-[:checked]:border-sky-600 has-[:checked]:bg-sky-50 dark:border-slate-600 dark:text-slate-100 dark:has-[:checked]:bg-sky-950">
                <input type="checkbox" checked={showRail} onChange={(e) => setShowRail(e.target.checked)} className="sr-only" />
                <CheckBox checked={showRail} />
                Rail
              </label>
              <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm text-slate-800 has-[:checked]:border-sky-600 has-[:checked]:bg-sky-50 dark:border-slate-600 dark:text-slate-100 dark:has-[:checked]:bg-sky-950">
                <input type="checkbox" checked={showBus} onChange={(e) => setShowBus(e.target.checked)} className="sr-only" />
                <CheckBox checked={showBus} />
                Bus
              </label>
            </fieldset>

            <div>
              <label htmlFor="stop-search" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Find a stop
              </label>
              <input
                id="stop-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Harlem, Lake, Austin"
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
              {data && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {visibleStops.length} stops shown{query ? ' matching search' : ''}
                </p>
              )}
            </div>

            <div>
              <h2 className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-200">Routes</h2>
              {!data && !loadError && <p className="text-sm text-slate-500">Loading…</p>}
              <ul className="flex flex-col gap-1">
                {routeGroups.map((g) => {
                  const on = !hidden.has(g.key) && (g.mode === 'bus' ? showBus : showRail);
                  const color = routeColor(g.routes[0]);
                  return (
                    <li key={g.key}>
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <input
                          type="checkbox"
                          checked={!hidden.has(g.key)}
                          onChange={() => toggleRoute(g.key)}
                          className="sr-only"
                        />
                        <CheckBox checked={!hidden.has(g.key)} />
                        <span aria-hidden="true" className="h-3 w-6 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                        <span className={`text-sm ${on ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>{g.label}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
