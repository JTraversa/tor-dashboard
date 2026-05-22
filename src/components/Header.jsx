function formatNumber(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toString()
}

export default function Header({ stats }) {
  return (
    <div className="dashboard-header">
      <div>
        <h1>Tor Usage Dashboard</h1>
        <div className="subtitle">Historical relay user statistics by country — 2011 to present</div>
      </div>
      <div className="header-stats">
        <div className="stat-box">
          <div className="label">Current Users</div>
          <div className={`value ${stats?.changeClass || 'neutral'}`}>{stats?.current || '—'}</div>
        </div>
        <div className="stat-box">
          <div className="label">Period Change</div>
          <div className={`value ${stats?.changeClass || 'neutral'}`}>{stats?.change || '—'}</div>
        </div>
        <div className="stat-box">
          <div className="label">Peak Users</div>
          <div className="value neutral">{stats?.peak || '—'}</div>
        </div>
        <div className="stat-box">
          <div className="label">Data Points</div>
          <div className="value neutral">{stats?.count || '—'}</div>
        </div>
      </div>
    </div>
  )
}
