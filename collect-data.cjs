const fs = require('fs')
const path = require('path')
const https = require('https')

const DATA_DIR = path.join(__dirname, 'public', 'data')

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

async function processDataset({ name, csvUrl, subDir }) {
  console.log(`\n=== Processing ${name} ===`)
  console.log(`Downloading from ${csvUrl}...`)
  const csvContent = await fetchUrl(csvUrl)

  console.log('Parsing CSV...')
  const rows = parseCSV(csvContent)

  if (rows.length === 0) {
    console.error(`No rows parsed from ${name} CSV`)
    console.log('First 500 chars of CSV:', csvContent.substring(0, 500))
    return null
  }

  console.log('First row keys:', Object.keys(rows[0]))
  console.log('First row sample:', JSON.stringify(rows[0]))

  const outDir = path.join(DATA_DIR, subDir)
  ensureDir(outDir)

  const countryMap = new Map()
  const globalData = {}

  for (const row of rows) {
    const date = row.date
    const country = row.country
    const users = row.users

    if (!date || users === undefined || users === null) continue

    // Global aggregate row (country is null)
    if (!country || country === null || country === '??') {
      if (!globalData[date]) globalData[date] = 0
      globalData[date] = Math.max(globalData[date], users)
      continue
    }

    if (!/^[a-z]{2}$/.test(country.toLowerCase())) {
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

    if (!globalData[date]) globalData[date] = 0
    globalData[date] += users
  }

  console.log(`Processing data for ${countryMap.size} countries...`)

  // Write per-country files
  for (const [country, data] of countryMap.entries()) {
    const sorted = data.sort((a, b) => a.date.localeCompare(b.date))
    const filePath = path.join(outDir, `${country}.json`)
    fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2))
  }
  console.log(`Wrote ${countryMap.size} country files`)

  // Write global aggregated data
  const globalArray = Object.entries(globalData)
    .map(([date, users]) => ({ date, users: Math.round(users) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  fs.writeFileSync(
    path.join(outDir, 'global.json'),
    JSON.stringify(globalArray, null, 2)
  )
  console.log(`Wrote global: ${globalArray.length} data points`)

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
  console.log(`Top 10 ${name} countries: ${topCountries.join(', ')}`)

  const countries = Array.from(countryMap.keys()).sort()

  return {
    countries,
    topCountries,
    totalCountries: countries.length,
    firstDate: globalArray[0]?.date || null,
    lastDate: globalArray[globalArray.length - 1]?.date || null,
    dataPoints: globalArray.length,
  }
}

async function fetchAndProcessTorData() {
  ensureDir(DATA_DIR)

  try {
    const relayMeta = await processDataset({
      name: 'Relay Users',
      csvUrl: 'https://metrics.torproject.org/userstats-relay-country.csv',
      subDir: 'relay',
    })

    const bridgeMeta = await processDataset({
      name: 'Bridge Users',
      csvUrl: 'https://metrics.torproject.org/userstats-bridge-country.csv',
      subDir: 'bridge',
    })

    // Combined metadata with both datasets
    const meta = {
      lastUpdated: new Date().toISOString(),
      dataSource: 'https://metrics.torproject.org/',
      relay: relayMeta,
      bridge: bridgeMeta,
      // Legacy fields for backward compatibility (default to relay)
      countries: relayMeta?.countries || [],
      topCountries: relayMeta?.topCountries || [],
      totalCountries: relayMeta?.totalCountries || 0,
    }

    fs.writeFileSync(
      path.join(DATA_DIR, 'meta.json'),
      JSON.stringify(meta, null, 2)
    )

    console.log(`\n=== Summary ===`)
    console.log(`Relay: ${relayMeta?.totalCountries || 0} countries, ${relayMeta?.dataPoints || 0} global points (${relayMeta?.firstDate} → ${relayMeta?.lastDate})`)
    console.log(`Bridge: ${bridgeMeta?.totalCountries || 0} countries, ${bridgeMeta?.dataPoints || 0} global points (${bridgeMeta?.firstDate} → ${bridgeMeta?.lastDate})`)
    console.log(`Last updated: ${meta.lastUpdated}`)
    console.log('Done!')

  } catch (err) {
    console.error('Error:', err.message)
    console.error(err.stack)
    process.exit(1)
  }
}

fetchAndProcessTorData()
