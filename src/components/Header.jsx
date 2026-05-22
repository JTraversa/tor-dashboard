export default function Header({ stats, dataType = 'relay' }) {
  const subtitle = dataType === 'bridge'
    ? 'Historic bridge user statistics by country — bridges bypass censorship in restricted regions'
    : 'Historic relay user statistics by country — 2011 to present'

  return (
    <div className="dashboard-header">
      <div>
        <h1>Tor Historic Data</h1>
        <div className="subtitle">{subtitle}</div>
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
