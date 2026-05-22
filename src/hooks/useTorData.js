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
        setMeta({ countries: [] })
      })
      .finally(() => setLoading(false))
  }, [])

  async function loadCountryData(country) {
    const key = `relay/${country}`
    if (cache.current[key]) return

    try {
      const data = await fetch(`${BASE}/relay/${country}.json`).then(r => {
        if (!r.ok) throw new Error(`Failed to load data for ${country}`)
        return r.json()
      })
      cache.current[key] = data
    } catch (err) {
      cache.current[key] = []
      throw err
    }
  }

  function getCountryData(country) {
    return cache.current[`relay/${country}`] || []
  }

  function getGlobalData() {
    return cache.current['relay/global'] || []
  }

  async function loadGlobalData() {
    if (cache.current['relay/global']) return
    try {
      const data = await fetch(`${BASE}/relay/global.json`).then(r => {
        if (!r.ok) throw new Error('Failed to load global data')
        return r.json()
      })
      cache.current['relay/global'] = data
    } catch (err) {
      cache.current['relay/global'] = []
      throw err
    }
  }

  return {
    meta, loading, error,
    loadCountryData, loadGlobalData,
    getCountryData, getGlobalData,
  }
}
