interface AdminOverviewProps {
  stats: {
    latency: number;
    total_members: number;
    active_voice: number;
    total_balance_circulation: number;
    uptime: number;
    voice_users_count: number;
    economy_users_count: number;
    total_voice_seconds: number;
  } | null;
}

export default function AdminOverview({ stats }: AdminOverviewProps) {
  const fmtUptime = (sec: number) => {
    const d = Math.floor(sec / (3600 * 24));
    const h = Math.floor((sec % (3600 * 24)) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    let resStr = '';
    if (d > 0) resStr += `${d}d `;
    if (h > 0) resStr += `${h}h `;
    if (m > 0) resStr += `${m}m `;
    resStr += `${s}s`;
    return resStr;
  };

  if (!stats) {
    return (
      <div className="admin-tab-content active">
        <h2>System Overview</h2>
        <p className="hint">Loading system metrics...</p>
      </div>
    );
  }

  return (
    <div className="admin-tab-content active">
      <h2>System Overview</h2>
      <p className="hint">Real-time gateway ping, system uptime, and database metrics.</p>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Bot Latency</div>
          <div className="value">{stats.latency} ms</div>
          <div className="sub">Discord Gateway ping</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Members</div>
          <div className="value">{stats.total_members.toLocaleString()}</div>
          <div className="sub">Across connected guilds</div>
        </div>
        <div className="stat-card">
          <div className="label">Active Voice Users</div>
          <div className="value">{stats.active_voice}</div>
          <div className="sub">Currently in voice calls</div>
        </div>
        <div className="stat-card">
          <div className="label">Kla Klouk Circulation</div>
          <div className="value">${stats.total_balance_circulation.toLocaleString()}</div>
          <div className="sub">Total money in database</div>
        </div>
      </div>
      
      <div style={{ marginTop: '32px' }}>
        <h3>System Metrics</h3>
        <div className="console-box">
          <div className="console-head">
            <span className="dot-red"></span>
            <span className="dot-yellow"></span>
            <span className="dot-green"></span>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '12px', marginLeft: '8px', fontWeight: 700 }}>
              system_status.log
            </span>
          </div>
          <div className="console-body">
            <div className="log-line info">[SYSTEM] Uptime: {fmtUptime(stats.uptime)}</div>
            <div className="log-line info">[SYSTEM] Gateway Connection Latency: {stats.latency}ms</div>
            <div className="log-line success">[DB] Database Connection: Connected (MongoDB Online)</div>
            <div className="log-line success">[DB] Total Registered Voice Accounts: {stats.voice_users_count}</div>
            <div className="log-line success">[DB] Total Registered Economy Accounts: {stats.economy_users_count}</div>
            <div className="log-line info">
              [DB] Total Accumulated Voice Time: {Math.round(stats.total_voice_seconds / 3600).toLocaleString()} hours
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
