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

  async function loadSnapshot(dataType) {
    const key = `${dataType}/snapshot`
    if (cache.current[key]) return cache.current[key]
    try {
      const data = await fetch(`${BASE}/${dataType}/snapshot.json`).then(r => {
        if (!r.ok) throw new Error(`Failed to load ${dataType} snapshot`)
        return r.json()
      })
      cache.current[key] = data
      return data
    } catch (err) {
      cache.current[key] = {}
      throw err
    }
  }

  function getSnapshot(dataType) {
    return cache.current[`${dataType}/snapshot`] || {}
  }

  // Network-wide spike windows, precomputed by detect-anomalies.mjs. Absent
  // file is not an error: the dashboard just falls back to leaving those
  // spikes unlabelled.
  async function loadAnomalies(dataType) {
    const key = `${dataType}/anomalies`
    if (cache.current[key]) return cache.current[key]
    try {
      const data = await fetch(`${BASE}/${dataType}/anomalies.json`).then(r => {
        if (!r.ok) throw new Error(`Failed to load ${dataType} anomalies`)
        return r.json()
      })
      cache.current[key] = Array.isArray(data) ? data : []
    } catch {
      cache.current[key] = []
    }
    return cache.current[key]
  }

  function getAnomalies(dataType) {
    return cache.current[`${dataType}/anomalies`] || []
  }

  // The Tor Project's own event timeline, built by collect-timeline.mjs. Not
  // split by data type — it is one list covering relay and bridge alike. Like
  // anomalies, a missing file degrades to "no annotations" rather than erroring.
  async function loadTimeline() {
    if (cache.current.timeline) return cache.current.timeline
    try {
      const data = await fetch(`${BASE}/timeline.json`).then(r => {
        if (!r.ok) throw new Error('Failed to load timeline')
        return r.json()
      })
      cache.current.timeline = Array.isArray(data?.events) ? data.events : []
    } catch {
      cache.current.timeline = []
    }
    return cache.current.timeline
  }

  function getTimeline() {
    return cache.current.timeline || []
  }

  // Half-yearly censorship notes for the worldwide chart, from
  // build-periods.mjs. Not split by data type: the events are the same either
  // way, only their measured impact differs.
  async function loadPeriods() {
    if (cache.current.periods) return cache.current.periods
    try {
      const data = await fetch(`${BASE}/periods.json`).then(r => {
        if (!r.ok) throw new Error('Failed to load periods')
        return r.json()
      })
      cache.current.periods = Array.isArray(data) ? data : []
    } catch {
      cache.current.periods = []
    }
    return cache.current.periods
  }

  function getPeriods() {
    return cache.current.periods || []
  }


  return {
    meta, loading, error,
    loadCountryData, loadGlobalData, loadCountries, loadSnapshot, loadAnomalies, loadTimeline, loadPeriods,
    getCountryData, getGlobalData, getSnapshot, getAnomalies, getTimeline, getPeriods,
  }
}
