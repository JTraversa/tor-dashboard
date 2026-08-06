/**
 * Half-yearly censorship notes for the worldwide chart.
 *
 * public/data/periods.json is built by build-periods.mjs, which groups the 135
 * censorship events from Tor's own list into at most one note per half-year,
 * keeps only the half-years where censorship drove a notable uptick, and ranks
 * each note's events by what they actually did to the user counts.
 *
 * Each note carries a marker date per chart. The relay and bridge lines peak
 * on different days, and the date the leading event peaked in its own country
 * is usually neither — which left dots sitting partway up a rise. build-periods
 * snaps each one onto a genuine turning point of the line it will be drawn on:
 * a crest where a block pushed people onto Tor, a trough where Tor itself was
 * cut off.
 *
 * These are the only censorship markers drawn. Individual events belong to
 * individual countries and are not marked on the worldwide line, where a
 * decade of national blocks would be an unreadable stripe of dots and where
 * most of them are far too small to see anyway.
 */

export function buildPeriodMarkers(series, country, periods, dataType = 'bridge') {
  if (!series?.length || !periods?.length) return []
  const cc = (country || '').toLowerCase()
  if (cc && cc !== 'global') return []

  const first = series[0].date
  const last = series[series.length - 1].date

  return periods
    .map(p => ({ p, markerDate: p.markerDates?.[dataType] || p.leadPeakDate }))
    .filter(({ markerDate }) => markerDate >= first && markerDate <= last)
    .map(({ p, markerDate }) => ({
      kind: 'period',
      id: `period-${p.period}`,
      period: p,
      markerDate,
      // The whole half-year, so a detected anomaly inside it can be recognised
      // as overlapping.
      start: p.start,
      end: p.end,
      peakDate: markerDate,
      // Ordering only; a period note is never in the unexplained bucket.
      excess: p.headline[0]?.impact?.delta ?? 0,
    }))
}
