import { useState, useEffect } from 'react'

/**
 * Current theme, tracked off the `data-theme` attribute the toggle sets on
 * <html>. Needed by anything that has to pick a colour in JS rather than CSS —
 * chart markers are painted to a canvas and cannot inherit a CSS variable, and
 * the legend has to match them exactly.
 */
export function useTheme() {
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') || 'dark'
  )

  useEffect(() => {
    const read = () => setTheme(document.documentElement.getAttribute('data-theme') || 'dark')
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  return theme
}
