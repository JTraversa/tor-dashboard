/**
 * Spike detection for Tor user series.
 *
 * Tor user counts vary over three orders of magnitude between countries (the
 * US sits in the hundreds of thousands, Turkmenistan in the hundreds), and
 * every series has a slow-moving trend on top of heavy day-to-day noise. So a
 * fixed threshold is useless and a global mean/stddev is dominated by whatever
 * the largest excursion happens to be.
 *
 * Instead each day is compared against the median of the preceding window.
 * Median rather than mean so that the baseline is not dragged upward by the
 * front edge of the very spike being measured, and trailing-only so a spike is
 * judged against what came before it rather than against itself.
 *
 * Two thresholds must both be met: a ratio (so small countries can register)
 * and an absolute excess (so noise in a country with a baseline of 30 users
 * does not produce a wall of markers). Contiguous flagged days are then merged
 * into a single event, because a shutdown produces a fortnight of elevated
 * readings, not one marker per day.
 */

const DEFAULTS = {
  window: 60,      // days of trailing history used for the baseline
  minRatio: 2.0,   // day must be at least this multiple of its baseline
  minExcess: 0.02, // ...and this fraction of the series' own peak, so the
                   // absolute bar scales with the size of the country
  minUsers: 100,   // ...and this many users outright. Without a hard floor the
                   // ~150 micro-territories in the dataset, whose entire Tor
                   // population is single or double digits, generate constant
                   // markers for moves like 3 users to 11 — technically a
                   // 3.7x spike, but not a fact about the world.
  gapDays: 21,     // flagged days closer than this belong to one event
}

function median(sorted) {
  const n = sorted.length
  if (n === 0) return 0
  const mid = n >> 1
  return n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Detect spikes in a [{ date, users }] series, newest last.
 * Returns [{ start, end, peakDate, peakUsers, baseline, ratio, excess }].
 */
export function detectSpikes(series, options = {}) {
  const { window, minRatio, minExcess, minUsers, gapDays } = { ...DEFAULTS, ...options }
  if (!series || series.length < window) return []

  const seriesPeak = series.reduce((m, d) => (d.users > m ? d.users : m), 0)
  const minAbs = Math.max(seriesPeak * minExcess, minUsers)

  // Maintain the trailing window as a sorted array: dropping/inserting one
  // value per step is far cheaper than re-sorting 60 values for every one of
  // ~5,000 days, and this runs on every country switch.
  const sorted = []
  const insert = (v) => {
    let lo = 0, hi = sorted.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (sorted[mid] < v) lo = mid + 1
      else hi = mid
    }
    sorted.splice(lo, 0, v)
  }
  const remove = (v) => {
    const i = sorted.indexOf(v)
    if (i >= 0) sorted.splice(i, 1)
  }

  const flagged = []
  for (let i = 0; i < series.length; i++) {
    if (i >= window) {
      const baseline = median(sorted)
      const users = series[i].users
      if (baseline > 0 && users / baseline >= minRatio && users - baseline >= minAbs) {
        flagged.push({ i, date: series[i].date, users, baseline, ratio: users / baseline })
      }
      remove(series[i - window].users)
    }
    insert(series[i].users)
  }

  // Merge nearby flagged days into events, keeping the day with the largest
  // absolute excess as the peak — that is the point worth putting a marker on.
  const events = []
  let cur = null
  for (const f of flagged) {
    const excess = f.users - f.baseline
    if (cur && f.i - cur.lastIndex <= gapDays) {
      cur.lastIndex = f.i
      cur.end = f.date
      if (excess > cur.excess) {
        cur.excess = excess
        cur.peakDate = f.date
        cur.peakUsers = f.users
        cur.baseline = f.baseline
        cur.ratio = f.ratio
      }
    } else {
      if (cur) events.push(cur)
      cur = {
        start: f.date,
        end: f.date,
        lastIndex: f.i,
        excess,
        peakDate: f.date,
        peakUsers: f.users,
        baseline: f.baseline,
        ratio: f.ratio,
      }
    }
  }
  if (cur) events.push(cur)

  for (const e of events) delete e.lastIndex
  return events
}

/* ------------------------------------------------------------------ *
 * Sustained level shifts
 * ------------------------------------------------------------------ */

const SHIFT_DEFAULTS = {
  smoothDays: 29,      // centred median, wide enough to kill weekly cycles
  baselineDays: 730,   // centred window defining "normal" around a period
  minRatio: 1.4,       // elevated means this far above that normal
  minDuration: 30,     // ...for at least this long
  minUsers: 100,
}

/**
 * Detect sustained periods where usage sat well above its surrounding normal.
 *
 * detectSpikes above compares each day to its own recent past, which makes it
 * structurally blind to this: when a level doubles and *stays* doubled, the
 * trailing baseline climbs into the new level within a couple of months and the
 * shift disappears. Global relay usage rose about 95% between mid-2017 and
 * January 2018 and held there for a quarter without a single day clearing 2x
 * its trailing median.
 *
 * So the baseline here is a wide *centred* window instead. Two years of
 * surrounding data, taken as a median, is barely moved by a three-month
 * excursion inside it, so the excursion stays visible. Both edges of the series
 * fall back to whatever window is available, which makes the very start and end
 * of the record less reliable — acceptable, since those are also the periods a
 * reader is least likely to be asking about.
 *
 * Returns [{ start, end, peakDate, peakUsers, baseline, ratio, days }].
 */
export function detectLevelShifts(series, options = {}) {
  const opts = { ...SHIFT_DEFAULTS, ...options }
  if (!series || series.length < opts.minDuration * 2) return []

  const users = series.map(d => d.users)
  const n = users.length

  // Centred rolling median over a fixed half-width, computed by sliding a
  // sorted array one element at a time. Re-sorting a 730-day window at every
  // one of ~5,000 points is ~37M comparisons per series, which is too slow to
  // run on a country switch; splice-based insert/remove is ~1000x cheaper.
  const rollingMedian = (halfWidth) => {
    const out = new Array(n)
    const sorted = []
    const insert = (v) => {
      let lo = 0, hi = sorted.length
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (sorted[mid] < v) lo = mid + 1
        else hi = mid
      }
      sorted.splice(lo, 0, v)
    }
    const remove = (v) => {
      let lo = 0, hi = sorted.length
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (sorted[mid] < v) lo = mid + 1
        else hi = mid
      }
      if (sorted[lo] === v) sorted.splice(lo, 1)
    }

    for (let i = 0; i < Math.min(halfWidth, n); i++) insert(users[i])
    for (let i = 0; i < n; i++) {
      const add = i + halfWidth
      if (add < n) insert(users[add])
      const drop = i - halfWidth - 1
      if (drop >= 0) remove(users[drop])
      const len = sorted.length
      const mid = len >> 1
      out[i] = len === 0 ? 0 : len % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    }
    return out
  }

  const smooth = rollingMedian(opts.smoothDays >> 1)
  const baselines = rollingMedian(opts.baselineDays >> 1)

  const elevated = new Array(n)
  for (let i = 0; i < n; i++) {
    const base = baselines[i]
    elevated[i] =
      base > 0 && smooth[i] >= base * opts.minRatio && smooth[i] - base >= opts.minUsers
  }

  const medianOf = (from, to) => {
    const slice = users.slice(Math.max(0, from), Math.min(n, to))
    if (slice.length === 0) return 0
    slice.sort((a, b) => a - b)
    const mid = slice.length >> 1
    return slice.length % 2 ? slice[mid] : (slice[mid - 1] + slice[mid]) / 2
  }

  const periods = []
  let startIdx = null
  for (let i = 0; i <= n; i++) {
    if (i < n && elevated[i]) {
      if (startIdx === null) startIdx = i
      continue
    }
    if (startIdx !== null) {
      const endIdx = i - 1
      const days = endIdx - startIdx + 1
      if (days >= opts.minDuration) {
        let peakIdx = startIdx
        for (let j = startIdx; j <= endIdx; j++) if (users[j] > users[peakIdx]) peakIdx = j
        const baseline = baselines[Math.floor((startIdx + endIdx) / 2)]
        periods.push({
          start: series[startIdx].date,
          end: series[endIdx].date,
          peakDate: series[peakIdx].date,
          peakUsers: users[peakIdx],
          baseline,
          ratio: baseline > 0 ? medianOf(startIdx, endIdx + 1) / baseline : 0,
          days,
        })
      }
      startIdx = null
    }
  }

  return periods
}
