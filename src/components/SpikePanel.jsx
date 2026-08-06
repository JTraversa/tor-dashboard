import { UNEXPLAINED, categoryColor, markerCategory } from '../data/spikeEvents'
import { useTheme } from '../hooks/useTheme'

const TIMELINE_REPO = 'https://gitlab.torproject.org/tpo/network-health/metrics/timeline'

function formatUsers(n) {
  if (n == null) return '—'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.round(n).toLocaleString()
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'link'
  }
}

function periodLabel(period) {
  const [year, half] = period.split('-')
  return `${half === 'H1' ? 'Jan–Jun' : 'Jul–Dec'} ${year}`
}

function searchUrl(spike, regionLabel) {
  const q = `Tor ${regionLabel} internet censorship ${formatDate(spike.peakDate)}`
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`
}

export default function SpikePanel({ spike, regionLabel, onClose }) {
  const theme = useTheme()
  if (!spike) return null

  const isPeriod = spike.kind === 'period'
  const p = isPeriod ? spike.period : null
  const category = markerCategory(spike)
  const color = categoryColor(category, theme)
  const isShift = spike.kind === 'shift'

  const curated = !isPeriod ? spike.event : null
  const anomaly = !isPeriod && !curated ? spike.anomaly : null

  return (
    <div className="spike-panel">
      <div className="spike-panel-head" style={{ borderLeftColor: color }}>
        <div className="spike-panel-tag" style={{ color }}>
          <span className="spike-panel-dot" style={{ background: color }} />
          {isShift && <span className="spike-panel-kind">Sustained</span>}
          {category === UNEXPLAINED ? 'No documented cause' : category.label}
          {isPeriod && <span className="spike-panel-src">Tor timeline</span>}
        </div>
        <button className="spike-panel-close" onClick={onClose} aria-label="Close">×</button>
      </div>

      <h3 className="spike-panel-title">
        {isPeriod
          ? `${periodLabel(p.period)} — ${p.total} censorship event${p.total === 1 ? '' : 's'} in ${p.countries} countr${p.countries === 1 ? 'y' : 'ies'}`
          : curated
            ? curated.title
            : anomaly
              ? `Network-wide ${isShift ? 'shift' : 'spike'} — ${anomaly.countries} countries at once`
              : isShift
                ? `Unexplained sustained rise in ${regionLabel}`
                : `Unexplained spike in ${regionLabel}`}
      </h3>

      {isPeriod ? (
        <div className="spike-panel-stats">
          <div>
            <label>Period</label>
            <span>{periodLabel(p.period)}</span>
          </div>
          <div>
            <label>Events</label>
            <span>
              {p.total}
              {p.occurrences > p.total && ` (${p.occurrences} occurrences)`}
            </span>
          </div>
          <div>
            <label>Countries</label>
            <span>{p.countries}</span>
          </div>
          <div>
            <label>Shutdowns</label>
            <span className={p.shutdowns > 0 ? 'stat-down' : ''}>
              {p.shutdowns > 0 ? `${p.shutdowns} national` : 'none'}
            </span>
          </div>
        </div>
      ) : (
        <div className="spike-panel-stats">
          <div>
            <label>{isShift ? 'Period' : 'Peak'}</label>
            <span>
              {isShift
                ? `${formatDate(spike.start)} – ${formatDate(spike.end)}`
                : formatDate(spike.peakDate)}
            </span>
          </div>
          <div>
            <label>{isShift ? 'Duration' : 'Users'}</label>
            <span>{isShift ? `${spike.days} days` : formatUsers(spike.peakUsers)}</span>
          </div>
          <div>
            <label>{isShift ? 'Held at' : 'vs. baseline'}</label>
            <span>{spike.ratio.toFixed(1)}× baseline</span>
          </div>
          <div>
            <label>{isShift ? 'Peak' : 'Elevated'}</label>
            <span>
              {isShift
                ? `${formatUsers(spike.peakUsers)} on ${formatDate(spike.peakDate)}`
                : spike.start === spike.end
                  ? '1 day'
                  : `${formatDate(spike.start)} – ${formatDate(spike.end)}`}
            </span>
          </div>
        </div>
      )}

      {isPeriod ? (
        <>
          <p className="spike-panel-summary">
            {p.lead.direction === 'fall'
              ? `This half-year is marked because censorship in ${p.lead.cc.toUpperCase()} drove
                 usage down from ${formatUsers(p.lead.baseline)} to ${formatUsers(p.lead.users)},
                 ${p.lead.ratio}× below its normal level — the largest movement any documented
                 block produced in the period. The marker sits on that trough. A collapse is
                 what blocking Tor itself looks like: the clients cannot reach the network to
                 be counted at all.`
              : `This half-year is marked because censorship in ${p.lead.cc.toUpperCase()} drove
                 usage from ${formatUsers(p.lead.baseline)} to ${formatUsers(p.lead.users)},
                 ${p.lead.ratio}× its normal level — the largest movement any documented block
                 produced in the period. The marker sits on that peak.`}
            {p.falls > 0 && p.lead.direction !== 'fall' &&
              ` ${p.falls} of the ${p.total} event${p.total === 1 ? '' : 's'} below pushed usage down instead, which is what blocking Tor itself does.`}
          </p>
          <div className="period-events">
            {p.headline.map(e => (
              <div className="period-event" key={e.start + e.desc.slice(0, 20)}>
                <div className="period-event-head">
                  <span className="period-event-cc">
                    {e.countries.map(c => c.toUpperCase()).join(' ')}
                  </span>
                  <span className={`period-event-move ${e.impact.direction === 'fall' ? 'stat-down' : 'stat-up'}`}>
                    {e.impact.direction === 'fall' ? '▼' : '▲'} {e.impact.ratio}×
                  </span>
                  <span className="period-event-date">{formatDate(e.start)}</span>
                  {e.occurrences > 1 && (
                    <span className="period-event-rep">×{e.occurrences}</span>
                  )}
                </div>
                <p className="period-event-desc">{e.desc}</p>
                <p className="period-event-impact">
                  {e.impact.dataType === 'bridge' ? 'Bridge' : 'Direct'} users in{' '}
                  {e.impact.cc.toUpperCase()}{' '}
                  {e.impact.direction === 'fall' ? 'fell from' : 'rose from'}{' '}
                  {formatUsers(e.impact.baseline)} to {formatUsers(e.impact.users)}
                  {e.links[0] && (
                    <a href={e.links[0].url} target="_blank" rel="noopener noreferrer">
                      {hostOf(e.links[0].url)}
                    </a>
                  )}
                </p>
              </div>
            ))}
          </div>

          {p.rest.length > 0 && (
            <div className="period-rest">
              <label>Also this half-year</label>
              <ul>
                {p.rest.map(e => (
                  <li key={e.start + e.desc.slice(0, 20)}>
                    <span className="ctx-date">{e.countries.map(c => c.toUpperCase()).join(' ')}</span>
                    <span className="ctx-desc">
                      {e.desc}
                      {e.occurrences > 1 && ` (×${e.occurrences})`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="spike-panel-sources">
            <a href={TIMELINE_REPO} target="_blank" rel="noopener noreferrer">
              <span className="src-title">Tor metrics timeline</span>
              <span className="src-pub">The Tor Project</span>
            </a>
          </div>
        </>
      ) : curated ? (
        <>
          <p className="spike-panel-summary">{curated.summary}</p>
          <div className="spike-panel-sources">
            <label>Sources</label>
            {curated.sources.map(s => (
              <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">
                <span className="src-title">{s.title}</span>
                <span className="src-pub">{s.publisher}</span>
              </a>
            ))}
          </div>
        </>
      ) : anomaly ? (
        <>
          <p className="spike-panel-summary">
            {anomaly.countries} countries jumped together between{' '}
            {formatDate(anomaly.start)} and {formatDate(anomaly.end)}, and the largest of
            them accounts for only {Math.round(anomaly.leadShare * 100)}% of the combined
            rise. National censorship does not spread across unrelated countries in the
            same week, so this is almost certainly machine traffic or a change in how
            clients were counted — not {regionLabel} specifically.
          </p>
          <div className="spike-panel-peers">
            <label>Largest movers in this window</label>
            <div className="spike-panel-peer-list">
              {anomaly.top.map(t => (
                <span key={t.cc} className="spike-panel-peer">
                  {t.cc.toUpperCase()}
                  <em>+{formatUsers(t.excess)}</em>
                </span>
              ))}
            </div>
          </div>
          <div className="spike-panel-sources">
            <a
              href="https://metrics.torproject.org/userstats-relay-country.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="src-title">How Tor estimates user counts</span>
              <span className="src-pub">Tor Metrics</span>
            </a>
          </div>
        </>
      ) : (
        <>
          <p className="spike-panel-summary">
            {isShift
              ? `Usage held around ${spike.ratio.toFixed(1)}× its surrounding normal for
                 ${spike.days} days. No censorship event in Tor's timeline covers it and it
                 was not part of a network-wide shift. Sustained changes at this scale are
                 more often infrastructure than news.`
              : `This reading is ${spike.ratio.toFixed(1)}× the median of the preceding 60
                 days. No censorship event in Tor's timeline covers it and it was not part
                 of a network-wide jump.`}
          </p>
          <div className="spike-panel-sources">
            <a href={searchUrl(spike, regionLabel)} target="_blank" rel="noopener noreferrer">
              <span className="src-title">Search for reporting on this date</span>
              <span className="src-pub">Google</span>
            </a>
          </div>
        </>
      )}
    </div>
  )
}
