import { useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps';
import { motion, AnimatePresence } from 'framer-motion';

const geoUrl = '/world-map.json';

interface WorldMapProps {
  selectedCountryId: string | null;
  onCountryClick: (id: string, name: string) => void;
  center: [number, number];
  zoom: number;
  onMoveEnd: (position: { coordinates: [number, number]; zoom: number }) => void;
  onHoverCoordinates: (coords: [number, number] | null) => void;
  darkMode: boolean;
}

export default function WorldMap({
  selectedCountryId,
  onCountryClick,
  center,
  zoom,
  onMoveEnd,
  onHoverCoordinates,
  darkMode
}: WorldMapProps) {
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);

  // Mouse hover event on map paths
  const handleMouseMove = (event: React.MouseEvent, geo: any) => {
    const name = geo.properties.name || "Unknown Country";
    setTooltip({
      name,
      x: event.clientX,
      y: event.clientY
    });

    // Extract longitude/latitude projection coordinates
    const mapContainer = event.currentTarget.closest('.rsm-svg');
    if (mapContainer) {
      const rect = mapContainer.getBoundingClientRect();
      const relativeX = event.clientX - rect.left;
      const relativeY = event.clientY - rect.top;
      
      // Calculate simple mathematical fallback coordinates based on pixel ratios
      const calculatedLng = ((relativeX / rect.width) * 360) - 180;
      const calculatedLat = 90 - ((relativeY / rect.height) * 180);
      onHoverCoordinates([calculatedLng, calculatedLat]);
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
    onHoverCoordinates(null);
  };

  // Determine path styles dynamically based on state
  const getCountryStyles = (geo: any) => {
    const countryId = geo.id;
    const isSelected = selectedCountryId === countryId;
    const isCambodia = countryId === "116";

    // Colors mapping
    const defaultColor = darkMode ? "#27272a" : "#E5E7EB"; // Zinc-800 for dark mode, Light Gray for light mode
    const defaultStroke = darkMode ? "#09090b" : "#ffffff";
    const selectedColor = "#22C55E"; // Emerald Green for clicked select highlights
    const cambodiaColor = "#22C55E"; // Bright Green for Cambodia

    let fillColor = defaultColor;
    if (isCambodia) {
      fillColor = cambodiaColor;
    } else if (isSelected) {
      fillColor = selectedColor;
    }

    return {
      default: {
        fill: fillColor,
        stroke: isSelected || isCambodia ? "#10b981" : defaultStroke,
        strokeWidth: isSelected || isCambodia ? 1.2 : 0.6,
        outline: "none"
      },
      hover: {
        fill: isSelected || isCambodia ? "#10b981" : (darkMode ? "#3f3f46" : "#cbd5e1"),
        stroke: "#22C55E", // Emerald green glow border on hover
        strokeWidth: 1.5,
        filter: "drop-shadow(0 0 4px rgba(34, 197, 94, 0.6))", // Glowing border effect
        outline: "none",
        cursor: "pointer"
      },
      pressed: {
        fill: selectedColor,
        stroke: "#10b981",
        strokeWidth: 1.5,
        outline: "none"
      }
    };
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      
      {/* Map Projection */}
      <ComposableMap 
        projection="geoEqualEarth"
        className="w-full h-full"
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
                    className="country-path"
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Floating Hover Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'fixed',
              left: tooltip.x + 16,
              top: tooltip.y + 16,
            }}
            className="pointer-events-none z-50 px-3 py-1.5 rounded-lg bg-zinc-900/90 dark:bg-slate-100/95 text-white dark:text-slate-900 text-xs font-semibold shadow-md backdrop-blur-sm border border-white/10 dark:border-black/5 flex items-center space-x-1.5"
          >
            <span>{tooltip.name}</span>
            {tooltip.name === "Cambodia" && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 dark:bg-emerald-600 animate-ping"></span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
