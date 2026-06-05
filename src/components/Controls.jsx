const RANGES = [
  { label: '1M', days: 30 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: '5Y', days: 1825 },
  { label: 'ALL', days: 'all' },
]

const CHART_TYPES = [
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
]

const DATA_TYPES = [
  { value: 'relay', label: 'Relay' },
  { value: 'bridge', label: 'Bridge' },
]

const VIEW_MODES = [
  { value: 'chart', label: 'Chart' },
  { value: 'map', label: 'Map' },
]

const MAP_MODES = [
  { value: 'choropleth', label: 'Choropleth' },
  { value: 'bubble', label: 'Bubble' },
  { value: 'hex', label: 'Hex' },
  { value: 'dorling', label: 'Cartogram' },
]

export default function Controls({
  timeRange, setTimeRange,
  chartType, setChartType,
  dataType, setDataType,
  viewMode, setViewMode,
  mapMode, setMapMode,
  selectedCountry,
}) {
  const label = selectedCountry === 'global' ? 'Global' : selectedCountry.toUpperCase()
  const isMapView = viewMode === 'map'

  return (
    <div className="controls">
      <div className="control-group">
        <label>View</label>
        <div className="btn-group">
          {VIEW_MODES.map(v => (
            <button
              key={v.value}
              className={viewMode === v.value ? 'active' : ''}
              onClick={() => setViewMode(v.value)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="control-group">
        <label>Data Type</label>
        <div className="btn-group">
          {DATA_TYPES.map(t => (
            <button
              key={t.value}
              className={dataType === t.value ? 'active' : ''}
              onClick={() => setDataType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {isMapView ? (
        <div className="control-group">
          <label>Map Style</label>
          <div className="btn-group">
            {MAP_MODES.map(m => (
              <button
                key={m.value}
                className={mapMode === m.value ? 'active' : ''}
                onClick={() => setMapMode(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="control-group">
            <label>Region</label>
            <div className="btn-group">
              <button className="active">{label}</button>
            </div>
          </div>

          <div className="control-group">
            <label>Chart Type</label>
            <div className="btn-group">
              {CHART_TYPES.map(t => (
                <button
                  key={t.value}
                  className={chartType === t.value ? 'active' : ''}
                  onClick={() => setChartType(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label>Time Range</label>
            <div className="btn-group">
              {RANGES.map(r => (
                <button
                  key={r.label}
                  className={timeRange === r.days ? 'active' : ''}
                  onClick={() => setTimeRange(r.days)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
