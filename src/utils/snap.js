/**
 * Moving a marker onto a turning point of the line it is drawn on.
 *
 * Shared deliberately. `build-periods.mjs` uses it for the worldwide chart and
 * `src/data/censorshipEvents.js` uses it for country charts, so the two cannot
 * drift apart — the country charts previously ran no version of this at all,
 * and markers sat wherever a detector happened to fire.
 *
 * A marker's date starts as the day its event moved the numbers most, which is
 * the right date for the writeup and often the wrong place for the dot: the
 * line has its own shape, so that date can land partway up a rise.
 */

const DAY = 86400000
const addDays = (iso, n) => new Date(Date.parse(iso) + n * DAY).toISOString().slice(0, 10)

export const SNAP_DEFAULTS = {
  // A month of half-width means a marker sits on a crest that dominates two
  // months of line, not a two-week wrinkle.
  halfWidth: 30,
  // Capped tighter than the half-width would suggest. Letting the search run
  // to 75 days did find a true turning point for every marker, but pushed some
  // more than 45 days from their event — one by 67 — and a dot two months
  // adrift no longer points at what the panel describes.
  snapDays: 45,
}

/**
 * @param series    [{date, users}]
 * @param target    ISO date to move
 * @param direction 'rise' snaps to a crest, 'fall' snaps to a trough — the
 *                  feature a shutdown leaves on the line is a hole, not a peak
 * @returns the snapped ISO date, or `target` if nothing better exists
 */
export function snapToTurningPoint(series, target, direction = 'rise', options = {}) {
  const { halfWidth, snapDays } = { ...SNAP_DEFAULTS, ...options }
  if (!series?.length || !target) return target

  const from = series.findIndex(p => p.date >= addDays(target, -snapDays))
  if (from === -1) return target
  const hi = addDays(target, snapDays)
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
    for (let j = Math.max(0, i - halfWidth); j <= Math.min(series.length - 1, i + halfWidth); j++) {
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

  // No turning point in range means a steady climb or fall with no crest
  // inside it; the window's most extreme day is at least not mid-slope.
  return (best?.point ?? extreme)?.date ?? target
}
