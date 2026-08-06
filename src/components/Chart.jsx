import { useEffect, useRef } from 'react'
import { createChart, CrosshairMode, LineSeries, AreaSeries, createSeriesMarkers } from 'lightweight-charts'
import { UNEXPLAINED, categoryColor, markerCategory } from '../data/spikeEvents'
import { useTheme } from '../hooks/useTheme'

// Distinct color palette for country lines
const COUNTRY_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6',
  '#ec4899', '#f97316', '#84cc16', '#14b8a6', '#a855f7',
  '#6366f1', '#22c55e',
]

/**
 * Markers sit on the data line, just above the point they describe.
 *
 * An earlier version hung them from a transparent flat series so they formed
 * one row across the top of the chart. That was the right call when there were
 * thousands of them and a row was the only readable arrangement. Now that the
 * censorship notes are rolled up to at most one per half-year, there are few
 * enough to put each one where it belongs: on the peak its catalyst caused.
 *
 * `position: 'atPriceTop'` renders nothing in this library — verified in a
 * real browser — which is what forced the rail in the first place. `aboveBar`
 * against the real series is the working way to track the line.
 */
function buildMarkers(spikes, selectedSpikeId, theme) {
  return spikes.map(s => ({
    id: s.id,
    time: s.markerDate,
    position: 'aboveBar',
    // Dots throughout. Direction arrows were tried and dropped: a censorship
    // note covers a half-year containing moves in both directions, so a single
    // arrow was picking one of them to stand for the rest. Square still marks
    // a sustained anomaly, which is a property of the marker, not a claim.
    shape: s.kind === 'shift' ? 'square' : 'circle',
    color: categoryColor(markerCategory(s), theme),
    size: s.id === selectedSpikeId ? 2.4 : 1.6,
    // The "?" is reserved for markers nothing explains at all.
    text: markerCategory(s) === UNEXPLAINED ? '?' : '',
  }))
}

export default function Chart({
  data,
  chartType = 'area',
  countriesData = null,
  hiddenCountries = new Set(),
  showGlobal = true,
  spikes = [],
  selectedSpikeId = null,
  onSelectSpike,
}) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const mainSeriesRef = useRef(null)
  const markersRef = useRef(null)
  // Spike props are mirrored into refs so the chart's own click/crosshair
  // handlers, which are registered once per chart, can read current values
  // without the chart being rebuilt on every selection change.
  const onSelectRef = useRef(onSelectSpike)
  const spikesRef = useRef(spikes)
  const selectedSpikeIdRef = useRef(selectedSpikeId)

  const theme = useTheme()

  // Declared before the chart effect so it runs first in every commit: a
  // rebuild triggered by a theme or chart-type change then reattaches markers
  // from up-to-date refs.
  useEffect(() => {
    onSelectRef.current = onSelectSpike
    spikesRef.current = spikes
    selectedSpikeIdRef.current = selectedSpikeId
  })

  useEffect(() => {
    if (!containerRef.current) return
    if ((!data || data.length === 0) && (!countriesData || Object.keys(countriesData).length === 0)) return

    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
    }

    const styles = getComputedStyle(document.documentElement)
    const bgColor = styles.getPropertyValue('--bg-primary').trim() || '#0c0c0c'
    const borderColor = styles.getPropertyValue('--border').trim() || 'rgba(255,255,255,0.12)'
    const textColor = styles.getPropertyValue('--text-secondary').trim() || 'rgba(255,255,255,0.5)'
    const accentColor = styles.getPropertyValue('--accent').trim() || 'rgb(80, 120, 190)'

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: 'solid', color: bgColor },
        textColor: textColor,
        fontSize: 12,
      },
      grid: {
        vertLines: { color: borderColor },
        horzLines: { color: borderColor },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: borderColor, width: 1, style: 2, labelBackgroundColor: accentColor },
        horzLine: { color: borderColor, width: 1, style: 2, labelBackgroundColor: accentColor },
      },
      rightPriceScale: {
        borderColor: borderColor,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: borderColor,
        timeVisible: false,
        rightOffset: 5,
        // 5,342 daily points need under 0.25px each to fit a ~1,200px chart.
        // At the old 0.5 floor fitContent() could not compress that far and
        // silently showed only the most recent ~6 years, so "ALL" hid
        // everything before 2020 — including the 2013 and 2017 events.
        minBarSpacing: 0.02,
      },
      handleScroll: { vertTouchDrag: false },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      localization: {
        priceFormatter: (price) => {
          if (price >= 1e6) return (price / 1e6).toFixed(2) + 'M'
          if (price >= 1e3) return (price / 1e3).toFixed(0) + 'K'
          return price.toFixed(0)
        },
      },
    })

    chartRef.current = chart
    mainSeriesRef.current = null
    markersRef.current = null

    // Render main / global line
    if (data && data.length > 0 && showGlobal) {
      const chartData = data.map(d => ({ time: d.date, value: d.users }))
      if (chartType === 'area') {
        mainSeriesRef.current = chart.addSeries(AreaSeries, {
          lineColor: '#2563eb',
          topColor: 'rgba(37, 99, 235, 0.3)',
          bottomColor: 'rgba(37, 99, 235, 0.02)',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: countriesData ? 'Global' : '',
        })
      } else {
        mainSeriesRef.current = chart.addSeries(LineSeries, {
          color: '#2563eb',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: countriesData ? 'Global' : '',
        })
      }
      mainSeriesRef.current.setData(chartData)

      // Attach markers as part of building the chart, reading the current
      // props from refs. The effect below then updates them in place; that
      // keeps spike changes from forcing a full chart rebuild, without
      // needing extra state to signal that the series is ready.
      markersRef.current = createSeriesMarkers(
        mainSeriesRef.current,
        buildMarkers(spikesRef.current, selectedSpikeIdRef.current, theme)
      )
    }

    // Render per-country lines
    if (countriesData) {
      const entries = Object.entries(countriesData)
      for (let i = 0; i < entries.length; i++) {
        const [country, points] = entries[i]
        if (!points || points.length === 0) continue
        if (hiddenCountries.has(country)) continue

        const color = COUNTRY_COLORS[i % COUNTRY_COLORS.length]
        const seriesData = points.map(d => ({ time: d.date, value: d.users }))

        chart.addSeries(LineSeries, {
          color,
          lineWidth: 1.5,
          priceLineVisible: false,
          lastValueVisible: true,
          title: country.toUpperCase(),
        }).setData(seriesData)
      }
    }

    chart.timeScale().fitContent()

    // Clicking a marker opens its detail panel; clicking bare chart closes it.
    // hoveredObjectId is the marker id set by the series-markers plugin.
    chart.subscribeClick((param) => {
      const handler = onSelectRef.current
      if (!handler) return
      const id = param.hoveredObjectId
      if (typeof id === 'string' && spikesRef.current.some(s => s.id === id)) {
        handler(id)
      } else {
        handler(null)
      }
    })

    chart.subscribeCrosshairMove((param) => {
      if (!containerRef.current) return
      const id = param.hoveredObjectId
      const overMarker = typeof id === 'string' && spikesRef.current.some(s => s.id === id)
      containerRef.current.style.cursor = overMarker ? 'pointer' : 'default'
    })

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      mainSeriesRef.current = null
      markersRef.current = null
      }
  }, [data, chartType, theme, countriesData, hiddenCountries, showGlobal])

  // Update markers in place when the spike set or selection changes, so
  // opening a panel does not tear down and refit the whole chart.
  useEffect(() => {
    if (!markersRef.current) return
    markersRef.current.setMarkers(buildMarkers(spikes, selectedSpikeId, theme))
  }, [spikes, selectedSpikeId, theme])

  return <div ref={containerRef} className="chart-container" style={{ width: '100%', height: '100%' }} />
}

export { COUNTRY_COLORS }
