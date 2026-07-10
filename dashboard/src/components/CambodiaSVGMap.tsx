import { useState, useRef } from 'react';
import { cambodiaMapData } from '../data/cambodia-map-data';
import { cambodiaProvinces } from '../data/cambodia-provinces-data';
import PremiumMapControls from './PremiumMapControls';

interface UserLocation {
  user_id: string;
  name: string;
  avatar_url: string;
  latitude: number;
  longitude: number;
}

interface CambodiaSVGMapProps {
  selectedProvinceId: string | null;
  onProvinceClick: (id: string, name: string) => void;
  pinnedUsers: UserLocation[];
}

export default function CambodiaSVGMap({
  selectedProvinceId,
  onProvinceClick,
  pinnedUsers
}: CambodiaSVGMapProps) {
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);

  // Zoom and Pan States
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);

  // Mercator-calibrated geographic projection for Cambodia SVG coordinates
  const projectCoordinates = (lat: number, lng: number): { x: number; y: number } => {
    const minLng = 102.1;
    const maxLng = 107.8;
    const minLat = 9.8;
    const maxLat = 14.9;

    const x = ((lng - minLng) / (maxLng - minLng)) * 655;
    const y = 601 - ((lat - minLat) / (maxLat - minLat)) * 601;

    return { x, y };
  };

  // Wheel Zoom Listener
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = 1.15;
    let nextZoom = zoom;

    if (e.deltaY < 0) {
      nextZoom = Math.min(zoom * zoomFactor, 10);
    } else {
      nextZoom = Math.max(zoom / zoomFactor, 1);
    }

    setZoom(nextZoom);
    if (nextZoom === 1) {
      setPan({ x: 0, y: 0 }); // Reset pan if fully zoomed out
    }
  };

  // Drag Panning Listeners
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleProvinceMouseMove = (event: React.MouseEvent, location: any) => {
    setTooltip({
      name: location.name,
      x: event.clientX,
      y: event.clientY
    });
  };

  const handleUserMouseMove = (event: React.MouseEvent, name: string) => {
    event.stopPropagation(); // Prevent triggering province hover
    setTooltip({
      name: `User: ${name} 📍`,
      x: event.clientX,
      y: event.clientY
    });
  };

  const handleCloseTooltip = () => {
    setTooltip(null);
  };

  // Button Controls
  const handleZoomIn = () => {
    setZoom((z) => Math.min(z * 1.4, 10));
  };

  const handleZoomOut = () => {
    setZoom((z) => {
      const next = Math.max(z / 1.4, 1);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const getProvinceStyle = (location: any) => {
    const isSelected = selectedProvinceId === location.id;
    const defaultColor = "#E5E7EB";
    const selectedColor = "#22C55E";

    return {
      fill: isSelected ? selectedColor : defaultColor,
      stroke: "#ffffff",
      strokeWidth: isSelected ? "1.5px" : "1.0px",
      outline: "none",
      transition: isDragging ? "none" : "fill 0.25s ease, stroke 0.2s ease",
      cursor: "pointer"
    };
  };

  const handleHoverStyle = (e: React.MouseEvent, location: any) => {
    const isSelected = selectedProvinceId === location.id;
    if (!isSelected) {
      e.currentTarget.setAttribute("style", `fill: #86EFAC; stroke: #22C55E; stroke-width: 1.2px; outline: none; cursor: pointer; transition: all 0.15s ease;`);
    }
  };

  const handleMouseOutStyle = (e: React.MouseEvent, location: any) => {
    const style = getProvinceStyle(location);
    const styleStr = Object.entries(style)
      .map(([k, v]) => `${k.replace(/[A-Z]/g, m => "-" + m.toLowerCase())}: ${v}`)
      .join("; ");
    e.currentTarget.setAttribute("style", styleStr);
  };

  return (
    <div 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      {/* SVG Canvas with Zoom & Pan handlers */}
      <svg
        ref={svgRef}
        viewBox={cambodiaMapData.viewBox || "0 0 655 601"}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        style={{
          width: '100%',
          maxHeight: '340px',
          filter: 'drop-shadow(2px 2px 0px rgba(10, 10, 10, 0.05))',
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
        }}
      >
        <defs>
          {pinnedUsers.map((user) => {
            const { x, y } = projectCoordinates(user.latitude, user.longitude);
            return (
              <clipPath key={`clip-${user.user_id}`} id={`avatar-clip-${user.user_id}`}>
                <circle cx={x} cy={y} r="12" />
              </clipPath>
            );
          })}
        </defs>

        {/* Scaled/Panned Group Container */}
        <g
          id="cambodia-transform-group"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center',
            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Map Provinces Paths */}
          <g id="cambodia-provinces-group">
            {cambodiaMapData.locations.map((location: any) => (
              <path
                key={location.id}
                d={location.path}
                onClick={() => onProvinceClick(location.id, location.name)}
                onMouseMove={(e) => {
                  handleProvinceMouseMove(e, location);
                  handleHoverStyle(e, location);
                }}
                onMouseLeave={(e) => {
                  handleCloseTooltip();
                  handleMouseOutStyle(e, location);
                }}
                style={getProvinceStyle(location)}
              />
            ))}
          </g>

          {/* Static Province Name Labels Overlay */}
          <g id="province-labels-group">
            {Object.values(cambodiaProvinces).map((province) => {
              const { x, y } = projectCoordinates(province.coordinates[0], province.coordinates[1]);
              
              // Prevent label rendering overlaps or offset Takeo / Phnom Penh text position slightly if needed
              let labelY = y;
              let labelX = x;
              if (province.id === "phnom-penh") {
                labelY = y + 10; // offset Phnom Penh labels from Kandal center slightly
              } else if (province.id === "kep") {
                labelY = y + 6;
              }
              
              return (
                <text
                  key={`label-${province.id}`}
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  style={{
                    fontSize: '7.5px',
                    fontWeight: 800,
                    fill: '#1e293b', // dark slate color
                    fontFamily: "'Inter', 'Khmer OS', 'Segoe UI', sans-serif",
                    pointerEvents: 'none', 
                    stroke: '#ffffff', 
                    strokeWidth: '1.5px',
                    paintOrder: 'stroke fill',
                    opacity: 0.9
                  }}
                >
                  {province.khmerName}
                </text>
              );
            })}
          </g>

          {/* User Pins Avatar Overlay */}
          <g id="user-markers-group">
            {pinnedUsers.map((user) => {
              const { x, y } = projectCoordinates(user.latitude, user.longitude);
              const avatar = user.avatar_url || "https://i.pinimg.com/1200x/14/a1/71/14a171de882e567cc020668c691eba2d.jpg";

              return (
                <g
                  key={`marker-${user.user_id}`}
                  onMouseMove={(e) => handleUserMouseMove(e, user.name)}
                  onMouseLeave={handleCloseTooltip}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r="15"
                    fill="#ffffff"
                    stroke="var(--violet)"
                    strokeWidth="2"
                    style={{
                      filter: 'drop-shadow(0px 2px 4px rgba(99, 102, 241, 0.35))'
                    }}
                  />
                  <image
                    href={avatar}
                    x={x - 12}
                    y={y - 12}
                    width="24"
                    height="24"
                    clipPath={`url(#avatar-clip-${user.user_id})`}
                  />
                  <circle
                    cx={x + 10}
                    cy={y - 10}
                    r="4"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Floating Zoom and Reset Controls deck */}
      <PremiumMapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
      />

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
        </div>
      )}
    </div>
  );
}
