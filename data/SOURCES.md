# Data sources

## OpenStreetMap transit data (used by the app)
- File: `data/oak_park_transit.json`
- Retrieved: 2025 (sandbox download session)
- Source: OpenStreetMap contributors, via the Overpass API (https://overpass-api.de/api/interpreter)
- Query (route geometry): `relation["type"="route"]["route"~"bus|train|light_rail|subway"](41.86,-87.82,41.91,-87.76); out geom;`
- Query (stops): `node["highway"="bus_stop"]`, `node["railway"="station"]`, `node["railway"="halt"]`, `node["station"="subway"]` in the same box.
- Filter: stops and route segments kept only when inside the Oak Park box
  (lat 41.872–41.906, lon -87.812 to -87.762). Routes are kept if any segment is inside it, and the full segment list is kept for those routes, so some lines extend outside the box.
- Coordinates are as published in OSM; not independently verified against CTA/Pace/Metra data.

## Not used
- CTA GTFS static feed (https://www.transitchicago.com/downloads/sch_data/google_transit.zip): the download was refused for being over the 25 MiB limit. A future version could extract only the Oak Park stops from it.
- Live arrivals: not included. They need a CTA Train Tracker / Bus Tracker key, which should be added under Settings → Secrets.
