import { useEffect, useRef } from 'react'
import { createChart } from 'lightweight-charts'

export default function Chart({ data }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) return

    const chart = createChart(containerRef.current, {
      layout: {
        textColor: '#e0e0e0',
        background: { color: '#1a1a1a' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      grid: {
        vertLines: { color: '#333' },
        horzLines: { color: '#333' },
      },
    })

    const lineSeries = chart.addLineSeries({
      color: '#4a90e2',
      lineWidth: 2,
    })

    lineSeries.setData(data.map(d => ({
      time: d.date,
      value: d.users,
    })))

    chart.timeScale().fitContent()

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [data])

  return <div ref={containerRef} style={{ height: '400px', width: '100%' }} />
}
