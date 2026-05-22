import { useState, useEffect } from 'react'
import { useTorData } from './hooks/useTorData'
import Chart from './components/Chart'
import Controls from './components/Controls'
import Header from './components/Header'

export default function App() {
  const { meta, loading, error, loadCountryData, loadGlobalData, getCountryData, getGlobalData } = useTorData()
  const [selectedCountry, setSelectedCountry] = useState('global')
  const [dataPoints, setDataPoints] = useState([])
  const [loadingData, setLoadingData] = useState(false)

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

  if (loading) {
    return (
      <div className="container">
        <Header />
        <div className="loading">Loading metrics...</div>
      </div>
    )
  }

  if (error && !meta) {
    return (
      <div className="container">
        <Header />
        <div className="error">Error: {error}</div>
      </div>
    )
  }

  const chartTitle = selectedCountry === 'global'
    ? 'Global Tor Relay Users Over Time'
    : `Tor Relay Users in ${selectedCountry.toUpperCase()} Over Time`

  return (
    <>
      <Header />
      <div className="container">
        <Controls
          countries={meta?.countries || []}
          selectedCountry={selectedCountry}
          onCountryChange={setSelectedCountry}
        />

        {loadingData ? (
          <div className="loading">Loading data...</div>
        ) : dataPoints.length > 0 ? (
          <div className="chart-container">
            <div className="chart-title">{chartTitle}</div>
            <Chart data={dataPoints} />
          </div>
        ) : (
          <div className="error">No data available for this selection.</div>
        )}

        <footer>
          <p>Data from <a href="https://metrics.torproject.org/" target="_blank" rel="noopener noreferrer">Tor Metrics</a></p>
          <p>© 2024 Tor Project. Data available under CC0 1.0 Universal.</p>
        </footer>
      </div>
    </>
  )
}
