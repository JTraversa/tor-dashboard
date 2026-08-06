/**
 * Turns the Tor Project's metrics-timeline into public/data/timeline.json.
 *
 * Source: https://gitlab.torproject.org/tpo/network-health/metrics/timeline
 * That repo is a single README.md holding a markdown table of every event the
 * Tor Project thinks might affect its own graphs — hand-maintained, ~800 rows,
 * back to 2008. A vendored copy lives at data-sources/metrics-timeline.md.
 *
 * It is vendored rather than fetched because gitlab.torproject.org answers
 * every non-browser request with 403, including the raw-file and API
 * endpoints. To refresh it, download the repo in a browser and replace the
 * vendored file; the format has been stable for years.
 *
 * The rendered "Related events" table on metrics.torproject.org is fetchable
 * and carries the same rows, but drops the two most useful columns (protocols,
 * and the "?" flag), so it is not used here.
 *
 * Table columns: start | end | places | protocols | description | links | ?
 *   - end is blank (point event), a date, or the literal "ongoing"
 *   - places are ISO-3166 alpha-2, space separated
 *   - "?" holds an X when Tor sees a change in the data but knows of no cause
 *
 * Run via `npm run collect`, or `npm run timeline` on its own.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const SRC = process.argv[2] || path.join(ROOT, 'data-sources', 'metrics-timeline.md')
const OUT = path.join(ROOT, 'public', 'data', 'timeline.json')
const REPO = 'https://gitlab.torproject.org/tpo/network-health/metrics/timeline'

/**
 * Routine plumbing that can never explain a movement in the user graphs.
 * Dropping it is what makes the rest usable: 114 of ~800 rows are geoip
 * database bumps and snowflake host reboots, and they cluster densely enough
 * to sit under almost any spike you care to pick.
 *
 * This is deliberately narrow — it matches boilerplate phrasing, not topics.
 * Snowflake *outages* and broker changes stay, because those do move the
 * numbers. No row carrying a country code or a "?" flag matches any of these.
 */
const ROUTINE = [
  // Geolocation refreshes genuinely do shuffle users between countries, which
  // is why Tor records them, but there are ~150 and they land under almost any
  // window you pick. Keeping them would drown every real explanation.
  /\bgeoip\d?\b.{0,40}\bdatabases? (updated|entries)/i,
  /^Update snowflake-\d+ /i,
  /^Planned maintenance/i,
  /^Reboot(ed)? (of )?snowflake/i,
  /^Release of Tor Browser/i,
  /^Tor Browser [\d.]+ (is )?released/i,
  /reaches end of life/i,
  /^Migrat(e|ed|ion) (of )?snowflake/i,
]

// No trailing \b on these groups: it would make "block" fail to match
// "blocks", which is how most of the table is actually worded.
const RULES = {
  shutdown: /\b(shut ?downs?|blackout|connectivity (?:loss|outage)|internet (?:disruption|outage)|curfew)/i,
  unrest: /\b(election|protest|coup\b|uprising|unrest|invasion|war\b|riot|demonstrat|referendum|assassinat)/i,
  // Bare "ban" is allowed but bounded, so it catches "Twitter ban in Turkey"
  // without matching Bangladesh or bandwidth.
  censorship: /\b(block|censor|throttl|filter|ban\b|ban(?:ned|s|ning)\b|restrict|unblock|interference|dpi\b)/i,
  network: /\b(relay|bridge|directory authorit|snowflake|obfs|meek|webtunnel|conjure|flashproxy|bandwidth|consensus|bug|outage|upgrade|release|version|deploy|maintenance|performance|ddos|denial of service|onion service|descriptor|broker|prox(?:y|ies)|cdn\b|domain front)/i,
}

/**
 * The timeline has no category column, so it is inferred from the description.
 *
 * Which rule wins depends on whether the row carries a country. A country code
 * means a human decided the row is about that country, so it is read
 * politically: "Internet shutdown in Uganda during general election" is a
 * shutdown first and an election second. With no country the row is nearly
 * always Tor's own infrastructure, and the network rule goes first — otherwise
 * "Release of tor 0.4.8.22, includes a change to count consensus downloads"
 * trips the censorship rule on the word "count"-adjacent phrasing and gets
 * filed as censorship.
 */
function categorize(desc, countries) {
  const order = countries.length
    ? ['shutdown', 'unrest', 'censorship', 'network']
    : ['network', 'shutdown', 'unrest', 'censorship']
  for (const cat of order) if (RULES[cat].test(desc)) return cat
  return 'other'
}

// Markdown inline links: [text](url), space separated in the links column.
function parseLinks(cell) {
  return [...cell.matchAll(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g)]
    .map(m => ({ text: m[1].trim() || 'link', url: m[2] }))
}

/**
 * Pull an ISO date out of a cell, or null.
 *
 * Cells are not always bare dates. Approximate ones are written with a tilde
 * ("~2014-04-24"), some carry a time of day, and some give only a month. A
 * previous version took `cell.slice(0, 10)`, which turned "~2014-04-24" into
 * "~2014-04-2" — and since "~" sorts above every digit, string comparison then
 * placed that end date after every real date in the file. Four rows silently
 * became open-ended and matched every window from 2013 onward, which is how a
 * 2013 botnet ended up cited as context for a 2025 spike.
 *
 * `endOfMonth` matters for the same reason in the other direction: a range
 * ending "~2017-08" should cover August, not stop on the 1st.
 */
function parseDate(cell, endOfMonth = false) {
  const full = cell.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (full) return full[0]
  const month = cell.match(/(\d{4})-(\d{2})(?!-?\d)/)
  if (!month) return null
  if (!endOfMonth) return `${month[1]}-${month[2]}-01`
  const last = new Date(Date.UTC(Number(month[1]), Number(month[2]), 0)).getUTCDate()
  return `${month[1]}-${month[2]}-${String(last).padStart(2, '0')}`
}

function unescape(s) {
  // The column separator forces backslash escapes in prose, and the source is
  // markdown, so `#` and `_` arrive escaped too. Backticks wrap digests.
  return s.replace(/\\([|#_*[\]()\\])/g, '$1').replace(/`/g, '').replace(/\s+/g, ' ').trim()
}

const md = await fs.readFile(SRC, 'utf8')
const rows = md.split('\n').filter(l => /^\|\d{4}-\d{2}-\d{2}/.test(l))
if (rows.length < 400) {
  throw new Error(`only found ${rows.length} table rows in ${SRC}; expected ~800 — refusing to overwrite`)
}

let routine = 0
const events = []
for (const line of rows) {
  const cells = line.split('|').slice(1)
  const [start, end, places, protocols, description, links, unknown] = cells.map(c => (c || '').trim())

  const desc = unescape(description)
  if (!desc) continue
  if (ROUTINE.some(r => r.test(desc))) { routine++; continue }

  const countries = places.split(/\s+/).filter(c => /^[a-z]{2}$/.test(c))
  const ongoing = end === 'ongoing'

  const startDate = parseDate(start)
  if (!startDate) continue
  // Three cases, and conflating the first two is a trap: a blank end column
  // means a point event that begins and ends the same day, while the literal
  // "ongoing" means it has started and not finished. Treating blank as
  // open-ended lets a one-day event in 2017 match a spike in 2025.
  let endDate = ongoing ? null : (parseDate(end, true) || startDate)
  // An unparseable or backwards end date collapses to a point event rather
  // than being trusted; a bad range is worse than no range.
  if (endDate && endDate < startDate) endDate = startDate

  events.push({
    start: startDate,
    end: endDate,
    ongoing,
    countries,
    protocols: protocols.split(/\s+/).filter(Boolean),
    category: categorize(desc, countries),
    // Tor's own "significant change visible, no cause known" flag. Worth
    // keeping distinct from our detector finding nothing: it means somebody
    // looked and came up empty, which is a stronger statement.
    unknown: /x/i.test(unknown || ''),
    desc,
    links: parseLinks(links),
  })
}

// Guard the whole file rather than trusting the parser. Every date must be a
// bare ISO day, because everything downstream compares these as strings, and a
// stray character silently reorders the entire timeline.
const ISO = /^\d{4}-\d{2}-\d{2}$/
for (const e of events) {
  if (!ISO.test(e.start) || (e.end !== null && !ISO.test(e.end))) {
    throw new Error(`malformed date in "${e.desc.slice(0, 60)}": ${e.start} → ${e.end}`)
  }
}

events.sort((a, b) => a.start.localeCompare(b.start) || (a.end || '').localeCompare(b.end || ''))

await fs.writeFile(OUT, JSON.stringify({
  source: REPO,
  vendored: path.relative(ROOT, SRC).replace(/\\/g, '/'),
  generated: new Date().toISOString().slice(0, 10),
  events,
}))

const byCat = {}
for (const e of events) byCat[e.category] = (byCat[e.category] || 0) + 1
console.log(`timeline: ${events.length} events kept, ${routine} routine rows dropped`)
console.log(`  span          ${events[0].start} to ${events.at(-1).start}`)
console.log(`  country-tagged ${events.filter(e => e.countries.length).length}`)
console.log(`  unknown cause  ${events.filter(e => e.unknown).length}`)
console.log(`  by category    ${Object.entries(byCat).map(([k, v]) => `${k}=${v}`).join(' ')}`)
console.log(`  -> ${path.relative(ROOT, OUT)}`)
