import { useState, useEffect, useMemo } from 'react'
import { useTorData } from './hooks/useTorData'
import SiteHeader from './components/SiteHeader'
import Socialicons from './components/Socialicons'
import Header from './components/Header'
import Controls from './components/Controls'
import Sidebar from './components/Sidebar'
import Chart from './components/Chart'
import Footer from './components/Footer'
import { getCountryName } from './utils/countries'

function formatNumber(n) {
  if (n == null) return '—'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.round(n).toString()
}

export default function App() {
  const { meta, loading, error, loadCountryData, loadGlobalData, getCountryData, getGlobalData } = useTorData()
  const [selectedCountry, setSelectedCountry] = useState('global')
  const [dataPoints, setDataPoints] = useState([])
  const [loadingData, setLoadingData] = useState(false)
  const [timeRange, setTimeRange] = useState('all')
  const [chartType, setChartType] = useState('area')

  useEffect(() => {
    if (!meta) return

    setLoadingData(true)
    const load = async () => {
      try {
        if (selectedCountry === 'global') {
          await loadGlobalData()
          setDataPoints(getGlobalData())
        } else {
          await loadCountryData(selectedCountry)
          setDataPoints(getCountryData(selectedCountry))
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

  const countryLabel = selectedCountry === 'global'
    ? 'Global'
    : getCountryName(selectedCountry)

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
          {loadingData ? (
            <div className="no-data-msg">Loading data...</div>
          ) : filteredData.length > 0 ? (
            <div className="chart-container">
              <Chart data={filteredData} chartType={chartType} />
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
