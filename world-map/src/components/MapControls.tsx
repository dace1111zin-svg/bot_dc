import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export default function MapControls({
  onZoomIn,
  onZoomOut,
  onReset,
  isFullscreen,
  onToggleFullscreen
}: MapControlsProps) {
  
  const controlButtons = [
    {
      label: "Zoom In",
      icon: <ZoomIn className="h-[18px] w-[18px]" />,
      action: onZoomIn,
      id: "zoom-in-btn"
    },
    {
      label: "Zoom Out",
      icon: <ZoomOut className="h-[18px] w-[18px]" />,
      action: onZoomOut,
      id: "zoom-out-btn"
    },
    {
      label: "Reset Map View",
      icon: <RotateCcw className="h-[18px] w-[18px]" />,
      action: onReset,
      id: "reset-map-btn"
    },
    {
      label: isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen",
      icon: isFullscreen ? <Minimize2 className="h-[18px] w-[18px]" /> : <Maximize2 className="h-[18px] w-[18px]" />,
      action: onToggleFullscreen,
      id: "fullscreen-btn"
    }
  ];

  return (
    <div 
      className="absolute bottom-6 right-6 flex flex-col items-center space-y-2 z-20"
      id="map-controls-deck"
    >
      {controlButtons.map((btn) => (
        <button
          key={btn.id}
          id={btn.id}
          onClick={btn.action}
          className="h-10 w-10 flex items-center justify-center rounded-xl border border-border bg-card/75 backdrop-blur-md text-slate-800 dark:text-slate-200 hover:bg-accent dark:hover:bg-zinc-800/80 shadow-md transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none"
          title={btn.label}
          aria-label={btn.label}
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
}
