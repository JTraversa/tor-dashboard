export default function Footer() {
  return (
    <div className="dashboard-footer">
      <div className="footer-note">
        Note: User counts are <strong>estimated</strong> from directory request data, not exact measurements —
        Tor preserves user anonymity, so nobody is counted individually. Relay figures count clients
        connecting <strong>directly</strong> to the network; bridge figures count clients connecting{' '}
        <strong>through bridges</strong>. See{' '}
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
            <li><a href="https://metrics.torproject.org/userstats-bridge-country.html" target="_blank" rel="noopener noreferrer">Tor Metrics — Bridge Users by Country</a></li>
            <li><a href="https://metrics.torproject.org/stats.html" target="_blank" rel="noopener noreferrer">Statistics File Documentation</a></li>
            <li><a href="https://metrics.torproject.org/collector.html" target="_blank" rel="noopener noreferrer">CollecTor Data Service</a></li>
          </ul>
        </div>
        <div className="footer-section">
          <h4>Methodology</h4>
          <ul>
            <li><a href="https://research.torproject.org/techreports/counting-daily-bridge-users-2012-10-24.pdf" target="_blank" rel="noopener noreferrer">Counting Daily Bridge Users</a> — Loesing et al. (2012)</li>
            <li><a href="https://metrics.torproject.org/reproducible-metrics.html#users" target="_blank" rel="noopener noreferrer">Reproducible Metrics — Users</a></li>
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
        <span>Historical Tor Data — Data from metrics.torproject.org (CC0)</span>
        <a href="https://metrics.torproject.org/" target="_blank" rel="noopener noreferrer">metrics.torproject.org</a>
      </div>
    </div>
  )
}
