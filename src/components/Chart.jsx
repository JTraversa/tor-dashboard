import { useEffect, useRef, useState } from 'react'
import { createChart, CrosshairMode, LineSeries, AreaSeries } from 'lightweight-charts'

export default function Chart({ data, chartType = 'area' }) {
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
    if (!containerRef.current || !data || data.length === 0) return

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

    const chartData = data.map(d => ({ time: d.date, value: d.users }))

    let mainSeries
    if (chartType === 'area') {
      mainSeries = chart.addSeries(AreaSeries, {
        lineColor: '#2563eb',
        topColor: 'rgba(37, 99, 235, 0.3)',
        bottomColor: 'rgba(37, 99, 235, 0.02)',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
      })
    } else {
      mainSeries = chart.addSeries(LineSeries, {
        color: '#2563eb',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
      })
    }
    mainSeries.setData(chartData)

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
  }, [data, chartType, theme])

  return <div ref={containerRef} className="chart-container" style={{ width: '100%', height: '100%' }} />
}
