/**
 * Find spike windows that hit many countries at once, and write them to
 * public/data/{relay,bridge}/anomalies.json.
 *
 * Why this exists: the single most common cause of a large spike in Tor's
 * numbers is not a national event but something network-wide — a botnet
 * joining, or a change in how clients get counted. Those show up as dozens of
 * unrelated countries jumping on the same day. Without this pass, the dashboard
 * would show hundreds of unexplained markers with no way to tell "nobody has
 * researched this yet" from "this was never about that country".
 *
 * A window qualifies as network-wide when BOTH hold:
 *
 *   1. At least MIN_COUNTRIES countries spike in it, each adding at least
 *      MIN_EXCESS users. The floor matters because most of the ~250 files are
 *      micro-territories whose entire population of Tor users is single digits,
 *      and those trip the ratio test constantly.
 *
 *   2. No single country accounts for MAX_LEAD_SHARE or more of the combined
 *      excess. This is what separates a botnet from a real event: when Iran
 *      shut down in 2022, Iran was 83% of the worldwide excess, so it stays
 *      attributed to Iran. In June 2018 the largest country was 22% of a very
 *      broad rise, which is not how national politics behaves.
 *
 * Imports the same detector the app uses, so the two can never drift.
 *
 * Run via `npm run collect` (which chains it) or `npm run anomalies`.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { detectSpikes, detectLevelShifts } from './src/utils/spikes.js'

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public', 'data')

const MIN_EXCESS = 1000      // a country must add this many users to count
const MIN_COUNTRIES = 8      // this many countries make it "network-wide"
const MAX_LEAD_SHARE = 0.5   // ...unless one country dominates the total
const BURST_DAYS = 7         // width of the window used to measure simultaneity
const MIN_BURST = 4          // countries within BURST_DAYS to seed a window
const CLUSTER_GAP_DAYS = 10  // seeds this close are the same window

const dayNumber = (iso) => Math.floor(Date.parse(iso) / 86400000)
const toISO = (n) => new Date(n * 86400000).toISOString().slice(0, 10)

/**
 * Group dated country periods by *simultaneity*, not by transitive overlap.
 *
 * Chaining "this period overlaps that one" merges a decade of unrelated
 * national events into a single blob, because there is almost always some
 * country somewhere sitting above its baseline. Counting how many countries
 * are elevated on each individual day, and keeping only the stretches where
 * enough of them are elevated together, does not have that failure mode.
 *
 * `items` are {cc, start, end, excess}.
 */
function groupBySimultaneity(items) {
  const perDay = new Map()
  for (const s of items) {
    for (let d = dayNumber(s.start); d <= dayNumber(s.end); d++) {
      perDay.set(d, (perDay.get(d) || 0) + 1)
    }
  }

  const groups = []
  let run = null
  for (const d of [...perDay.keys()].sort((a, b) => a - b)) {
    const busy = perDay.get(d) >= MIN_COUNTRIES
    if (busy && run && d - run.to <= 1) {
      run.to = d
    } else if (busy) {
      if (run) groups.push(run)
      run = { from: d, to: d }
    }
  }
  if (run) groups.push(run)

  for (const g of groups) {
    g.start = toISO(g.from)
    g.end = toISO(g.to)
    g.members = items.filter(s => s.start <= g.end && s.end >= g.start)
  }
  return groups
}

/**
 * Turn a group into an anomaly record, or null if it fails either test:
 * enough distinct countries, and no single one dominating the rise.
 */
function summarize(group, basis) {
  // One country can appear twice inside a window; keep its largest.
  const perCountry = new Map()
  for (const m of group.members) {
    const prev = perCountry.get(m.cc)
    if (!prev || m.excess > prev.excess) perCountry.set(m.cc, m)
  }
  const ranked = [...perCountry.values()].sort((a, b) => b.excess - a.excess)
  if (ranked.length < MIN_COUNTRIES) return null

  const total = ranked.reduce((s, m) => s + m.excess, 0)
  const leadShare = total > 0 ? ranked[0].excess / total : 1
  if (leadShare >= MAX_LEAD_SHARE) return null

  return {
    start: group.start,
    end: group.end,
    countries: ranked.length,
    leadShare: Number(leadShare.toFixed(3)),
    basis,
    top: ranked.slice(0, 8).map(m => ({ cc: m.cc, excess: Math.round(m.excess) })),
  }
}

function processDataset(subDir) {
  const dir = path.join(DATA_DIR, subDir)
  if (!fs.existsSync(dir)) return null

  const files = fs.readdirSync(dir).filter(
    f => f.endsWith('.json') && !['global.json', 'snapshot.json', 'anomalies.json'].includes(f)
  )

  // Collect every country spike, keyed by peak date.
  const byDate = new Map()
  for (const file of files) {
    const cc = file.replace('.json', '')
    let series
    try {
      series = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
    } catch {
      continue
    }
    if (!Array.isArray(series)) continue

    for (const spike of detectSpikes(series)) {
      if (spike.excess < MIN_EXCESS) continue
      if (!byDate.has(spike.peakDate)) byDate.set(spike.peakDate, [])
      byDate.get(spike.peakDate).push({ cc, excess: spike.excess, ratio: spike.ratio })
    }
  }

  // Find bursts: BURST_DAYS-wide windows containing at least MIN_BURST
  // countries. Requiring density here rather than merely chaining nearby dates
  // matters — across ~250 files some country spikes almost every week, so a
  // plain gap-based chain merges unrelated months into one giant window.
  const dates = [...byDate.keys()].sort()
  const dayNums = dates.map(dayNumber)
  const seeds = []
  for (let i = 0; i < dates.length; i++) {
    const countries = new Set()
    for (let j = i; j < dates.length && dayNums[j] - dayNums[i] < BURST_DAYS; j++) {
      for (const m of byDate.get(dates[j])) countries.add(m.cc)
    }
    if (countries.size >= MIN_BURST) seeds.push([dayNums[i], dayNums[i] + BURST_DAYS - 1])
  }

  // Merge overlapping/adjacent seeds into windows.
  const clusters = []
  for (const [from, to] of seeds) {
    const last = clusters[clusters.length - 1]
    if (last && from - last.to <= CLUSTER_GAP_DAYS) {
      last.to = Math.max(last.to, to)
    } else {
      clusters.push({ from, to })
    }
  }

  for (const c of clusters) {
    c.start = toISO(c.from)
    c.end = toISO(c.to)
    c.members = []
    for (let i = 0; i < dates.length; i++) {
      if (dayNums[i] >= c.from && dayNums[i] <= c.to) c.members.push(...byDate.get(dates[i]))
    }
  }

  const anomalies = []
  for (const c of clusters) {
    // One country can spike twice inside a window; keep its largest.
    const perCountry = new Map()
    for (const m of c.members) {
      const prev = perCountry.get(m.cc)
      if (!prev || m.excess > prev.excess) perCountry.set(m.cc, m)
    }
    const ranked = [...perCountry.values()].sort((a, b) => b.excess - a.excess)
    if (ranked.length < MIN_COUNTRIES) continue

    const total = ranked.reduce((s, m) => s + m.excess, 0)
    const leadShare = total > 0 ? ranked[0].excess / total : 1
    if (leadShare >= MAX_LEAD_SHARE) continue

    anomalies.push({
      start: c.start,
      end: c.end,
      countries: ranked.length,
      leadShare: Number(leadShare.toFixed(3)),
      basis: 'burst',
      top: ranked.slice(0, 8).map(m => ({ cc: m.cc, excess: Math.round(m.excess) })),
    })
  }

  // Third pass, and the one that closes a real gap between the other two.
  //
  // The burst pass above clusters on *peak dates*, so it only sees countries
  // that crest together. The sustained pass below is fed by detectLevelShifts,
  // which needs 30+ days at 1.4x against a two-year baseline. A month-long
  // co-occurrence whose peaks are staggered across that month satisfies
  // neither: in April-May 2025 sixteen countries were spiking at once — twice
  // the threshold — but the densest week held only five peaks, and no country
  // qualified as a level shift. The global relay marker for it stayed blank.
  //
  // So ask the simultaneity question of spike *windows*: on each day, how many
  // countries are inside a detected spike? Same grouping the sustained pass
  // uses, same guard against transitive-overlap chaining, different input.
  const concurrent = []
  for (const file of files) {
    const cc = file.replace('.json', '')
    let series
    try {
      series = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
    } catch {
      continue
    }
    if (!Array.isArray(series)) continue
    for (const spike of detectSpikes(series)) {
      if (spike.excess < MIN_EXCESS) continue
      concurrent.push({ cc, start: spike.start, end: spike.end, excess: spike.excess })
    }
  }
  for (const g of groupBySimultaneity(concurrent)) {
    const record = summarize(g, 'concurrent')
    if (record) anomalies.push(record)
  }

  // The same question, asked of sustained periods rather than single-day
  // bursts. A months-long plateau that shows up across many countries at once
  // is no more a national event than a one-day jump is. These go into the same
  // list: the app only asks whether a window overlaps a network-wide one, and
  // does not care which detector found it.
  const sustained = []
  for (const file of files) {
    const cc = file.replace('.json', '')
    let series
    try {
      series = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
    } catch {
      continue
    }
    if (!Array.isArray(series)) continue
    for (const p of detectLevelShifts(series)) {
      // Total extra users over the whole period, so a long mild rise and a
      // short sharp one are comparable.
      const excess = (p.ratio - 1) * p.baseline * p.days
      if (excess > 0) sustained.push({ cc, start: p.start, end: p.end, excess })
    }
  }

  for (const g of groupBySimultaneity(sustained)) {
    const record = summarize(g, 'sustained')
    if (record) anomalies.push(record)
  }

  anomalies.sort((a, b) => a.start.localeCompare(b.start))
  fs.writeFileSync(path.join(dir, 'anomalies.json'), JSON.stringify(anomalies, null, 2))
  return anomalies
}

for (const subDir of ['relay', 'bridge']) {
  const result = processDataset(subDir)
  if (!result) {
    console.log(`${subDir}: no data directory, skipped`)
    continue
  }
  console.log(`${subDir}: ${result.length} network-wide windows`)
  for (const a of result) {
    const top = a.top.slice(0, 5).map(t => t.cc.toUpperCase()).join(', ')
    console.log(`  ${a.basis.padEnd(9)} ${a.start} → ${a.end}  ${String(a.countries).padStart(3)} countries, ` +
      `lead ${(a.leadShare * 100).toFixed(0)}%  (${top}…)`)
  }
}
