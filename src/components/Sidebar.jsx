import { useState, useMemo } from 'react'
import { getCountryName, getRegion } from '../utils/countries'

const REGION_ORDER = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania', 'Special', 'Other']

export default function Sidebar({ countries = [], selectedCountry, onSelect }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return countries
    const q = search.toLowerCase()
    return countries.filter(c =>
      c.toLowerCase().includes(q) || getCountryName(c).toLowerCase().includes(q)
    )
  }, [countries, search])

  const grouped = useMemo(() => {
    const groups = {}
    for (const country of filtered) {
      const region = getRegion(country)
      if (!groups[region]) groups[region] = []
      groups[region].push(country)
    }
    for (const region in groups) {
      groups[region].sort((a, b) => getCountryName(a).localeCompare(getCountryName(b)))
    }
    return groups
  }, [filtered])

  return (
    <div className="sidebar">
      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Filter countries..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="sidebar-section">
        <h3>Overview</h3>
        <div
          className={`instance-item ${selectedCountry === 'global' ? 'selected' : ''}`}
          onClick={() => onSelect('global')}
        >
          <span>Global</span>
          <span className="price">All users</span>
        </div>
      </div>

      {REGION_ORDER.map(region => {
        const items = grouped[region]
        if (!items || items.length === 0) return null
        return (
          <div className="sidebar-section" key={region}>
            <h3>{region}</h3>
            {items.map(country => (
              <div
                key={country}
                className={`instance-item ${country === selectedCountry ? 'selected' : ''}`}
                onClick={() => onSelect(country)}
              >
                <span>{getCountryName(country)}</span>
                <span className="price">{country.toUpperCase()}</span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
