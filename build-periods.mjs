/**
 * Rolls the censorship events up into at most one note per half-year, and
 * writes public/data/periods.json.
 *
 * 135 events across 38 countries is the right amount of detail on a country's
 * own chart and far too much on the worldwide one, where a decade of national
 * blocks becomes a stripe of unreadable dots.
 *
 * Two rules keep the worldwide chart readable:
 *
 *   1. **At most one note per half-year.** H1 and H2 are coarse enough that
 *      the markers never crowd, and "H2 2022" still points at something.
 *   2. **A note only appears where censorship visibly moved the numbers.** The
 *      chart plots usage, so a marker earns its place by sitting on a real
 *      feature of the line — a crest where a block pushed people onto Tor, or
 *      a trough where Tor itself was cut off. A half-year whose censorship left
 *      no mark gets no marker, however many events it contained.
 *
 * Rule 2 is about the *marker*, not the *note*. Once a half-year qualifies,
 * its note lists everything that happened in it, in both directions.
 *
 * Ranking is done from the data rather than from the wording. For every event,
 * in every country it is tagged with, on both the relay and bridge series, the
 * script measures what actually happened: the median of the 60 days before the
 * event, against the most extreme day inside it. The event's score is the
 * largest absolute change in users it produced anywhere. That deliberately
 * favours events that moved a lot of people over events that moved a small
 * country by a large multiple — "most notable" means most consequential, and
 * a 40x swing in Turkmenistan is a smaller event in the world than a 3x swing
 * in Iran.
 *
 * National shutdowns get a modest thumb on the scale, because cutting a
 * country off is a categorically bigger act than blocking one platform, and
 * the user counts understate it: when Tor itself is unreachable the count
 * cannot rise to record the demand.
 *
 * Run via `npm run collect`, or `npm run periods` on its own.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isCensorshipEvent } from './src/data/censorshipEvents.js'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(ROOT, 'public', 'data')
const OUT = path.join(DATA_DIR, 'periods.json')

const BASELINE_DAYS = 60
const SHUTDOWN_WEIGHT = 1.5
const SHUTDOWN = /\b(shut ?down|blackout|outage|curfew)/i
// How many events a note lists in full before summarising the rest.
const HEADLINE_COUNT = 6

// What makes a movement notable enough to mark: usage at least doubled, or at
// least halved, in one of the countries the event is tagged with.
//
// Both directions count, and that is load-bearing. An uptick-only rule was
// tried first and hid every censorship event after mid-2024, because shutdowns
// push the count *down*. Iran's January 2026 blackout — bridge users down 439x,
// the most extreme movement anywhere in this dataset — produced no marker, and
// the chart implied nothing had happened for two years.
const MIN_RATIO = 2

// Snapping the marker onto a turning point of the line it is drawn on.
//
// The marker date starts life as the day the leading event peaked *in its own
// country*, which is the right date for the writeup and the wrong place for
// the dot: the worldwide line has its own shape, so that date often lands
// partway up a rise. These control the search for a nearby extremum — a day
// no lower (or no higher) than every other within HALF_WIDTH either side.
//
// A month of half-width means a marker sits on a crest that dominates two
// months of line, not a two-week wrinkle.
//
// The search window is capped tighter than that half-width would suggest.
// Letting it run to 75 days did find a true turning point for every period,
// but pushed five markers more than 45 days from their event — one by 67 —
// and a dot two months adrift no longer points at what the panel describes.
// Where no crest exists within 45 days the fallback takes the window's most
// extreme day, which is still the high or low of a three-month span.
const SNAP_DAYS = 45
const PEAK_HALF_WIDTH = 30

const DAY = 86400000
const addDays = (iso, n) => new Date(Date.parse(iso) + n * DAY).toISOString().slice(0, 10)

function median(values) {
  if (!values.length) return 0
  const s = [...values].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function periodOf(iso) {
  const y = iso.slice(0, 4)
  return `${y}-H${Number(iso.slice(5, 7)) <= 6 ? 1 : 2}`
}

function isNotable(impact) {
  return impact.ratio >= MIN_RATIO
}

const series = { relay: new Map(), bridge: new Map() }
function load(dataType, cc) {
  const cache = series[dataType]
  if (cache.has(cc)) return cache.get(cc)
  const f = path.join(DATA_DIR, dataType, `${cc}.json`)
  let data = null
  if (fs.existsSync(f)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(f, 'utf8'))
      if (Array.isArray(parsed) && parsed.length) data = parsed
    } catch { /* treated as missing */ }
  }
  cache.set(cc, data)
  return data
}

/** What the event did to one country's series, or null if unmeasurable. */
function measure(dataType, cc, start, end) {
  const s = load(dataType, cc)
  if (!s) return null
  const startIdx = s.findIndex(p => p.date >= start)
  if (startIdx < 1) return null
  const window = s.filter(p => p.date >= start && p.date <= end)
  if (!window.length) return null

  const baseline = median(
    s.slice(Math.max(0, startIdx - BASELINE_DAYS), startIdx).map(p => p.users)
  )
  if (baseline <= 0) return null

  const high = window.reduce((a, b) => (b.users > a.users ? b : a))
  const low = window.reduce((a, b) => (b.users < a.users ? b : a))
  const up = high.users / baseline
  const down = baseline / Math.max(low.users, 1)
  const fell = down > up
  const extreme = fell ? low : high

  return {
    dataType,
    cc,
    baseline: Math.round(baseline),
    users: extreme.users,
    date: extreme.date,
    direction: fell ? 'fall' : 'rise',
    ratio: Number((fell ? down : up).toFixed(1)),
    delta: Math.abs(extreme.users - baseline),
  }
}

/**
 * Move `target` to the nearest genuine turning point of `series`.
 *
 * A rise snaps to a crest and a fall snaps to a trough, because the feature a
 * shutdown makes on the line is a hole, not a peak. Prefers a real extremum —
 * a day no lower (or no higher) than anything within PEAK_HALF_WIDTH either
 * side — and among those takes the closest to the original date, so the marker
 * still points at the event it describes. If the window holds no turning point
 * at all, it falls back to the window's most extreme day, which is at least
 * not mid-slope.
 */
function snapToPeak(series, target, direction = 'rise') {
  if (!series?.length) return target
  const lo = addDays(target, -SNAP_DAYS)
  const hi = addDays(target, SNAP_DAYS)

  const from = series.findIndex(p => p.date >= lo)
  if (from === -1) return target
  let to = from
  while (to + 1 < series.length && series[to + 1].date <= hi) to++
  if (to === from) return target

  const up = direction !== 'fall'
  const beats = (a, b) => (up ? a > b : a < b)

  const targetMs = Date.parse(target)
  let best = null
  let extreme = null

  for (let i = from; i <= to; i++) {
    const point = series[i]
    if (!extreme || beats(point.users, extreme.users)) extreme = point

    let isTurning = true
    for (let j = Math.max(0, i - PEAK_HALF_WIDTH); j <= Math.min(series.length - 1, i + PEAK_HALF_WIDTH); j++) {
      if (beats(series[j].users, point.users)) { isTurning = false; break }
    }
    if (!isTurning) continue

    const distance = Math.abs(Date.parse(point.date) - targetMs)
    // Ties go to the more extreme day, so a flat shoulder does not beat a crest.
    if (!best || distance < best.distance ||
        (distance === best.distance && beats(point.users, best.point.users))) {
      best = { point, distance }
    }
  }

  return (best?.point ?? extreme)?.date ?? target
}

const { events: timeline } = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, 'timeline.json'), 'utf8')
)
const censorship = timeline.filter(isCensorshipEvent)
if (!censorship.length) throw new Error('no censorship events found — refusing to overwrite')

const scored = []
for (const e of censorship) {
  // Open-ended rows are scored on their onset; the standing condition after it
  // is not the event.
  const end = e.ongoing ? addDays(e.start, 30) : e.end

  let best = null
  for (const cc of e.countries) {
    for (const dataType of ['relay', 'bridge']) {
      const m = measure(dataType, cc, e.start, end)
      if (m && (!best || m.delta > best.delta)) best = m
    }
  }
  if (!best) continue

  const isShutdown = SHUTDOWN.test(e.desc)
  scored.push({
    key: normalise(e.desc),
    start: e.start,
    end: e.ongoing ? null : e.end,
    ongoing: e.ongoing,
    countries: e.countries,
    desc: e.desc,
    links: e.links.slice(0, 3),
    shutdown: isShutdown,
    impact: best,
    // Absolute change alone lets a 1.5x wobble in a large country outrank a
    // 40x block in a smaller one. Weighting it by the log of the ratio keeps
    // magnitude in charge while letting proportional severity break ties.
    score: best.delta * Math.log2(1 + best.ratio) * (isShutdown ? SHUTDOWN_WEIGHT : 1),
  })
}

/**
 * Recurring blocks are filed once per occurrence. Iran's ISPs blocked the
 * Snowflake front domain nine separate times in early 2023, and a quarterly
 * note that lists it nine times is a worse summary than one that says it
 * happened nine times.
 */
function normalise(desc) {
  return desc
    .toLowerCase()
    .replace(/\bagain\b/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90)
}

function collapseRecurring(list) {
  const byKey = new Map()
  for (const e of list) {
    const prev = byKey.get(e.key)
    if (!prev) {
      byKey.set(e.key, { ...e, occurrences: 1, lastStart: e.start })
      continue
    }
    prev.occurrences++
    if (e.start < prev.start) prev.start = e.start
    if (e.start > prev.lastStart) prev.lastStart = e.start
    // Keep the occurrence that moved the numbers most.
    if (e.score > prev.score) {
      prev.score = e.score
      prev.impact = e.impact
      prev.desc = e.desc
      prev.links = e.links
    }
  }
  return [...byKey.values()]
}

const byPeriod = new Map()
for (const e of scored) {
  const p = periodOf(e.start)
  if (!byPeriod.has(p)) byPeriod.set(p, [])
  byPeriod.get(p).push(e)
}

const periods = []
let skipped = 0
for (const [period, all] of byPeriod) {
  const list = collapseRecurring(all)
  list.sort((a, b) => b.score - a.score)

  // The marker has to land on a visible movement, so the half-year is led by
  // its biggest notable one in either direction. A half-year whose censorship
  // left no mark on the graph gets no marker at all.
  const notable = list.filter(e => isNotable(e.impact))
  if (!notable.length) {
    skipped++
    continue
  }
  const lead = notable[0]

  // Lead first, then everything else by impact — including the falls, which
  // are often the more severe events.
  const ordered = [lead, ...list.filter(e => e !== lead)]
  const countries = [...new Set(list.flatMap(e => e.countries))]

  periods.push({
    period,
    // Where the dot goes, per chart. The two global series peak on different
    // days, so each gets its own snapped date; the app picks by data type.
    markerDates: {
      relay: snapToPeak(load('relay', 'global'), lead.impact.date, lead.impact.direction),
      bridge: snapToPeak(load('bridge', 'global'), lead.impact.date, lead.impact.direction),
    },
    // The day the leading uptick peaked in its own country, which is what the
    // writeup quotes.
    leadPeakDate: lead.impact.date,
    start: list.reduce((a, e) => (e.start < a ? e.start : a), list[0].start),
    end: list.reduce((a, e) => ((e.end || e.start) > a ? (e.end || e.start) : a), list[0].start),
    total: list.length,
    occurrences: all.length,
    countries: countries.length,
    shutdowns: list.filter(e => e.shutdown).length,
    falls: list.filter(e => e.impact.direction === 'fall').length,
    lead: {
      cc: lead.impact.cc,
      ratio: lead.impact.ratio,
      users: lead.impact.users,
      baseline: lead.impact.baseline,
      direction: lead.impact.direction,
    },
    headline: ordered.slice(0, HEADLINE_COUNT),
    rest: ordered.slice(HEADLINE_COUNT).map(e => ({
      start: e.start, countries: e.countries, desc: e.desc,
      occurrences: e.occurrences,
      direction: e.impact.direction, ratio: e.impact.ratio,
    })),
  })
}
periods.sort((a, b) => a.period.localeCompare(b.period))

fs.writeFileSync(OUT, JSON.stringify(periods))

console.log(`periods: ${censorship.length} censorship events → ${periods.length} half-year notes`)
console.log(`  measurable: ${scored.length} of ${censorship.length}`)
console.log(`  half-years with events but no notable movement, skipped: ${skipped}`)
console.log(`  span: ${periods[0].period} to ${periods.at(-1).period}`)
for (const p of periods) {
  const l = p.headline[0]
  console.log(`  ${p.period}  ${String(p.total).padStart(2)}ev ${String(p.countries).padStart(2)}c  ` +
    `lead ${l.impact.cc.toUpperCase()} ${l.impact.direction === 'fall' ? '-' : '+'}${l.impact.ratio}x  ${l.desc.slice(0, 56)}`)
}
console.log(`  -> ${path.relative(ROOT, OUT)}`)
