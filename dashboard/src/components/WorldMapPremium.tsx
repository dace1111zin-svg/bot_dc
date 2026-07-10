import { useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps';

const geoUrl = '/world-map.json';

interface WorldMapPremiumProps {
  selectedCountryId: string | null;
  onCountryClick: (id: string, name: string) => void;
  center: [number, number];
  zoom: number;
  onMoveEnd: (position: { coordinates: [number, number]; zoom: number }) => void;
}

export default function WorldMapPremium({
  selectedCountryId,
  onCountryClick,
  center,
  zoom,
  onMoveEnd
}: WorldMapPremiumProps) {
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);

  const handleMouseMove = (event: React.MouseEvent, geo: any) => {
    const name = geo.properties.name || "Unknown Country";
    setTooltip({
      name,
      x: event.clientX,
      y: event.clientY
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  // Determine path styles dynamically based on state
  const getCountryStyles = (geo: any) => {
    const countryId = geo.id;
    const isSelected = selectedCountryId === countryId;
    const isCambodia = countryId === "116";

    // Colors mapping
    const defaultColor = "#E5E7EB"; // Light Gray
    const defaultStroke = "#ffffff";
    const highlightColor = "#22C55E"; // Bright Green for Cambodia & Selected Countries

    let fillColor = defaultColor;
    if (isCambodia || isSelected) {
      fillColor = highlightColor;
    }

    return {
      default: {
        fill: fillColor,
        stroke: isSelected || isCambodia ? "#10b981" : defaultStroke,
        strokeWidth: isSelected || isCambodia ? 1.2 : 0.6,
        outline: "none",
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
      },
      hover: {
        fill: isSelected || isCambodia ? "#22C55E" : "#cbd5e1",
        stroke: "#22C55E", // Glowing border on hover
        strokeWidth: 1.5,
        outline: "none",
        cursor: "pointer",
        transition: "all 0.15s ease"
      },
      pressed: {
        fill: highlightColor,
        stroke: "#10b981",
        strokeWidth: 1.5,
        outline: "none"
      }
    };
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', userSelect: 'none' }}>
      
      {/* Map Projection */}
      <ComposableMap 
        projection="geoEqualEarth"
        projectionConfig={{ scale: 170 }}
        style={{ width: '100%', height: '350px' }}
      >
        <ZoomableGroup
          zoom={zoom}
          center={center}
          onMoveEnd={onMoveEnd}
          minZoom={1}
          maxZoom={12}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const styles = getCountryStyles(geo);
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => onCountryClick(geo.id, geo.properties.name)}
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
        <div 
          style={{
            position: 'fixed',
            left: tooltip.x + 15,
            top: tooltip.y + 15,
            backgroundColor: '#ffffff',
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
          }}
        >
          {tooltip.name}
          {tooltip.name === "Cambodia" && (
            <span style={{
              display: 'inline-block',
              marginLeft: '6px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#10b981'
            }}></span>
          )}
        </div>
      )}
    </div>
  );
}
