import { useState, useEffect, useRef } from 'react'

const BASE = import.meta.env.BASE_URL + 'data'

export function useTorData() {
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const cache = useRef({})

  useEffect(() => {
    fetch(`${BASE}/meta.json`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load metadata')
        return r.json()
      })
      .then(data => setMeta(data))
      .catch(err => {
        setError(err.message)
        setMeta({ relay: { countries: [], topCountries: [] }, bridge: { countries: [], topCountries: [] } })
      })
      .finally(() => setLoading(false))
  }, [])

  async function loadCountryData(dataType, country) {
    const key = `${dataType}/${country}`
    if (cache.current[key]) return cache.current[key]

    try {
      const data = await fetch(`${BASE}/${dataType}/${country}.json`).then(r => {
        if (!r.ok) throw new Error(`Failed to load ${dataType} data for ${country}`)
        return r.json()
      })
      cache.current[key] = data
      return data
    } catch (err) {
      cache.current[key] = []
      throw err
    }
  }

  async function loadCountries(dataType, countries) {
    return Promise.all(countries.map(c => loadCountryData(dataType, c).catch(() => [])))
  }

  function getCountryData(dataType, country) {
    return cache.current[`${dataType}/${country}`] || []
  }

  async function loadGlobalData(dataType) {
    const key = `${dataType}/global`
    if (cache.current[key]) return cache.current[key]
    try {
      const data = await fetch(`${BASE}/${dataType}/global.json`).then(r => {
        if (!r.ok) throw new Error(`Failed to load global ${dataType} data`)
        return r.json()
      })
      cache.current[key] = data
      return data
    } catch (err) {
      cache.current[key] = []
      throw err
    }
  }

  function getGlobalData(dataType) {
    return cache.current[`${dataType}/global`] || []
  }

  return {
    meta, loading, error,
    loadCountryData, loadGlobalData, loadCountries,
    getCountryData, getGlobalData,
  }
}
