import { useState, useEffect, useMemo } from 'react'
import { useTorData } from './hooks/useTorData'
import SiteHeader from './components/SiteHeader'
import Socialicons from './components/Socialicons'
import Header from './components/Header'
import Controls from './components/Controls'
import Sidebar from './components/Sidebar'
import Chart, { COUNTRY_COLORS } from './components/Chart'
import Footer from './components/Footer'
import { getCountryName } from './utils/countries'

function formatNumber(n) {
  if (n == null) return '—'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.round(n).toString()
}

export default function App() {
  const { meta, loading, error, loadCountryData, loadGlobalData, loadCountries, getCountryData, getGlobalData } = useTorData()
  const [selectedCountry, setSelectedCountry] = useState('global')
  const [dataPoints, setDataPoints] = useState([])
  const [topCountriesData, setTopCountriesData] = useState(null)
  const [loadingData, setLoadingData] = useState(false)
  const [timeRange, setTimeRange] = useState('all')
  const [chartType, setChartType] = useState('area')
  const [hiddenCountries, setHiddenCountries] = useState(new Set())
  const [hideGlobalLine, setHideGlobalLine] = useState(false)

  useEffect(() => {
    if (!meta) return

    setLoadingData(true)
    const load = async () => {
      try {
        if (selectedCountry === 'global') {
          await loadGlobalData()
          setDataPoints(getGlobalData())

          // Load top 10 countries for toggle
          const tops = meta.topCountries || []
          if (tops.length > 0) {
            await loadCountries(tops)
            const map = {}
            for (const c of tops) {
              map[c] = getCountryData(c)
            }
            setTopCountriesData(map)
          } else {
            setTopCountriesData(null)
          }
        } else {
          await loadCountryData(selectedCountry)
          setDataPoints(getCountryData(selectedCountry))
          setTopCountriesData(null)
        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoadingData(false)
      }
    }

    load()
  }, [selectedCountry, meta])

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

  const isGlobalView = selectedCountry === 'global'
  const topCountries = meta?.topCountries || []

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
      <Header stats={stats} />
      <Controls
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        chartType={chartType}
        setChartType={setChartType}
        selectedCountry={selectedCountry}
      />

      <div className="main">
        <Sidebar
          countries={meta?.countries || []}
          selectedCountry={selectedCountry}
          onSelect={setSelectedCountry}
        />

        <div className="chart-area">
          <div className="y-axis-label">Estimated Users</div>
          <div className="chart-title">
            <span className="instance-name">{countryLabel}</span>
            {' '}&mdash; Tor Relay Users
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
              />
            </div>
          ) : (
            <div className="no-data-msg">No data available for this selection</div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
