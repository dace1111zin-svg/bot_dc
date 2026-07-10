import { X, Landmark, Users, Map, Globe, Hash } from 'lucide-react';
import { ProvinceData } from '../data/cambodia-provinces-data';

interface ProvinceInfoCardProps {
  province: ProvinceData | null;
  onClose: () => void;
  pinnedUsers: Array<{
    user_id: string;
    name: string;
    avatar_url: string;
    latitude: number;
    longitude: number;
  }>;
}

export default function ProvinceInfoCard({
  province,
  onClose,
  pinnedUsers
}: ProvinceInfoCardProps) {
  if (!province) return null;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const statItems = [
    {
      label: "Provincial Capital",
      value: province.capital || "N/A",
      icon: <Landmark className="h-4 w-4 text-emerald-500" />
    },
    {
      label: "Population (Est)",
      value: formatNumber(province.population),
      icon: <Users className="h-4 w-4 text-blue-500" />
    },
    {
      label: "Land Area",
      value: `${formatNumber(province.area)} km²`,
      icon: <Map className="h-4 w-4 text-amber-500" />
    },
    {
      label: "Geographic Region",
      value: province.region,
      icon: <Globe className="h-4 w-4 text-purple-500" />
    },
    {
      label: "Primary Economy",
      value: province.economy,
      icon: <Hash className="h-4 w-4 text-rose-500" />
    }
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: '24px',
        left: '24px',
        width: '340px',
        maxHeight: 'calc(100% - 48px)',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '20px',
        border: '1px solid rgba(10, 10, 10, 0.1)',
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(20px) saturate(190%)',
        WebkitBackdropFilter: 'blur(20px) saturate(190%)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.02)',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
        color: '#0f172a'
      }}
      id="province-info-card"
    >
      {/* Flag / Header Section */}
      <div 
        style={{
          position: 'relative',
          height: '110px',
          backgroundColor: 'var(--violet)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(10, 10, 10, 0.06)',
          overflow: 'hidden',
          padding: '0 20px',
          boxSizing: 'border-box'
        }}
      >
        {/* Decorative Angkor Wat emblem overlay / Flag texture */}
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(https://flagcdn.com/kh.svg)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(25px) saturate(140%)',
            opacity: 0.25,
            transform: 'scale(1.2)',
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        />

        <div style={{ zIndex: 10, textAlign: 'center' }}>
          <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#ffffff', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            {province.name}
          </h2>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', margin: '4px 0 0 0' }}>
            {province.khmerName} Province
          </h3>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            height: '26px',
            width: '26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            color: '#ffffff',
            zIndex: 20,
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.35)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
          title="Close profile"
          aria-label="Close Profile"
        >
          <X className="h-3.5 w-3.5 stroke-[2.5]" />
        </button>
      </div>

      {/* Details (Scrollable) */}
      <div 
        className="custom-scrollbar"
        style={{
          padding: '16px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxSizing: 'border-box'
        }}
      >
        {/* Stats Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {statItems.map((stat, idx) => (
            <div 
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 10px',
                borderRadius: '10px',
                backgroundColor: 'rgba(10, 10, 10, 0.02)',
                border: '1px solid rgba(10, 10, 10, 0.03)'
              }}
            >
              <div 
                style={{
                  height: '28px',
                  width: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(10, 10, 10, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {stat.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, color: '#64748b', display: 'block', lineHeight: 1 }}>
                  {stat.label}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', display: 'block', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {stat.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Pinned Users Section */}
        <div style={{ marginTop: '4px', borderTop: '1px solid rgba(10, 10, 10, 0.06)', paddingTop: '10px' }}>
          <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', margin: '0 0 8px 0' }}>
            📍 Pinned Users ({pinnedUsers.length})
          </h4>
          
          {pinnedUsers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {pinnedUsers.map((user) => (
                <div 
                  key={user.user_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(10, 10, 10, 0.01)',
                    border: '1px solid rgba(10, 10, 10, 0.02)'
                  }}
                >
                  <img 
                    src={user.avatar_url} 
                    alt={user.name} 
                    style={{
                      height: '24px',
                      width: '24px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1.5px solid var(--line)',
                      boxShadow: '1px 1px 0px var(--line)'
                    }}
                  />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b' }}>
                    {user.name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '12px 10px', textAlign: 'center', backgroundColor: '#fffdeb', borderRadius: '8px', border: '1px solid rgba(10, 10, 10, 0.05)' }}>
              <span style={{ fontSize: '10px', fontWeight: 500, color: '#8c8a82' }}>
                No active pinned users in this province yet.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
