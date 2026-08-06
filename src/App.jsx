import { useState, useEffect, useMemo } from 'react'
import { useTorData } from './hooks/useTorData'
import SiteHeader from './components/SiteHeader'
import Socialicons from './components/Socialicons'
import Header from './components/Header'
import Controls from './components/Controls'
import Sidebar from './components/Sidebar'
import Chart, { COUNTRY_COLORS } from './components/Chart'
import WorldMap from './components/WorldMap'
import SpikePanel from './components/SpikePanel'
import Footer from './components/Footer'
import { getCountryName } from './utils/countries'
import { detectSpikes, detectLevelShifts } from './utils/spikes'
import { matchEvent, matchAnomaly, CATEGORIES, UNEXPLAINED, categoryColor } from './data/spikeEvents'
import { buildPeriodMarkers } from './data/periods'
import { useTheme } from './hooks/useTheme'

const MAX_UNEXPLAINED_MARKERS = 8

// Identifies what a marker is explained by, so a plateau and the spike inside
// it can be recognised as the same story. Null means nothing explains it.
// What a marker is explained by, so a plateau and the spike inside it are
// recognised as one story. Null means nothing explains it.
function explanationKey(s) {
  if (s.kind === 'period') return `period:${s.period.period}`
  if (s.event) return `event:${s.event.id}`
  if (s.anomaly) return `anomaly:${s.anomaly.start}`
  return null
}

function formatNumber(n) {
  if (n == null) return '—'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.round(n).toString()
}

export default function App() {
  const {
    meta, loading, error,
    loadCountryData, loadGlobalData, loadCountries, loadSnapshot, loadAnomalies, loadPeriods,
    getCountryData, getGlobalData, getSnapshot, getAnomalies, getPeriods,
  } = useTorData()

  // Bridges are where censorship shows up: people reach for them when direct
  // access is blocked, so the events in the timeline move this series most.
  const [dataType, setDataType] = useState('bridge')
  const [viewMode, setViewMode] = useState('chart')
  const [mapMode, setMapMode] = useState('choropleth')
  const [selectedCountry, setSelectedCountry] = useState('global')
  const [dataPoints, setDataPoints] = useState([])
  const [topCountriesData, setTopCountriesData] = useState(null)
  const [snapshot, setSnapshot] = useState({})
  const [anomalies, setAnomalies] = useState([])
  const [periods, setPeriods] = useState([])
  const [loadingData, setLoadingData] = useState(false)
  const [timeRange, setTimeRange] = useState('all')
  const [chartType, setChartType] = useState('area')
  const [hiddenCountries, setHiddenCountries] = useState(new Set())
  const [hideGlobalLine, setHideGlobalLine] = useState(false)
  const theme = useTheme()
  const [showSpikes, setShowSpikes] = useState(true)
  const [selectedSpikeId, setSelectedSpikeId] = useState(null)

  const dataMeta = meta?.[dataType] || meta || {}
  const countries = dataMeta.countries || []
  const topCountries = dataMeta.topCountries || []

  useEffect(() => {
    if (!meta) return
    if (selectedCountry !== 'global' && countries.length > 0 && !countries.includes(selectedCountry)) {
      setSelectedCountry('global')
    }
  }, [dataType, meta])

  useEffect(() => {
    if (!meta) return

    setLoadingData(true)
    setHiddenCountries(new Set())
    const load = async () => {
      try {
        // Always load snapshot for the current data type (used by map view)
        await loadSnapshot(dataType)
        setSnapshot(getSnapshot(dataType))

        await loadAnomalies(dataType)
        setAnomalies(getAnomalies(dataType))

        await loadPeriods()
        setPeriods(getPeriods())

        if (selectedCountry === 'global') {
          await loadGlobalData(dataType)
          setDataPoints(getGlobalData(dataType))

          if (topCountries.length > 0) {
            await loadCountries(dataType, topCountries)
            const map = {}
            for (const c of topCountries) {
              map[c] = getCountryData(dataType, c)
            }
            setTopCountriesData(map)
          } else {
            setTopCountriesData(null)
          }
        } else {
          await loadCountryData(dataType, selectedCountry)
          setDataPoints(getCountryData(dataType, selectedCountry))
          setTopCountriesData(null)
        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoadingData(false)
      }
    }

    load()
  }, [selectedCountry, dataType, meta])

  const filteredData = useMemo(() => {
    if (!dataPoints || dataPoints.length === 0) return []
    if (timeRange === 'all') return dataPoints

    const latestDate = new Date(dataPoints[dataPoints.length - 1].date)
    const cutoff = new Date(latestDate)
    cutoff.setDate(cutoff.getDate() - timeRange)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    return dataPoints.filter(d => d.date >= cutoffStr)
  }, [dataPoints, timeRange])

  const filteredTopCountriesData = useMemo(() => {
    if (!topCountriesData) return null
    if (timeRange === 'all') return topCountriesData

    const result = {}
    for (const [country, points] of Object.entries(topCountriesData)) {
      if (!points || points.length === 0) continue
      const latestDate = new Date(points[points.length - 1].date)
      const cutoff = new Date(latestDate)
      cutoff.setDate(cutoff.getDate() - timeRange)
      const cutoffStr = cutoff.toISOString().slice(0, 10)
      result[country] = points.filter(d => d.date >= cutoffStr)
    }
    return result
  }, [topCountriesData, timeRange])

  const stats = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return { current: '—', change: '—', peak: '—', count: '—', changeClass: 'neutral' }
    }
    const latest = filteredData[filteredData.length - 1]
    const first = filteredData[0]
    const change = first.users === 0 ? 0 : ((latest.users - first.users) / first.users * 100)
    const changeClass = change >= 0 ? 'up' : 'down'
    const icon = change >= 0 ? '▲' : '▼'
    const peak = Math.max(...filteredData.map(d => d.users))

    return {
      current: formatNumber(latest.users),
      change: `${icon} ${Math.abs(change).toFixed(1)}%`,
      peak: formatNumber(peak),
      count: filteredData.length.toLocaleString(),
      changeClass,
    }
  }, [filteredData])

  // Detect on the full series, not the visible window: the baseline needs 60
  // days of lead-in, and a spike should not appear or vanish just because the
  // user switched time range. The result is filtered to the window afterwards.
  const allSpikes = useMemo(() => {
    if (!dataPoints || dataPoints.length === 0) return []

    // Source 1: censorship, rolled up per half-year and drawn on the worldwide
    // chart only. Individual events are national and mostly invisible against
    // the global line; the half-year is the unit that reads.
    const censorship = buildPeriodMarkers(dataPoints, selectedCountry, periods, dataType)

    // Source 2: anomalies. What our own detectors find, which once censorship
    // is accounted for is largely the botnet and metrics-artifact class.
    const label = (item, kind, markerDate) => {
      const event = matchEvent(item, selectedCountry, dataType)
      return {
        ...item,
        kind,
        markerDate,
        id: `${selectedCountry}-${dataType}-${kind}-${markerDate}`,
        event,
        // Only consulted when no curated entry applies, so a researched
        // national event is never demoted to "this happened everywhere".
        anomaly: event ? null : matchAnomaly(item, anomalies),
      }
    }

    // Two questions, two detectors. detectSpikes finds days that broke sharply
    // from their own recent past; detectLevelShifts finds months-long plateaus
    // a trailing baseline cannot see, because it climbs into the new level and
    // the shift stops looking like one.
    const spikes = detectSpikes(dataPoints).map(s => label(s, 'spike', s.peakDate))
    const shifts = detectLevelShifts(dataPoints).map(s => label(s, 'shift', s.start))

    // A plateau usually contains the sharp day that started it. Keep the
    // plateau and drop the redundant spike only when both say the same thing.
    const covered = shifts.filter(s => explanationKey(s))
    const keptSpikes = spikes.filter(sp =>
      !covered.some(sh =>
        sp.peakDate >= sh.start && sp.peakDate <= sh.end &&
        (explanationKey(sp) === explanationKey(sh) || !explanationKey(sp))
      )
    )
    const detected = [...shifts, ...keptSpikes]

    // The two sets coexist rather than suppressing one another. A censorship
    // note covers six months, so dropping every anomaly that overlaps one
    // would erase almost all of them — and they are answering different
    // questions anyway: what was censored, versus what looks like machines.
    return [...censorship, ...detected]
  }, [dataPoints, selectedCountry, dataType, anomalies, periods])

  // Noisy series (China and Turkey both clear 20 detections over the full
  // history) would otherwise bury the annotated spikes under a row of grey
  // dots. Every explained spike is always kept; unexplained ones are capped at
  // the largest few by absolute excess.
  const visibleSpikes = useMemo(() => {
    if (!showSpikes || filteredData.length === 0) return []
    const from = filteredData[0].date
    const to = filteredData[filteredData.length - 1].date
    const inRange = allSpikes.filter(s => s.markerDate >= from && s.markerDate <= to)

    const labelled = inRange.filter(s => explanationKey(s))
    const unlabelled = inRange
      .filter(s => !explanationKey(s))
      .sort((a, b) => b.excess - a.excess)
      .slice(0, MAX_UNEXPLAINED_MARKERS)

    return [...labelled, ...unlabelled].sort((a, b) => a.markerDate.localeCompare(b.markerDate))
  }, [allSpikes, filteredData, showSpikes])

  const selectedSpike = useMemo(
    () => visibleSpikes.find(s => s.id === selectedSpikeId) || null,
    [visibleSpikes, selectedSpikeId]
  )

  // Counted by what the marker actually is under the current model, not by
  // which lookup happened to fire.
  const censorshipCount = visibleSpikes.filter(s => s.kind === 'period').length
  const anomalyCount = visibleSpikes.filter(s => s.kind !== 'period' && (s.event || s.anomaly)).length
  const unexplainedCount = visibleSpikes.filter(s => !explanationKey(s)).length

  const toggleCountry = (country) => {
    setHiddenCountries(prev => {
      const next = new Set(prev)
      if (next.has(country)) next.delete(country)
      else next.add(country)
      return next
    })
  }

  const countryLabel = selectedCountry === 'global'
    ? 'Global'
    : getCountryName(selectedCountry)

  const dataTypeLabel = dataType === 'bridge' ? 'Tor Bridge Users' : 'Tor Relay Users'
  const isGlobalView = selectedCountry === 'global'
  const isMapView = viewMode === 'map'

  if (loading) {
    return (
      <div className="app">
        <SiteHeader />
        <Socialicons />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', marginTop: 50 }}>
          Loading metrics...
        </div>
      </div>
    )
  }

  if (error && !meta) {
    return (
      <div className="app">
        <SiteHeader />
        <Socialicons />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--error)', marginTop: 50 }}>
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <SiteHeader />
      <Socialicons />
      <Header stats={stats} dataType={dataType} />
      <Controls
        dataType={dataType}
        setDataType={setDataType}
        viewMode={viewMode}
        setViewMode={setViewMode}
        mapMode={mapMode}
        setMapMode={setMapMode}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        chartType={chartType}
        setChartType={setChartType}
        selectedCountry={selectedCountry}
        showSpikes={showSpikes}
        setShowSpikes={setShowSpikes}
      />

      <div className="main">
        <Sidebar
          countries={countries}
          selectedCountry={selectedCountry}
          onSelect={setSelectedCountry}
        />

        <div className="chart-area">
          {isMapView ? (
            <>
              <div className="chart-title">
                <span className="instance-name">{dataTypeLabel}</span>
                {' '}&mdash; Geographic Distribution (avg last 30 days)
              </div>
              {loadingData ? (
                <div className="no-data-msg">Loading map data...</div>
              ) : (
                <WorldMap
                  snapshot={snapshot}
                  mode={mapMode}
                  selectedCountry={selectedCountry}
                  onSelect={setSelectedCountry}
                />
              )}
            </>
          ) : (
            <>
              <div className="y-axis-label">Estimated Users</div>
              <div className="chart-title">
                <span className="instance-name">{countryLabel}</span>
                {' '}&mdash; {dataTypeLabel}
              </div>

              {isGlobalView && topCountries.length > 0 && (
                <div className="country-legend">
                  <div
                    className={`country-legend-item country-legend-global ${hideGlobalLine ? 'inactive' : 'active'}`}
                    onClick={() => setHideGlobalLine(v => !v)}
                  >
                    <div className="country-legend-checkbox">
                      <div className="country-legend-checkbox-inner" style={{ backgroundColor: '#2563eb' }} />
                    </div>
                    Global
                  </div>
                  {topCountries.map((c, i) => (
                    <div
                      key={c}
                      className={`country-legend-item ${hiddenCountries.has(c) ? 'inactive' : 'active'}`}
                      onClick={() => toggleCountry(c)}
                    >
                      <div className="country-legend-checkbox">
                        <div
                          className="country-legend-checkbox-inner"
                          style={{ backgroundColor: COUNTRY_COLORS[i % COUNTRY_COLORS.length] }}
                        />
                      </div>
                      {c.toUpperCase()}
                    </div>
                  ))}
                </div>
              )}

              {loadingData ? (
                <div className="no-data-msg">Loading data...</div>
              ) : filteredData.length > 0 ? (
                <div className="chart-container">
                  <Chart
                    data={filteredData}
                    chartType={chartType}
                    countriesData={isGlobalView ? filteredTopCountriesData : null}
                    hiddenCountries={hiddenCountries}
                    showGlobal={!hideGlobalLine}
                    spikes={hideGlobalLine ? [] : visibleSpikes}
                    selectedSpikeId={selectedSpikeId}
                    onSelectSpike={setSelectedSpikeId}
                  />
                  {showSpikes && !hideGlobalLine && visibleSpikes.length > 0 && (
                    <div className="spike-legend">
                      <span className="spike-legend-count">
                        {visibleSpikes.length} marker{visibleSpikes.length === 1 ? '' : 's'}
                        {censorshipCount > 0 && ` · ${censorshipCount} censorship note${censorshipCount === 1 ? '' : 's'}`}
                        {anomalyCount > 0 && ` · ${anomalyCount} anomal${anomalyCount === 1 ? 'y' : 'ies'}`}
                        {unexplainedCount > 0 && ` · ${unexplainedCount} unexplained`}
                      </span>
                      {Object.entries(CATEGORIES).map(([key, cat]) => (
                        <span key={key} className="spike-legend-item" title={cat.description}>
                          <span className="spike-legend-dot" style={{ background: categoryColor(cat, theme) }} />
                          {cat.label}
                        </span>
                      ))}
                      <span className="spike-legend-item" title={UNEXPLAINED.description}>
                        <span
                          className="spike-legend-dot"
                          style={{ background: categoryColor(UNEXPLAINED, theme) }}
                        />
                        {UNEXPLAINED.label}
                      </span>
                      <span className="spike-legend-item" title="Circle: a censorship note, or a single-day anomaly. Square: a sustained anomaly.">
                        <span className="spike-legend-dot spike-legend-dot-square" />
                        ● note · ■ sustained
                      </span>
                    </div>
                  )}
                  <SpikePanel
                    spike={selectedSpike}
                    regionLabel={countryLabel}
                    onClose={() => setSelectedSpikeId(null)}
                  />
                </div>
              ) : (
                <div className="no-data-msg">No data available for this selection</div>
              )}
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
