interface PremiumMapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export default function PremiumMapControls({
  onZoomIn,
  onZoomOut,
  onReset
}: PremiumMapControlsProps) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 10
      }}
    >
      <button 
        onClick={onZoomIn}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          border: '2px solid var(--line)',
          background: '#ffffff',
          fontWeight: 'bold',
          fontSize: '15px',
          cursor: 'pointer',
          boxShadow: '2px 2px 0px var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.1s'
        }}
        onMouseDown={(e) => e.currentTarget.style.transform = 'translate(1px, 1px)'}
        onMouseUp={(e) => e.currentTarget.style.transform = 'translate(0px, 0px)'}
      >
        +
      </button>
      <button 
        onClick={onZoomOut}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          border: '2px solid var(--line)',
          background: '#ffffff',
          fontWeight: 'bold',
          fontSize: '15px',
          cursor: 'pointer',
          boxShadow: '2px 2px 0px var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.1s'
        }}
        onMouseDown={(e) => e.currentTarget.style.transform = 'translate(1px, 1px)'}
        onMouseUp={(e) => e.currentTarget.style.transform = 'translate(0px, 0px)'}
      >
        −
      </button>
      <button 
        onClick={onReset}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          border: '2px solid var(--line)',
          background: '#ffffff',
          fontSize: '12px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '2px 2px 0px var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.1s'
        }}
        onMouseDown={(e) => e.currentTarget.style.transform = 'translate(1px, 1px)'}
        onMouseUp={(e) => e.currentTarget.style.transform = 'translate(0px, 0px)'}
      >
        ⟲
      </button>
    </div>
  );
}
