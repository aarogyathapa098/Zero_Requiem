# Mars Weather Data Research — SOLBOUND

## Purpose

SOLBOUND's route recommendations need scientifically credible environmental context. This document records the sources investigated for Mars weather and environmental data, their actual availability, and the integration decision.

## Sources investigated

### 1. Perseverance MEDA (primary candidate)

- Organization: NASA / Mars 2020 mission, instrument MEDA.
- Official instrument page: https://science.nasa.gov/mission/mars-2020-perseverance/science-instruments/
- PDS archive: https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html
- Parameters: air temperature, ground temperature, pressure, wind speed/direction, relative humidity, radiation and dust.
- Geographic coverage: Perseverance rover location in Jezero Crater (point observations).
- Temporal coverage: mission start 2021-02-19 through ongoing releases (quarterly PDS releases, ~3 months delay).
- Data format: PDS4 CSV tables and derived products.
- Access: bulk download / PDS search; not a documented live JSON API.
- Update frequency: quarterly PDS releases; not real-time.
- Suitability: best scientific source for Jezero, but not a live feed. Suitable for historical/seasonal context and quarterly updates, not real-time route conditions.

Additional observed access path:

- Unofficial RSS-style JSON feed: `https://mars.nasa.gov/rss/api/?feed=weather&category=mars2020&feedtype=json`
- Returns the most recent ~7 sols with min/max air temperature, pressure, sunrise/sunset, season, solar longitude.
- No wind speed/direction in the observed response; missing values are encoded as `"--"`.
- Observed response in this project was stale (April 2024 sols) relative to the current date, so it must be treated as "latest available", not "current".
- CORS-accessible from the browser in testing; no API key required.
- Must be treated as an outreach feed, not an official API.

### 2. Curiosity REMS (secondary/context only)

- Instrument page: https://mars.nasa.gov/msl/mission/instruments/rems/
- Unofficial RSS-style JSON feed: `https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json`
- Parameters include air/ground temperature, pressure, humidity, wind, UV index, opacity.
- Geographic coverage: Gale Crater, not Jezero. Must never be presented as local Jezero weather.
- Useful for comparative/scientific context only.

### 3. InSight weather API (not suitable)

- Endpoint: `https://api.nasa.gov/insight_weather/`
- Status: mission ended December 2022; data frozen at sols 675-681. Historical only.
- Location: Elysium Planitia, not Jezero.
- Not suitable as a primary source for current Jezero conditions.

### 4. Spatial atmospheric models

- No verified, freely accessible, real-time spatial weather model for Jezero was identified in this phase.
- Mars mesoscale models exist in the literature but are not available through a simple public API.
- Without a spatial model, route-wide wind/temperature cannot be established from a single point observation.

## Integration decision

- Primary source: Perseverance MEDA, accessed through the unofficial RSS JSON feed for the latest available sols, plus PDS for deeper historical data.
- Fallback: terrain-only recommendation with explicit statement that weather was not included.
- InSight and REMS are not used as Jezero local weather.
- No API credentials are required for the RSS feed; if a protected source is added later, it must go through a backend.

## Freshness and spatial limitations

- The latest available MEDA observation is not necessarily current weather.
- Observations are point measurements at the rover location, not route-wide.
- No forecast capability is claimed.
- The UI labels observations as latest-available, stale, historical, or unavailable, and states that route-wide environmental exposure cannot be established.

## Outstanding work

- Verify update cadence of the MEDA RSS feed over time.
- Investigate PDS programmatic access for historical MEDA.
- Investigate Mars mesoscale model availability and spatial resolution.
- Add a backend proxy if a protected or higher-rate data source is adopted.
