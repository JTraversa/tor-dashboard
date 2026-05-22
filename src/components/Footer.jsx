export default function Footer() {
  return (
    <div className="dashboard-footer">
      <div className="footer-note">
        Note: User counts are <strong>estimated</strong> from directory request data, not exact measurements.
        Tor preserves user anonymity, so these figures reflect <strong>directly-connecting clients</strong> only
        (not bridge users). See{' '}
        <a href="https://research.torproject.org/techreports/counting-daily-bridge-users-2012-10-24.pdf" target="_blank" rel="noopener noreferrer">
          Loesing et al. (2012)
        </a>{' '}
        for the methodology behind these estimates.
      </div>
      <div className="footer-top">
        <div className="footer-section">
          <h4>Data Source</h4>
          <ul>
            <li><a href="https://metrics.torproject.org/userstats-relay-country.html" target="_blank" rel="noopener noreferrer">Tor Metrics — Relay Users by Country</a></li>
            <li><a href="https://metrics.torproject.org/stats.html" target="_blank" rel="noopener noreferrer">Statistics File Documentation</a></li>
            <li><a href="https://metrics.torproject.org/collector.html" target="_blank" rel="noopener noreferrer">CollecTor Data Service</a></li>
          </ul>
        </div>
        <div className="footer-section">
          <h4>Methodology</h4>
          <ul>
            <li><a href="https://research.torproject.org/techreports/counting-daily-bridge-users-2012-10-24.pdf" target="_blank" rel="noopener noreferrer">Counting Daily Bridge Users</a> — Loesing et al. (2012)</li>
            <li><a href="https://blog.torproject.org/separating-anonymity-metrics" target="_blank" rel="noopener noreferrer">Separating Anonymity from Metrics</a></li>
            <li>Estimates derived from directory requests; no PII collected</li>
          </ul>
        </div>
        <div className="footer-section">
          <h4>About</h4>
          <ul>
            <li><a href="https://www.torproject.org/" target="_blank" rel="noopener noreferrer">The Tor Project</a></li>
            <li><a href="https://gitlab.torproject.org/tpo/network-health/metrics" target="_blank" rel="noopener noreferrer">Metrics Source Code</a></li>
            <li>Data licensed under CC0 1.0 Universal</li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>Tor Usage Dashboard — Data from metrics.torproject.org (CC0)</span>
        <a href="https://metrics.torproject.org/" target="_blank" rel="noopener noreferrer">metrics.torproject.org</a>
      </div>
    </div>
  )
}
