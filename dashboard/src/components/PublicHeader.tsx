import { useState, useEffect } from 'react';

interface PublicHeaderProps {
  adminToken: string | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  isAdminMode: boolean;
  onToggleAdminView: (showAdmin: boolean) => void;
}

export default function PublicHeader({
  adminToken,
  onOpenLogin,
  onLogout,
  isAdminMode,
  onToggleAdminView
}: PublicHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 720) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleAdminClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (adminToken) {
      onToggleAdminView(!isAdminMode);
    } else {
      onOpenLogin();
    }
  };

  const handleScrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header>
      <div className="header-bg"></div>
      <div className="logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <div className="logo-mark" style={{ background: '#5865F2' }}>
          <svg viewBox="0 0 127.14 96.36" fill="currentColor" style={{ width: '20px', height: '20px' }}>
            <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.2,77.2,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.2,77.2,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.87-.64,1.71-1.32,2.51-2a75.46,75.46,0,0,0,73.08,0c.8,0.7,1.64,1.38,2.51,2a68.43,68.43,0,0,1-10.5,5A77.7,77.7,0,0,0,95.14,85.5a105.73,105.73,0,0,0,31-18.83C129,54.65,123.5,31.58,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
          </svg>
        </div>
        REAL<span className="accent">TIME</span>
      </div>

      <nav className="menu">
        {mobileMenuOpen && (
          <div 
            className="menu-backdrop show" 
            onClick={toggleMenu}
            style={{ pointerEvents: 'auto', opacity: 1, visibility: 'visible' }}
          ></div>
        )}
        <div className={`links ${mobileMenuOpen ? 'open' : ''}`}>
          <a href="#leaderboard" onClick={(e) => { e.preventDefault(); handleScrollTo('leaderboard'); }}>Leaderboard</a>
          <a href="#footer" onClick={(e) => { e.preventDefault(); handleScrollTo('footer'); }}>Server</a>
          <a href="#" className="admin-link" onClick={handleAdminClick}>
            {adminToken ? (isAdminMode ? 'Back to Public' : 'Admin Panel') : 'Admin Login'}
          </a>
          {adminToken && (
            <a href="#" onClick={(e) => { e.preventDefault(); onLogout(); setMobileMenuOpen(false); }}>
              Log out
            </a>
          )}
          <a 
            href="https://discord.gg/invitelink" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              background: '#5865F2',
              color: '#ffffff',
              padding: '6px 14px',
              border: '2px solid var(--line)',
              borderRadius: '99px',
              boxShadow: '2px 2px 0px var(--line)',
              fontWeight: 700,
              fontSize: '13px',
              fontFamily: "'Space Grotesk', sans-serif",
              transition: 'all 0.15s',
              marginLeft: '8px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translate(-1px,-1px)';
              e.currentTarget.style.boxShadow = '3px 3px 0px var(--line)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '2px 2px 0px var(--line)';
            }}
          >
            <svg viewBox="0 0 127.14 96.36" fill="currentColor" style={{ width: '16px', height: '16px' }}>
              <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.2,77.2,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.2,77.2,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.87-.64,1.71-1.32,2.51-2a75.46,75.46,0,0,0,73.08,0c.8,0.7,1.64,1.38,2.51,2a68.43,68.43,0,0,1-10.5,5A77.7,77.7,0,0,0,95.14,85.5a105.73,105.73,0,0,0,31-18.83C129,54.65,123.5,31.58,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
            </svg>
            <span>Join Server</span>
          </a>
        </div>
        <button 
          className={`menu-toggle ${mobileMenuOpen ? 'open' : ''}`} 
          onClick={toggleMenu}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>
    </header>
  );
}
