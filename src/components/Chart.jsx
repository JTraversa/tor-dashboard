import { useEffect, useRef, useState } from 'react'
import { createChart, CrosshairMode, LineSeries, AreaSeries } from 'lightweight-charts'
import { getCountryName } from '../utils/countries'

// Distinct color palette for country lines
const COUNTRY_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6',
  '#ec4899', '#f97316', '#84cc16', '#14b8a6', '#a855f7',
  '#6366f1', '#22c55e',
]

export default function Chart({ data, chartType = 'area', countriesData = null, hiddenCountries = new Set(), showGlobal = true }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'dark')

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') || 'dark')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    if ((!data || data.length === 0) && (!countriesData || Object.keys(countriesData).length === 0)) return

    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
    }

    const styles = getComputedStyle(document.documentElement)
    const bgColor = styles.getPropertyValue('--bg-primary').trim() || '#0c0c0c'
    const borderColor = styles.getPropertyValue('--border').trim() || 'rgba(255,255,255,0.12)'
    const textColor = styles.getPropertyValue('--text-secondary').trim() || 'rgba(255,255,255,0.5)'
    const accentColor = styles.getPropertyValue('--accent').trim() || 'rgb(80, 120, 190)'

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: 'solid', color: bgColor },
        textColor: textColor,
        fontSize: 12,
      },
      grid: {
        vertLines: { color: borderColor },
        horzLines: { color: borderColor },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: borderColor, width: 1, style: 2, labelBackgroundColor: accentColor },
        horzLine: { color: borderColor, width: 1, style: 2, labelBackgroundColor: accentColor },
      },
      rightPriceScale: {
        borderColor: borderColor,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: borderColor,
        timeVisible: false,
        rightOffset: 5,
        minBarSpacing: 0.5,
      },
      handleScroll: { vertTouchDrag: false },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      localization: {
        priceFormatter: (price) => {
          if (price >= 1e6) return (price / 1e6).toFixed(2) + 'M'
          if (price >= 1e3) return (price / 1e3).toFixed(0) + 'K'
          return price.toFixed(0)
        },
      },
    })

    chartRef.current = chart

    // Render main / global line
    if (data && data.length > 0 && showGlobal) {
      const chartData = data.map(d => ({ time: d.date, value: d.users }))

      if (chartType === 'area') {
        chart.addSeries(AreaSeries, {
          lineColor: '#2563eb',
          topColor: 'rgba(37, 99, 235, 0.3)',
          bottomColor: 'rgba(37, 99, 235, 0.02)',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: countriesData ? 'Global' : '',
        }).setData(chartData)
      } else {
        chart.addSeries(LineSeries, {
          color: '#2563eb',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: countriesData ? 'Global' : '',
        }).setData(chartData)
      }
    }

    // Render per-country lines
    if (countriesData) {
      const entries = Object.entries(countriesData)
      for (let i = 0; i < entries.length; i++) {
        const [country, points] = entries[i]
        if (!points || points.length === 0) continue
        if (hiddenCountries.has(country)) continue

        const color = COUNTRY_COLORS[i % COUNTRY_COLORS.length]
        const seriesData = points.map(d => ({ time: d.date, value: d.users }))

        chart.addSeries(LineSeries, {
          color,
          lineWidth: 1.5,
          priceLineVisible: false,
          lastValueVisible: true,
          title: country.toUpperCase(),
        }).setData(seriesData)
      }
    }

    chart.timeScale().fitContent()

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [data, chartType, theme, countriesData, hiddenCountries, showGlobal])

  return <div ref={containerRef} className="chart-container" style={{ width: '100%', height: '100%' }} />
}

export { COUNTRY_COLORS }
