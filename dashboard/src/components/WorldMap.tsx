import { useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps';

const geoUrl = '/world-map.json';

interface WorldMapProps {
  darkMode?: boolean;
}

interface InflationInfo {
  rate: string;
  category: 'low' | 'mod' | 'high';
  flag: string;
  name: string;
}

// Map ISO-3166-1 Numeric Codes to CPI Inflation Rates
const inflationData: Record<string, InflationInfo> = {
  "840": { rate: "2.4%", category: "low", flag: "🇺🇸", name: "United States" },
  "124": { rate: "2.0%", category: "low", flag: "🇨🇦", name: "Canada" },
  "116": { rate: "3.2%", category: "mod", flag: "🇰🇭", name: "Cambodia" },
  "392": { rate: "2.1%", category: "low", flag: "🇯🇵", name: "Japan" },
  "156": { rate: "0.4%", category: "low", flag: "🇨🇳", name: "China" },
  "356": { rate: "5.1%", category: "high", flag: "🇮🇳", name: "India" },
  "036": { rate: "2.8%", category: "mod", flag: "🇦🇺", name: "Australia" },
  "076": { rate: "4.5%", category: "mod", flag: "🇧🇷", name: "Brazil" },
  "032": { rate: "211.4%", category: "high", flag: "🇦🇷", name: "Argentina" },
  "710": { rate: "5.3%", category: "mod", flag: "🇿🇦", name: "South Africa" },
  "818": { rate: "29.8%", category: "high", flag: "🇪🇬", name: "Egypt" },
  "792": { rate: "61.8%", category: "high", flag: "🇹🇷", name: "Turkey" },
  "643": { rate: "8.6%", category: "high", flag: "🇷🇺", name: "Russia" },
  // Euro Area major countries
  "276": { rate: "1.9%", category: "low", flag: "🇩🇪", name: "Germany" },
  "250": { rate: "1.2%", category: "low", flag: "🇫🇷", name: "France" },
  "380": { rate: "1.3%", category: "low", flag: "🇮🇹", name: "Italy" },
  "724": { rate: "1.5%", category: "low", flag: "🇪🇸", name: "Spain" },
  "826": { rate: "2.2%", category: "low", flag: "🇬🇧", name: "United Kingdom" },
  // Greenland
  "175": { rate: "1.5%", category: "low", flag: "🇬🇱", name: "Greenland" }
};

export default function WorldMap({ darkMode = false }: WorldMapProps) {
  const [tooltip, setTooltip] = useState<{ name: string; rate: string; x: number; y: number } | null>(null);
  const [position, setPosition] = useState({ coordinates: [10, 15] as [number, number], zoom: 1 });

  const handleMouseMove = (event: React.MouseEvent, geo: any) => {
    const countryId = geo.id;
    const countryName = geo.properties.name || "Unknown Country";
    const data = inflationData[countryId];
    
    setTooltip({
      name: countryName,
      rate: data ? `${data.flag} CPI: ${data.rate}` : "No active CPI tracking",
      x: event.clientX,
      y: event.clientY
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  // Determine path styles dynamically based on inflation category
  const getCountryStyles = (geo: any) => {
    const countryId = geo.id;
    const data = inflationData[countryId];

    let fillColor = "rgba(10, 10, 10, 0.04)"; // default neutral warm gray
    let strokeColor = "rgba(10, 10, 10, 0.15)";
    let strokeWidth = 0.5;

    if (data) {
      if (data.category === "low") {
        fillColor = "rgba(16, 185, 129, 0.15)"; // low (greenish)
        strokeColor = "#10b981";
        strokeWidth = 1.0;
      } else if (data.category === "mod") {
        fillColor = "rgba(245, 158, 11, 0.15)"; // mod (amber/yellow)
        strokeColor = "#f59e0b";
        strokeWidth = 1.0;
      } else if (data.category === "high") {
        fillColor = "rgba(239, 68, 68, 0.15)"; // high (red)
        strokeColor = "#ef4444";
        strokeWidth = 1.2;
      }
    }

    return {
      default: {
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        outline: "none",
        transition: "all 0.2s ease"
      },
      hover: {
        fill: data ? fillColor.replace("0.15", "0.35") : "rgba(10, 10, 10, 0.12)",
        stroke: strokeColor,
        strokeWidth: strokeWidth + 0.6,
        outline: "none",
        cursor: "pointer"
      },
      pressed: {
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: strokeWidth + 0.8,
        outline: "none"
      }
    };
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', userSelect: 'none' }}>
      
      {/* Map Controls */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        zIndex: 10
      }}>
        <button 
          onClick={() => setPosition(prev => ({ ...prev, zoom: Math.min(prev.zoom + 0.5, 6) }))}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: '2px solid var(--line)',
            background: '#ffffff',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '1px 1px 0px var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          +
        </button>
        <button 
          onClick={() => setPosition(prev => ({ ...prev, zoom: Math.max(prev.zoom - 0.5, 1) }))}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: '2px solid var(--line)',
            background: '#ffffff',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '1px 1px 0px var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          −
        </button>
        <button 
          onClick={() => setPosition({ coordinates: [10, 15], zoom: 1 })}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: '2px solid var(--line)',
            background: '#ffffff',
            fontSize: '10px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '1px 1px 0px var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ⟲
        </button>
      </div>

      <ComposableMap 
        projection="geoEqualEarth"
        projectionConfig={{ scale: 170 }}
        style={{ width: '100%', height: '350px' }}
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={(pos) => setPosition({ coordinates: pos.coordinates, zoom: pos.zoom })}
          minZoom={1}
          maxZoom={6}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const styles = getCountryStyles(geo);
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseMove={(e) => handleMouseMove(e, geo)}
                    onMouseLeave={handleMouseLeave}
                    style={styles}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Floating Hover Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 15,
          top: tooltip.y + 15,
          backgroundColor: '#fffdeb',
          border: '2px solid var(--line)',
          borderRadius: '8px',
          padding: '6px 12px',
          boxShadow: '2px 2px 0px var(--line)',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: '12px',
          color: 'var(--text)',
          pointerEvents: 'none',
          zIndex: 9999
        }}>
          <div>{tooltip.name}</div>
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--muted)', marginTop: '2px' }}>
            {tooltip.rate}
          </div>
        </div>
      )}
    </div>
  );
}
