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

export default function Controls({
  timeRange, setTimeRange,
  chartType, setChartType,
  dataType, setDataType,
  selectedCountry,
}) {
  const label = selectedCountry === 'global' ? 'Global' : selectedCountry.toUpperCase()

  return (
    <div className="controls">
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
    </div>
  )
}
