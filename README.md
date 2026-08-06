# Historical Tor Data

A dashboard for visualizing historical Tor relay user statistics over time, broken down by country.

## Features

- **Global trends** — View worldwide Tor relay usage over time
- **Per-country breakdown** — Select any country to see localized usage patterns
- **Historical data** — Complete historical dataset from Tor Metrics
- **Interactive charts** — Smooth, lightweight-charts powered visualizations
- **Half-yearly censorship notes** — 135 documented blocks and national
  shutdowns from the Tor Project's own event list, rolled up into at most one
  note per half-year on the worldwide chart, shown only where censorship
  visibly moved the numbers, and ranked by measured impact
- **Bridges by default** — people reach for bridges when direct access is
  blocked, so censorship shows up there first
- **Shutdowns, not just surges** — blocking Tor makes the count *fall*, so
  collapses are reported alongside the rises
- **Anomaly detection** — what is left once censorship is accounted for, which
  is largely botnets and metrics artifacts

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
- `npm run collect` — Fetch latest Tor metrics CSV, generate JSON files, recompute anomalies, rebuild the event timeline
- `npm run anomalies` — Recompute network-wide spike windows only
- `npm run timeline` — Rebuild `public/data/timeline.json` from the vendored Tor timeline only
- `npm run periods` — Rebuild the half-yearly censorship notes
- `npm run lint` — Run ESLint

## Data Structure

Data is stored in `public/data/`:

- `data/relay/global.json` — Aggregated global user counts
- `data/relay/{country}.json` — Per-country user counts (e.g., `us.json`, `cn.json`)
- `data/meta.json` — Metadata (country list, last updated timestamp)
- `data/timeline.json` — Tor Project event timeline (see below)
- `data/periods.json` — Half-yearly censorship notes for the worldwide chart
- `data/{type}/anomalies.json` — Network-wide spike windows

Each data file contains an array of objects:

```json
[
  { "date": "2015-01-01", "users": 500000 },
  { "date": "2015-01-02", "users": 512000 },
  ...
]
```

## Spike annotations

Two detectors run in the browser over the full series (`src/utils/spikes.js`),
because "unusual" means two different things here.

**`detectSpikes` — sharp days.** Each day is compared against the median of the
preceding 60 days, and flagged when it is at least 2× that baseline, the excess
is at least 2% of the series' own peak, and it clears 100 users outright.
Contiguous flagged days merge, so a two-week shutdown is one marker, not
fourteen. Shown as a circle above the line.

**`detectLevelShifts` — sustained plateaus.** A trailing baseline is
structurally blind to a level that doubles and *stays* doubled: within a couple
of months the baseline climbs into the new level and the shift stops looking
like one. Global relay usage rose ~95% between mid-2017 and January 2018 and
held for a quarter without a single day clearing 2× its trailing median. So this
detector compares a 29-day centred median against a **two-year centred** median,
which a three-month excursion barely moves, and reports stretches ≥30 days at
≥1.4×. Shown as an arrow below the line at the point the level steps up.

Both edges of the record are less reliable for the second detector, since the
centred baseline there has data on only one side.

### Two sources of markers

**1. Censorship events** from the Tor Project's own list, drawn on every chart
but at the altitude each one needs.

On a **country chart**, one marker per event. The median country has two and
Iran has 24, all legible on their own line. There is no "notable movement" gate
here: every event is *about this country*, so it belongs on this country's
chart whether or not it moved the line much, and the panel reports the size
either way.

On the **worldwide chart**, half-yearly notes. Individual national blocks are
invisible against the global line and a decade of them is an unreadable stripe
of dots, so they are rolled up. Two rules keep it readable:

- **At most one note per half-year.** H1 and H2 are coarse enough that markers
  never crowd, and "Jul–Dec 2022" still points at something.
- **A note only appears where censorship visibly moved the numbers** — usage
  at least doubling, or at least halving, in one of the countries the event is
  tagged with. That leaves **22 notes** spanning 2012-H1 to 2026-H1, skipping
  2 half-years that had events but no visible movement.

Both directions count, and that is load-bearing. An uptick-only rule was tried
first and **hid every censorship event after mid-2024**, because shutdowns push
the count *down*. Iran's January 2026 blackout — bridge users down 439×, the
most extreme movement anywhere in this dataset — produced no marker at all, and
the chart implied nothing had happened for two years.

An absolute-users clause was also tried alongside the doubling rule and
removed: it let large countries qualify on a 1.2× wobble — technically tens of
thousands of people, but not something a reader would call a movement.

The second rule governs the *marker*, not the *note*. Once a half-year
qualifies, its note lists everything in it, in both directions.

Markers sit **on the line, at a local peak**, rather than in a row along the
top. The row was the right arrangement when there were thousands of markers; at
24 they can each go where they belong.

Getting that right needed one more step. A note's date starts as the day its
leading event peaked *in its own country*, which is the right date for the
writeup and the wrong place for the dot — the worldwide line has its own shape,
so those dates often landed partway up a rise. `build-periods.mjs` snaps each
marker to the nearest genuine turning point: a day no lower (or no higher) than
anything within **30 days** either side, preferring the closest to the event and
breaking ties toward the more extreme day. A rise snaps to a crest and a fall
snaps to a trough, because the feature a shutdown leaves on the line is a hole,
not a peak.

The search is capped at ±45 days even though the half-width is 30. Letting it
run to 75 days did find a true turning point for every note, but pushed five
markers more than 45 days from their event — one by 67 — and a dot two months
adrift no longer points at what the panel describes. Where no turning point
exists within 45 days the fallback takes the window's most extreme day, still
the high or low of a three-month span.

The relay and bridge lines turn on different days, so each note stores a date
per chart and the app picks by data type. **39 of 44 positions are true
one-month turning points**, the rest are window extremes, and no marker sits
more than 43 days from its event.

All markers are dots — direction arrows were tried and dropped, because a note
covering a half-year of moves in both directions was picking one of them to
stand for the rest.

Both charts measure, place and colour events identically — the same baseline
comparison, the same `snapToTurningPoint` in `src/utils/snap.js`, the same
categories. Only the roll-up differs. That sharing is deliberate: the country
charts previously ran *none* of this and showed only detector output, so 135
documented censorship events were unreachable from any country's page and 74%
of bridge country markers were unexplained.

One difference in placement: a country marker only snaps when its event moved
the line by at least 2×. Below that, dragging the dot up to 45 days onto a
nearby wiggle would attach it to something the event did not cause, so it stays
on the event's own extreme day.

The events themselves come from the Tor Project's "Related events" list,
filtered by one rule with two halves:

- the row carries a **country code** — a person at Tor decided it is about that
  place, which is the only country attribution here that is not inferred; and
- the description describes **blocking, censorship, or a shutdown**.

That gives **135 events across 38 countries**. Everything else in the timeline
— release notes, bridge outages, geoip refreshes, and the many rows that just
observe "relay users in Lithuania increased" — is not a censorship event. One
false positive is excluded by name: a Brazilian bot observation that trips the
word "shutdown" because it mentions the shutdown of *meek-azure*.

**Ranking is measured, not asserted.** `build-periods.mjs` takes each event into
every country it is tagged with, on both the relay and bridge series, and
compares the median of the 60 days before it against the most extreme day
inside it. An event scores by the largest absolute change in users it produced
anywhere, weighted by the log of its ratio so a 40× block in a small country can
outrank a 1.2× wobble in a large one, with a modest thumb on the scale for
national shutdowns.

Recurring blocks are collapsed. Iranian ISPs blocked the Snowflake front domain
nine separate times in early 2023; the note says so once, with a ×9, instead of
filling the period with nine identical rows.

**2. Detected anomalies** from `src/utils/spikes.js`, on every chart. Once
censorship is accounted for, what is left is largely the botnet and
metrics-artifact class those detectors were always best at finding. Labelled
in one of three ways:

**A researched event** from `src/data/spikeEvents.js` — a title, a summary, and
links to contemporaneous reporting.

**A network-wide anomaly**, computed by `detect-anomalies.mjs`. This is the
guard against the failure mode that matters most here: *inventing a national
story for something that was never national.* A window is marked network-wide
when at least 8 countries move in it (each adding ≥1,000 users) **and** no
single country accounts for half or more of the combined rise. That second test
does the work — in June 2018 the biggest country was 22% of a very broad rise,
which is not how national politics behaves. Grouping is by *simultaneity*, not
transitive overlap, which would chain a decade of unrelated events into one
blob.

**Nothing** — a grey `?`. Honest, and better than a guess.

### What this deliberately does not do

Earlier versions matched Tor's timeline onto detector output, resolved global
markers through whichever country dominated the rise, drew a marker per event
per country, and pulled Tor's statistical `lower`/`upper` bounds in as a third
opinion. All of it is gone. Each layer was individually defensible and the
combination was unreadable — markers appeared whose provenance took three files
to trace.

Two costs worth stating:

- **On the worldwide chart, 113 of the 135 events are not individually
  marked.** They appear inside the notes for their half-year, and 2 half-years
  fail the movement test, so those events are reachable only from their
  country's chart.
- **The Tor list has gaps.** It has no row for Bangladesh's July 2024 shutdown,
  when direct users fell from ~13,400 to 77. That quarter's note is therefore
  missing its biggest event. Filling such gaps means adding to
  `spikeEvents.js` or contributing the row upstream to Tor's timeline.

## The Tor metrics timeline

The Tor Project hand-maintains a
[timeline](https://gitlab.torproject.org/tpo/network-health/metrics/timeline) of
events its analysts think can move these graphs: ~800 rows back to 2008, each
with dates, country codes, a description, and links. `collect-timeline.mjs`
turns it into `public/data/timeline.json`.

It is **vendored** at `data-sources/metrics-timeline.md` rather than fetched,
because gitlab.torproject.org answers every non-browser request with 403,
including its raw-file and API endpoints. To refresh, download the repo in a
browser and replace that file. The rendered table on metrics.torproject.org
*is* fetchable and carries the same rows, but drops the two most useful columns.

Two things get dropped or bounded on the way in, and both matter:

**Routine plumbing is discarded** (~200 rows): geoip database bumps, snowflake
host reboots, Tor Browser releases. Geolocation refreshes really can shuffle
users between countries, which is why Tor records them, but they are dense
enough to sit under almost any window you care to pick.

**Open-ended rows only attribute near their onset** (180 days). Rows marked
"ongoing" are standing conditions — "Turkey blocks Facebook, Twitter, YouTube,
WhatsApp" has been open since November 2016. A standing condition cannot be what
made usage jump on one particular day nine years later; only its onset can.
Without this bound, 148 of 207 open-ended attributions landed more than a year
past the event, the worst 3,381 days out.

A blank end date means a *point event*, not an open-ended one. Conflating the
two lets Hurricane Irma explain a 2024 spike.

**Dates are extracted, never sliced.** Four rows write an approximate end as
`~2014-04-24`. Taking `cell.slice(0, 10)` yields `~2014-04-2`, and since `~`
sorts above every digit, string comparison then places that end date after every
real date in the file — those four rows silently matched every window from 2013
onward, which is how a 2013 botnet came to be cited as context for a 2025 spike.
The collector now pulls dates with a regex, treats a bare `YYYY-MM` end as the
last day of that month, and asserts every date is a bare ISO day before writing.

Attribution requires that Tor tagged the row with **the country being viewed**.
That tag is a person's judgment that the row is about there, which is the same
bar the curated events clear. Rows that merely overlap in time are shown in a
separate "also in the Tor timeline during this window" list, explicitly labelled
as not a claimed cause. The global view never attributes from the timeline at
all — it only shows that context list.

Rows carrying Tor's `?` flag ("change visible in the data, no known cause") are
kept and surfaced as such. They corroborate several markers this dashboard had
already given up on, including the Seychelles and Lithuania jumps of 2017, the
Finland rise from 2021, and the German plateau of 2023.

Of the timeline's ~600 usable rows, 135 are censorship events and feed the
half-yearly notes. The rest inform nothing directly — they are kept in
`public/data/timeline.json` because the filter is applied at read time, so
widening or narrowing the rule needs no re-collection.

To add an event: confirm the detector flags it for that country and data type,
then add an entry whose `window` covers it with `scope` (country codes, or `'*'`
for genuinely global events), `dataType`, a `category`, and source links.

Before writing an explanation, **check the breadth**. The single most common
cause of a big spike is not censorship — it is a botnet or a counting change.
The 2013 peak was the Mevade botnet; the September 2025 peak (2.5M → 20M in
three days, across the US, Germany, the Netherlands, France, Canada, Russia and
Senegal simultaneously) has never been explained. Recent large spikes cluster in
datacenter jurisdictions — Lithuania, Finland, Singapore, the Netherlands — and
in Tor's `EU` bucket for addresses it cannot resolve to a country, which is the
signature of hosted traffic rather than residents.

An earlier version of this file attributed Vietnam's June 2018 bridge spike to
the Cybersecurity Law passing on 12 June. It was wrong: Laos rose 146×, Myanmar
178×, Thailand 66× and Cambodia 49× the same week. The anomaly pass now catches
that class of mistake automatically.

Bridge data is usually the better censorship signal: when a country blocks Tor
outright, the relay line *falls* and the bridge line spikes.

## Development

The app is built with React + Vite and uses [lightweight-charts](https://tradingview.github.io/lightweight-charts/) for charting.

## License

This project is MIT licensed. Tor metrics data is available under CC0 1.0 Universal.
