import { X, Landmark, Users, Map, Globe, Languages, Clock, Hash, Link } from 'lucide-react';
import { CountryData } from '../data/countries-data';

interface CountryInfoCardProps {
  country: CountryData | null;
  onClose: () => void;
}

export default function CountryInfoCard({ country, onClose }: CountryInfoCardProps) {
  if (!country) return null;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const statItems = [
    {
      label: "Capital City",
      value: country.capital || "N/A",
      icon: <Landmark className="h-4 w-4 text-emerald-500" />
    },
    {
      label: "Population",
      value: formatNumber(country.population),
      icon: <Users className="h-4 w-4 text-blue-500" />
    },
    {
      label: "Area (Sq Km)",
      value: `${formatNumber(country.area)} km²`,
      icon: <Map className="h-4 w-4 text-amber-500" />
    },
    {
      label: "Continent",
      value: country.continent,
      icon: <Globe className="h-4 w-4 text-purple-500" />
    },
    {
      label: "Official Language",
      value: country.language,
      icon: <Languages className="h-4 w-4 text-pink-500" />
    },
    {
      label: "Currency",
      value: country.currency,
      icon: <span className="text-sm font-bold text-sky-500 leading-none" style={{ fontFamily: 'Inter' }}>$</span>
    },
    {
      label: "Time Zone",
      value: country.timezone,
      icon: <Clock className="h-4 w-4 text-teal-500" />
    },
    {
      label: "Internet Domain",
      value: country.domain,
      icon: <Link className="h-4 w-4 text-indigo-500" />
    },
    {
      label: "Calling Code",
      value: country.callingCode,
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
      id="country-info-card"
    >
      {/* Banner / Flag section */}
      <div 
        style={{
          position: 'relative',
          height: '150px',
          backgroundColor: 'rgba(10, 10, 10, 0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(10, 10, 10, 0.06)',
          overflow: 'hidden'
        }}
      >
        {/* Transparent blurred background flag for texture */}
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${country.flagUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(20px) saturate(150%)',
            opacity: 0.15,
            transform: 'scale(1.2)',
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        />
        
        {/* SVG Flag */}
        <img
          src={country.flagUrl}
          alt={`Flag of ${country.name}`}
          style={{
            height: '75px',
            borderRadius: '6px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
            border: '1px solid rgba(255,255,255,0.4)',
            zIndex: 10,
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            height: '30px',
            width: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'rgba(10, 10, 10, 0.08)',
            cursor: 'pointer',
            color: '#1e293b',
            zIndex: 20,
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(10, 10, 10, 0.15)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(10, 10, 10, 0.08)'}
          title="Close profile"
          aria-label="Close Profile"
        >
          <X className="h-4 w-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Profile Details Content (Scrollable) */}
      <div 
        className="custom-scrollbar"
        style={{
          padding: '20px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {/* Names */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, tracking: '-0.025em', color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
            {country.name}
          </h2>
          <p style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', margin: '4px 0 0 0', lineHeight: 1.1 }}>
            {country.officialName}
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
          {statItems.map((stat, idx) => (
            <div 
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                borderRadius: '12px',
                backgroundColor: 'rgba(10, 10, 10, 0.02)',
                border: '1px solid rgba(10, 10, 10, 0.03)',
                transition: 'border-color 0.2s'
              }}
            >
              <div 
                style={{
                  height: '32px',
                  width: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(10, 10, 10, 0.06)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
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
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'block', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {stat.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
