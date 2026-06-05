import { useState, useMemo, useRef } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import { scaleSqrt } from 'd3-scale'
import { getAlpha2FromNumeric, getCountryCentroid } from '../utils/countryCodes'
import { HEX_GRID } from '../utils/hexGrid'
import { getCountryName } from '../utils/countries'

const GEO_URL = import.meta.env.BASE_URL + 'maps/countries-110m.json'

// Custom interpolator (avoid extra dep)
function colorFor(t) {
  // t in [0, 1], returns rgb()
  // Yellow -> Orange -> Red gradient
  const stops = [
    [255, 255, 178],
    [254, 217, 118],
    [254, 178, 76],
    [253, 141, 60],
    [240, 59, 32],
    [189, 0, 38],
  ]
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1)
  const i = Math.floor(x)
  const f = x - i
  const a = stops[i]
  const b = stops[Math.min(i + 1, stops.length - 1)]
  const r = Math.round(a[0] + (b[0] - a[0]) * f)
  const g = Math.round(a[1] + (b[1] - a[1]) * f)
  const bb = Math.round(a[2] + (b[2] - a[2]) * f)
  return `rgb(${r},${g},${bb})`
}

function formatNumber(n) {
  if (n == null || n === 0) return '0'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.round(n).toString()
}

export default function WorldMap({ snapshot, mode = 'choropleth', onSelect, selectedCountry }) {
  const [hover, setHover] = useState(null) // { country, x, y }
  const containerRef = useRef(null)

  // Compute color scale from data values (log-ish via sqrt of value)
  const { maxVal, minVal } = useMemo(() => {
    const vals = Object.values(snapshot || {}).filter(v => v > 0)
    if (vals.length === 0) return { maxVal: 1, minVal: 1 }
    return { maxVal: Math.max(...vals), minVal: Math.min(...vals) }
  }, [snapshot])

  const colorAt = (val) => {
    if (!val || val <= 0) return '#1a1a1a'
    // Use sqrt scale for better dynamic range (compresses big values)
    const t = Math.sqrt(val) / Math.sqrt(maxVal)
    return colorFor(t)
  }

  const showTooltip = (alpha2, evt) => {
    if (!alpha2) return setHover(null)
    const rect = containerRef.current?.getBoundingClientRect()
    setHover({
      country: alpha2,
      x: evt.clientX - (rect?.left || 0),
      y: evt.clientY - (rect?.top || 0),
    })
  }

  const handleClick = (alpha2) => {
    if (!alpha2 || !onSelect) return
    if (snapshot?.[alpha2] != null) onSelect(alpha2)
  }

  return (
    <div ref={containerRef} className="world-map">
      {mode === 'choropleth' && (
        <ChoroplethView snapshot={snapshot} colorAt={colorAt}
          onHover={showTooltip} onLeave={() => setHover(null)}
          onClick={handleClick} selectedCountry={selectedCountry} />
      )}
      {mode === 'bubble' && (
        <BubbleView snapshot={snapshot} maxVal={maxVal}
          onHover={showTooltip} onLeave={() => setHover(null)}
          onClick={handleClick} selectedCountry={selectedCountry} />
      )}
      {mode === 'hex' && (
        <HexView snapshot={snapshot} colorAt={colorAt}
          onHover={showTooltip} onLeave={() => setHover(null)}
          onClick={handleClick} selectedCountry={selectedCountry} />
      )}
      {mode === 'dorling' && (
        <DorlingView snapshot={snapshot} maxVal={maxVal} colorAt={colorAt}
          onHover={showTooltip} onLeave={() => setHover(null)}
          onClick={handleClick} selectedCountry={selectedCountry} />
      )}

      {hover && (
        <div className="map-tooltip" style={{ left: hover.x + 12, top: hover.y + 12 }}>
          <div className="tt-name">{getCountryName(hover.country)} <span className="tt-code">({hover.country.toUpperCase()})</span></div>
          <div className="tt-value">{formatNumber(snapshot?.[hover.country])} users</div>
        </div>
      )}

      <div className="map-legend">
        <div className="map-legend-title">Daily Users</div>
        <div className="map-legend-gradient" style={{
          background: `linear-gradient(to right, ${colorFor(0)}, ${colorFor(0.5)}, ${colorFor(1)})`,
        }} />
        <div className="map-legend-labels">
          <span>{formatNumber(minVal)}</span>
          <span>{formatNumber(maxVal)}</span>
        </div>
      </div>
    </div>
  )
}

// --- CHOROPLETH ---
function ChoroplethView({ snapshot, colorAt, onHover, onLeave, onClick, selectedCountry }) {
  return (
    <ComposableMap projection="geoEqualEarth" projectionConfig={{ scale: 155 }} style={{ width: '100%', height: '100%' }}>
      <Geographies geography={GEO_URL}>
        {({ geographies }) =>
          geographies.map((geo) => {
            const numeric = geo.id
            const alpha2 = getAlpha2FromNumeric(numeric)
            const value = alpha2 ? snapshot?.[alpha2] : null
            const isSelected = alpha2 === selectedCountry
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                onMouseEnter={(e) => alpha2 && onHover(alpha2, e)}
                onMouseMove={(e) => alpha2 && onHover(alpha2, e)}
                onMouseLeave={onLeave}
                onClick={() => alpha2 && onClick(alpha2)}
                style={{
                  default: {
                    fill: value ? colorAt(value) : '#1a1a1a',
                    stroke: isSelected ? '#fff' : '#222',
                    strokeWidth: isSelected ? 1.5 : 0.5,
                    outline: 'none',
                    cursor: value ? 'pointer' : 'default',
                  },
                  hover: {
                    fill: value ? colorAt(value) : '#1a1a1a',
                    stroke: '#fff',
                    strokeWidth: 1,
                    outline: 'none',
                    cursor: value ? 'pointer' : 'default',
                  },
                  pressed: { fill: '#4a90e2', outline: 'none' },
                }}
              />
            )
          })
        }
      </Geographies>
    </ComposableMap>
  )
}

// --- BUBBLE MAP ---
function BubbleView({ snapshot, maxVal, onHover, onLeave, onClick, selectedCountry }) {
  const radiusScale = scaleSqrt().domain([0, maxVal]).range([0, 30])

  return (
    <ComposableMap projection="geoEqualEarth" projectionConfig={{ scale: 155 }} style={{ width: '100%', height: '100%' }}>
      <Geographies geography={GEO_URL}>
        {({ geographies }) =>
          geographies.map((geo) => (
            <Geography
              key={geo.rsmKey}
              geography={geo}
              style={{
                default: { fill: '#1a1a1a', stroke: '#333', strokeWidth: 0.5, outline: 'none' },
                hover: { fill: '#1a1a1a', stroke: '#333', strokeWidth: 0.5, outline: 'none' },
                pressed: { fill: '#1a1a1a', outline: 'none' },
              }}
            />
          ))
        }
      </Geographies>
      {Object.entries(snapshot || {}).map(([country, value]) => {
        const centroid = getCountryCentroid(country)
        if (!centroid || !value) return null
        const isSelected = country === selectedCountry
        return (
          <Marker
            key={country}
            coordinates={[centroid[1], centroid[0]]}
            onMouseEnter={(e) => onHover(country, e)}
            onMouseMove={(e) => onHover(country, e)}
            onMouseLeave={onLeave}
            onClick={() => onClick(country)}
          >
            <circle
              r={radiusScale(value)}
              fill="rgba(74, 144, 226, 0.55)"
              stroke={isSelected ? '#fff' : '#4a90e2'}
              strokeWidth={isSelected ? 1.5 : 0.8}
              style={{ cursor: 'pointer' }}
            />
          </Marker>
        )
      })}
    </ComposableMap>
  )
}

// --- HEX CARTOGRAM ---
function HexView({ snapshot, colorAt, onHover, onLeave, onClick, selectedCountry }) {
  const HEX_SIZE = 22 // hex radius in px
  const HEX_GAP = 2
  const w = HEX_SIZE * 2
  const h = HEX_SIZE * Math.sqrt(3)

  // Find grid bounds
  const positions = Object.entries(HEX_GRID)
    .filter(([country]) => snapshot?.[country] != null)
    .map(([country, [col, row]]) => ({ country, col, row, value: snapshot[country] }))

  const minCol = Math.min(...positions.map(p => p.col))
  const maxCol = Math.max(...positions.map(p => p.col))
  const minRow = Math.min(...positions.map(p => p.row))
  const maxRow = Math.max(...positions.map(p => p.row))

  const totalWidth = (maxCol - minCol + 2) * (w * 0.75 + HEX_GAP)
  const totalHeight = (maxRow - minRow + 2) * (h + HEX_GAP)

  const hexPoints = (cx, cy, size) => {
    const pts = []
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i
      pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`)
    }
    return pts.join(' ')
  }

  return (
    <svg viewBox={`0 0 ${totalWidth} ${totalHeight}`} style={{ width: '100%', height: '100%' }}>
      {positions.map(({ country, col, row, value }) => {
        const x = (col - minCol) * (w * 0.75 + HEX_GAP) + w / 2
        const y = (row - minRow) * (h + HEX_GAP) + (col % 2 ? h / 2 : 0) + h / 2
        const isSelected = country === selectedCountry
        return (
          <g key={country}
            onMouseEnter={(e) => onHover(country, e)}
            onMouseMove={(e) => onHover(country, e)}
            onMouseLeave={onLeave}
            onClick={() => onClick(country)}
            style={{ cursor: 'pointer' }}
          >
            <polygon
              points={hexPoints(x, y, HEX_SIZE)}
              fill={colorAt(value)}
              stroke={isSelected ? '#fff' : '#0c0c0c'}
              strokeWidth={isSelected ? 2 : 1}
            />
            <text
              x={x} y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="9"
              fontFamily="SF Mono, Fira Code, monospace"
              fill={value > maxValEstimate(snapshot) * 0.4 ? '#0c0c0c' : '#fff'}
              style={{ pointerEvents: 'none' }}
            >
              {country.toUpperCase()}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function maxValEstimate(snapshot) {
  return Math.max(...Object.values(snapshot || {}).filter(v => v > 0), 1)
}

// --- DORLING CARTOGRAM ---
function DorlingView({ snapshot, maxVal, colorAt, onHover, onLeave, onClick, selectedCountry }) {
  const radiusScale = scaleSqrt().domain([0, maxVal]).range([0, 60])

  // Use centroids as initial positions, then run simple force packing
  const positions = useMemo(() => {
    const items = []
    for (const [country, value] of Object.entries(snapshot || {})) {
      const c = getCountryCentroid(country)
      if (!c || !value) continue
      const r = radiusScale(value)
      if (r < 2) continue // skip dust-sized
      items.push({
        country, value,
        x: (c[1] + 180) / 360 * 1000, // lng → x (0..1000)
        y: (90 - c[0]) / 180 * 500,   // lat → y (0..500)
        r,
      })
    }

    // Simple collision resolution: iterate a few times pushing apart overlapping circles
    for (let iter = 0; iter < 100; iter++) {
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i], b = items[j]
          const dx = b.x - a.x, dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const minDist = a.r + b.r + 1
          if (dist < minDist && dist > 0) {
            const overlap = (minDist - dist) / 2
            const nx = dx / dist, ny = dy / dist
            a.x -= nx * overlap
            a.y -= ny * overlap
            b.x += nx * overlap
            b.y += ny * overlap
          }
        }
      }
    }
    return items
  }, [snapshot, maxVal])

  return (
    <svg viewBox="0 0 1000 500" style={{ width: '100%', height: '100%' }}>
      {positions.map(({ country, value, x, y, r }) => {
        const isSelected = country === selectedCountry
        return (
          <g key={country}
            onMouseEnter={(e) => onHover(country, e)}
            onMouseMove={(e) => onHover(country, e)}
            onMouseLeave={onLeave}
            onClick={() => onClick(country)}
            style={{ cursor: 'pointer' }}
          >
            <circle cx={x} cy={y} r={r}
              fill={colorAt(value)}
              stroke={isSelected ? '#fff' : '#0c0c0c'}
              strokeWidth={isSelected ? 2 : 0.5}
              opacity={0.92}
            />
            {r > 10 && (
              <text x={x} y={y}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={Math.min(r * 0.55, 14)}
                fontFamily="SF Mono, Fira Code, monospace"
                fill="#0c0c0c"
                style={{ pointerEvents: 'none' }}
              >
                {country.toUpperCase()}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
