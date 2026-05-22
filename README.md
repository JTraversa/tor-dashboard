# Tor Usage Dashboard

A dashboard for visualizing historic Tor relay user statistics over time, broken down by country.

## Features

- **Global trends** — View worldwide Tor relay usage over time
- **Per-country breakdown** — Select any country to see localized usage patterns
- **Historic data** — Complete historical dataset from Tor Metrics
- **Interactive charts** — Smooth, lightweight-charts powered visualizations

## Data Source

Data is sourced from [Tor Metrics](https://metrics.torproject.org/userstats-relay-country.html), available under CC0 1.0 Universal.

## Setup

```bash
npm install
npm run collect  # Fetch and process latest Tor metrics data
npm run dev      # Start development server
```

## Scripts

- `npm run dev` — Start Vite development server (http://localhost:5173)
- `npm run build` — Build for production
- `npm run collect` — Fetch latest Tor metrics CSV and generate JSON files
- `npm run lint` — Run ESLint

## Data Structure

Data is stored in `public/data/`:

- `data/relay/global.json` — Aggregated global user counts
- `data/relay/{country}.json` — Per-country user counts (e.g., `us.json`, `cn.json`)
- `data/meta.json` — Metadata (country list, last updated timestamp)

Each data file contains an array of objects:

```json
[
  { "date": "2015-01-01", "users": 500000 },
  { "date": "2015-01-02", "users": 512000 },
  ...
]
```

## Development

The app is built with React + Vite and uses [lightweight-charts](https://tradingview.github.io/lightweight-charts/) for charting.

## License

This project is MIT licensed. Tor metrics data is available under CC0 1.0 Universal.
