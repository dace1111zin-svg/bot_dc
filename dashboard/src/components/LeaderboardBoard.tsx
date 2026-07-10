import { Activity } from 'lucide-react';

export interface LeaderboardEntry {
  user_id: string;
  name: string;
  username: string;
  value: number;
  is_active?: boolean;
  active_since?: string;
  avatar_url?: string;
}

interface LeaderboardBoardProps {
  entries: LeaderboardEntry[];
  activeCat: 'time' | 'money' | 'iq';
  onTabChange: (cat: 'time' | 'money' | 'iq') => void;
}

const categories = {
  time: { label: 'Top Time', unit: 'h', color: '#ff7614' },
  money: { label: 'Top Money', unit: '$', color: '#fbbd08' },
  iq: { label: 'Top IQ', unit: '', color: '#ff5a00' },
};

const tabIcons = {
  time: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '16px', height: '16px' }}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  money: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '16px', height: '16px' }}>
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  iq: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '16px', height: '16px' }}>
      <path d="M12 2a5 5 0 0 1 5 5c0 2-1 3-2 4s-1 2-1 3H10c0-1 0-2-1-3s-2-2-2-4a5 5 0 0 1 5-5z" />
      <path d="M10 19h4M11 22h2" />
    </svg>
  ),
};

export default function LeaderboardBoard({
  entries,
  activeCat,
  onTabChange,
}: LeaderboardBoardProps) {
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

  const getLabelHtml = (cat: 'time' | 'money' | 'iq') => {
    if (cat === 'time') {
      return (
        <>
          <span style={{ display: 'inline-block', width: '22px', textAlign: 'center', marginRight: '4px' }}>🎙️</span>
          <span style={{ color: 'var(--violet)', fontWeight: 600, fontSize: '0.95em', marginRight: '6px' }}>Time:</span>
        </>
      );
    } else if (cat === 'money') {
      return (
        <>
          <span style={{ display: 'inline-block', width: '22px', textAlign: 'center', marginRight: '4px' }}>💰</span>
          <span style={{ color: '#d97706', fontWeight: 600, fontSize: '0.95em', marginRight: '6px' }}>Money:</span>
        </>
      );
    } else {
      return (
        <>
          <span style={{ display: 'inline-block', width: '22px', textAlign: 'center', marginRight: '4px' }}>🧠</span>
          <span style={{ color: 'var(--violet)', fontWeight: 600, fontSize: '0.95em', marginRight: '6px' }}>IQ:</span>
        </>
      );
    }
  };

  return (
    <div id="leaderboard">
      <div className="tabs-wrap">
        <div className="tabs">
          {(Object.keys(categories) as Array<'time' | 'money' | 'iq'>).map((key) => (
            <button
              key={key}
              className={`tab ${key === activeCat ? 'active' : ''}`}
              onClick={() => onTabChange(key)}
            >
              {tabIcons[key]}
              {categories[key].label}
            </button>
          ))}
        </div>
      </div>

      <div className="board">
        <div className="board-head">
          <h2 className="display">{categories[activeCat].label} — Top 10</h2>
          <div className="live">
            <span
              className="dot"
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--violet)',
                boxShadow: '0 0 8px var(--violet)',
                display: 'inline-block',
                animation: 'pulse 1.6s infinite',
              }}
            ></span>{' '}
            updated live
          </div>
        </div>

        <div id="rows">
          {sorted.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontWeight: 600 }}>
              No entries in this category yet.
            </div>
          ) : (
            sorted.map((p, idx) => {
              const rank = idx + 1;
              const photoContent = p.avatar_url ? (
                <img
                  src={p.avatar_url}
                  alt={p.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                />
              ) : (
                getInitials(p.name)
              );

              if (rank === 1) {
                return (
                  <div key={p.user_id} className="row-first">
                    <div className="left">
                      <div className="rk">#1</div>
                      <div>
                        <div className="nm" style={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '4px' }}>
                          <span style={{ display: 'inline-block', width: '22px', textAlign: 'center', marginRight: '4px' }}>👤</span>
                          <span style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '6px' }}>Name:</span>
                          <span style={{ fontWeight: 800, fontSize: '20px' }}>{p.name}</span>
                        </div>
                        <div className="vl" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          {getLabelHtml(activeCat)}
                          {fmtValue(activeCat, p.value)}
                        </div>
                      </div>
                    </div>
                    <div className="photo" style={p.avatar_url ? { padding: 0 } : undefined}>
                      {photoContent}
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={p.user_id} className="row">
                    <div className="rk">{rank}</div>
                    <div className="photo-sm" style={p.avatar_url ? { padding: 0 } : undefined}>
                      {photoContent}
                    </div>
                    <div className="nm">{p.name}</div>
                    <div className="vl" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {getLabelHtml(activeCat)}
                      {fmtValue(activeCat, p.value)}
                    </div>
                  </div>
                );
              }
            })
          )}
        </div>
      </div>
    </div>
  );
}
