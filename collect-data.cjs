const fs = require('fs')
const path = require('path')
const https = require('https')

const DATA_DIR = path.join(__dirname, 'public', 'data')
const RELAY_DIR = path.join(DATA_DIR, 'relay')

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    }).on('error', reject)
  })
}

function parseCSV(content) {
  const lines = content.trim().split('\n').filter(l => l.trim() && !l.startsWith('#'))
  if (lines.length === 0) return []

  const headerLine = lines[0]
  const headers = headerLine.split(',').map(h => h.trim())
  const data = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = line.split(',').map(v => v.trim())
    const row = {}
    headers.forEach((header, idx) => {
      const val = values[idx]
      if (val === '' || val === undefined) {
        row[header] = null
      } else {
        const num = Number(val)
        row[header] = isNaN(num) ? val : num
      }
    })
    data.push(row)
  }

  return data
}

async function fetchAndProcessTorData() {
  console.log('Fetching Tor relay user statistics...')

  ensureDir(RELAY_DIR)

  try {
    const csvUrl = 'https://metrics.torproject.org/userstats-relay-country.csv'
    console.log(`Downloading from ${csvUrl}...`)
    const csvContent = await fetchUrl(csvUrl)

    console.log('Parsing CSV...')
    const rows = parseCSV(csvContent)

    if (rows.length === 0) {
      console.error('No rows parsed from CSV')
      console.log('First 500 chars of CSV:', csvContent.substring(0, 500))
      process.exit(1)
    }

    // Debug first row to see column names
    console.log('First row keys:', Object.keys(rows[0]))
    console.log('First row sample:', JSON.stringify(rows[0]))

    const countryMap = new Map()
    const globalData = {}

    for (const row of rows) {
      const date = row.date
      const country = row.country
      const users = row.users

      // Skip rows without date or users
      if (!date || users === undefined || users === null) continue

      // Global aggregate row (country is null) - sum for global
      if (!country || country === null || country === '??') {
        if (!globalData[date]) {
          globalData[date] = 0
        }
        globalData[date] = Math.max(globalData[date], users)
        continue
      }

      // Skip invalid country codes
      if (!/^[a-z]{2}$/.test(country.toLowerCase())) {
        console.log(`Skipping invalid country code: "${country}"`)
        continue
      }

      const countryLower = country.toLowerCase()
      if (!countryMap.has(countryLower)) {
        countryMap.set(countryLower, [])
      }

      countryMap.get(countryLower).push({
        date,
        users: Math.round(users),
      })

      if (!globalData[date]) {
        globalData[date] = 0
      }
      globalData[date] += users
    }

    console.log(`Processing data for ${countryMap.size} countries...`)

    // Write per-country files
    for (const [country, data] of countryMap.entries()) {
      const sorted = data.sort((a, b) => a.date.localeCompare(b.date))
      const filePath = path.join(RELAY_DIR, `${country}.json`)
      fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2))
      console.log(`  Written ${country}: ${sorted.length} data points`)
    }

    // Write global aggregated data
    const globalArray = Object.entries(globalData)
      .map(([date, users]) => ({
        date,
        users: Math.round(users),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    fs.writeFileSync(
      path.join(RELAY_DIR, 'global.json'),
      JSON.stringify(globalArray, null, 2)
    )
    console.log(`  Written global: ${globalArray.length} data points`)

    // Calculate top 10 countries by average users in the last 90 days
    const recentCutoff = (() => {
      const lastDate = globalArray[globalArray.length - 1]?.date
      if (!lastDate) return null
      const d = new Date(lastDate)
      d.setDate(d.getDate() - 90)
      return d.toISOString().slice(0, 10)
    })()

    const countryAverages = []
    for (const [country, data] of countryMap.entries()) {
      const recent = recentCutoff
        ? data.filter(d => d.date >= recentCutoff)
        : data.slice(-90)
      if (recent.length === 0) continue
      const avg = recent.reduce((sum, d) => sum + d.users, 0) / recent.length
      countryAverages.push({ country, avg })
    }
    countryAverages.sort((a, b) => b.avg - a.avg)
    const topCountries = countryAverages.slice(0, 10).map(c => c.country)
    console.log(`Top 10 countries: ${topCountries.join(', ')}`)

    // Write metadata
    const countries = Array.from(countryMap.keys()).sort()
    const meta = {
      countries,
      topCountries,
      lastUpdated: new Date().toISOString(),
      totalCountries: countries.length,
      dataSource: 'https://metrics.torproject.org/',
    }

    fs.writeFileSync(
      path.join(DATA_DIR, 'meta.json'),
      JSON.stringify(meta, null, 2)
    )
    console.log(`\nMetadata written with ${countries.length} countries`)
    console.log(`Last updated: ${meta.lastUpdated}`)
    console.log('Done!')

  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

fetchAndProcessTorData()
