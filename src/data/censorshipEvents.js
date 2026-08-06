/**
 * Which rows of the Tor Project's "Related events" list count as censorship.
 *
 * This is the single filter the whole dashboard's censorship marking rests on.
 * It is consumed at build time by build-periods.mjs, which rolls the matching
 * events into at most one note per half-year for the worldwide chart.
 *
 * Source: https://gitlab.torproject.org/tpo/network-health/metrics/timeline
 * rendered at metrics.torproject.org as the table under every userstats graph,
 * collected into public/data/timeline.json by collect-timeline.mjs.
 *
 * The rule is deliberately narrow, and both halves of it matter:
 *
 *   1. The row must carry a country code. A person at the Tor Project decided
 *      it is about that place, which is the only country attribution here that
 *      is not inferred.
 *   2. The description must describe blocking, censorship, or a shutdown.
 *
 * That yields 135 events across 38 countries. Everything else in the timeline
 * — Tor release notes, bridge outages, geoip refreshes, and the many rows that
 * simply observe "relay users in Lithuania increased" — is not a censorship
 * event and is not drawn.
 */

// Blocking, censorship, or a shutdown — matched on the description rather than
// on any category assigned elsewhere, so the rule is visible in one place.
const CENSORSHIP =
  /\b(block|censor|shut ?down|blackout|throttl|filter|ban\b|bans\b|banned|restrict|unblock|interference|disrupt|outage|curfew|dpi\b|man-in-the-middle|mitm)/i

/**
 * Rows where the only match is Tor switching off its own equipment.
 *
 * "Sustained increase in meek users in Brazil. Locals believe that they are
 * not actual users, rather bots … End date coincides with shutdown of
 * meek-azure" is a bot observation that trips the word "shutdown". It is the
 * one false positive the rule above produces, and it is worth excluding by
 * name rather than weakening the rule for everything else.
 */
const INFRASTRUCTURE =
  /shut ?down of (meek|snowflake|the meek|the snowflake)|\bbots\b|\bbotnet\b/i

export function isCensorshipEvent(e) {
  return e.countries.length > 0 && CENSORSHIP.test(e.desc) && !INFRASTRUCTURE.test(e.desc)
}

const DAY = 86400000
const BASELINE_DAYS = 60
// Below this, the movement is too small to trust a nearby crest as "the"
// feature the event caused, so the marker stays on the event's own extreme day.
const SNAP_MIN_RATIO = 2

const addDays = (iso, n) => new Date(Date.parse(iso) + n * DAY).toISOString().slice(0, 10)

function median(values) {
  if (!values.length) return 0
  const s = [...values].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/**
 * One marker per documented censorship event, for a single country's chart.
 *
 * Same measurement and placement as the worldwide chart, at the altitude a
 * country view needs: no half-year roll-up, because the median country has two
 * events and the roll-up exists only to stop a decade of national blocks
 * becoming an unreadable stripe on the global line. Iran has 24 and they are
 * all legible on Iran's own chart.
 *
 * Unlike the worldwide notes there is no "notable movement" gate. Every event
 * here is *about this country*, so it belongs on this country's chart whether
 * or not it moved the line much; the panel reports the size either way. The
 * gate on the global chart answers a different question — whether a half-year
 * earned a marker at all.
 */
export function buildCensorshipMarkers(series, country, timeline, snap) {
  if (!series?.length || !timeline?.length) return []
  const cc = (country || '').toLowerCase()
  if (!cc || cc === 'global') return []

  const first = series[0].date
  const last = series[series.length - 1].date
  const markers = []

  for (const e of timeline) {
    if (!isCensorshipEvent(e) || !e.countries.includes(cc)) continue

    // An open-ended row is drawn at its onset. Turkey's 2016 block of Facebook
    // and Twitter is still open; the event is when it started, not every day
    // since.
    const rawEnd = e.ongoing ? addDays(e.start, 30) : e.end
    if (e.start > last || rawEnd < first) continue

    const start = e.start < first ? first : e.start
    const end = rawEnd > last ? last : rawEnd
    if (start > end) continue

    const startIdx = series.findIndex(p => p.date >= start)
    if (startIdx === -1) continue
    const window = series.filter(p => p.date >= start && p.date <= end)
    if (!window.length) continue

    const baseline = startIdx >= BASELINE_DAYS
      ? median(series.slice(startIdx - BASELINE_DAYS, startIdx).map(p => p.users))
      : median(series.slice(0, Math.max(startIdx, 1)).map(p => p.users))

    const high = window.reduce((a, b) => (b.users > a.users ? b : a))
    const low = window.reduce((a, b) => (b.users < a.users ? b : a))
    const up = baseline > 0 ? high.users / baseline : 1
    const down = baseline > 0 ? baseline / Math.max(low.users, 1) : 1
    const fell = down > up
    const extreme = fell ? low : high
    const ratio = fell ? down : up

    // Snapping a barely-moving event could drag its marker forty days onto an
    // unrelated wiggle, so only movements big enough to have made the feature
    // get to claim one.
    const markerDate = ratio >= SNAP_MIN_RATIO && snap
      ? snap(series, extreme.date, fell ? 'fall' : 'rise')
      : extreme.date

    markers.push({
      kind: 'censorship',
      id: `${cc}-cen-${e.start}-${e.desc.slice(0, 24)}`,
      event: e,
      markerDate,
      start,
      end,
      days: Math.round((Date.parse(end) - Date.parse(start)) / DAY) + 1,
      baseline,
      direction: fell ? 'fall' : 'rise',
      peakDate: extreme.date,
      peakUsers: extreme.users,
      ratio,
      excess: Math.abs(extreme.users - baseline),
    })
  }

  return markers
}
