import { LeaderboardEntry } from './LeaderboardBoard';

interface AdminLeaderboardsProps {
  entries: LeaderboardEntry[];
  activeCat: 'time' | 'money' | 'iq';
  onTabChange: (cat: 'time' | 'money' | 'iq') => void;
  onEditClick: (userId: string) => void;
  onDeleteClick: (userId: string) => void;
  onAddClick: () => void;
}

export default function AdminLeaderboards({
  entries,
  activeCat,
  onTabChange,
  onEditClick,
  onDeleteClick,
  onAddClick
}: AdminLeaderboardsProps) {
  // Sort entries descending
  const sorted = [...entries].sort((a, b) => b.value - a.value);

  const getInitials = (name: string) => {
    return name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '??';
  };

  const fmtValue = (cat: 'time' | 'money' | 'iq', v: number) => {
    if (cat === 'money') return '$' + v.toLocaleString();
    if (cat === 'time') {
      const h = Math.floor(v / 3600);
      const m = Math.floor((v % 3600) / 60);
      const s = Math.floor(v % 60);
      return `${h}h ${m}m ${s}s`;
    }
    return v.toString();
  };

  const categories: Record<'time' | 'money' | 'iq', string> = {
    time: 'Top Time',
    money: 'Top Money',
    iq: 'Top IQ'
  };

  return (
    <div className="admin-tab-content active">
      <h2>Manage Leaderboards</h2>
      <p className="hint">Edit names and values directly. Changes reflect instantly on the public page.</p>
      
      <div className="admin-tabs">
        {(Object.keys(categories) as Array<'time' | 'money' | 'iq'>).map((key) => (
          <button
            key={key}
            className={`tab ${key === activeCat ? 'active' : ''}`}
            onClick={() => onTabChange(key)}
          >
            {categories[key]}
          </button>
        ))}
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th style={{ width: '60px' }}>Rank</th>
            <th>Name</th>
            <th style={{ width: '160px' }}>Value</th>
            <th style={{ width: '190px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                No entries found.
              </td>
            </tr>
          ) : (
            sorted.map((p, idx) => {
              const avatarContent = p.avatar_url ? (
                <img
                  src={p.avatar_url}
                  alt={p.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              ) : (
                getInitials(p.name)
              );

              return (
                <tr key={p.user_id}>
                  <td className="mono">#{idx + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        className="photo-sm"
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          background: 'var(--violet)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '11px',
                          flexShrink: 0,
                          border: '1px solid var(--line)',
                          padding: p.avatar_url ? 0 : undefined
                        }}
                      >
                        {avatarContent}
                      </div>
                      <div>
                        <strong style={{ display: 'block' }}>{p.name}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--muted-2)' }}>@{p.username || 'unknown'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="mono" style={{ fontWeight: 700 }}>
                    {fmtValue(activeCat, p.value)}
                  </td>
                  <td className="row-actions">
                    <button className="edit-btn" onClick={() => onEditClick(p.user_id)}>
                      Edit
                    </button>
                    <button className="del-btn" onClick={() => onDeleteClick(p.user_id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginTop: '22px' }}>
        <button className="btn btn-primary add-row-btn" onClick={onAddClick} style={{ marginTop: 0 }}>
          + Add entry
        </button>
      </div>
    </div>
  );
}
