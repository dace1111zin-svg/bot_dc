import { MapPin, Navigation } from 'lucide-react';

interface FooterProps {
  hoveredCoordinates: [number, number] | null;
  selectedCountryName: string | null;
}

export default function Footer({ hoveredCoordinates, selectedCountryName }: FooterProps) {
  return (
    <footer className="w-full h-12 border-t border-border bg-background/80 backdrop-blur-md px-6 flex items-center justify-between text-xs text-muted font-medium transition-colors duration-300 z-10 sticky bottom-0">
      
      {/* Interaction Tips */}
      <div className="flex items-center space-x-1 hidden sm:flex">
        <Navigation className="h-3 w-3 text-emerald-500 animate-pulse" />
        <span>Drag map to pan • Scroll or pinch to zoom • Click country to inspect</span>
      </div>

      {/* Selected Indicator */}
      {selectedCountryName && (
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          <span>Inspecting: {selectedCountryName}</span>
        </div>
      )}

      {/* Coordinate Telemetry */}
      <div className="flex items-center space-x-1.5 font-mono">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
        <span>
          LAT: {hoveredCoordinates ? hoveredCoordinates[1].toFixed(4) : "0.0000"}°
        </span>
        <span className="text-muted-foreground">|</span>
        <span>
          LNG: {hoveredCoordinates ? hoveredCoordinates[0].toFixed(4) : "0.0000"}°
        </span>
      </div>
    </footer>
  );
}
