interface PublicFooterProps {
  onResetView: () => void;
}

export default function PublicFooter({ onResetView }: PublicFooterProps) {
  return (
    <footer className="nh-footer" id="footer">
      <div className="nh-footer-wrap">
        <div className="nh-footer-grid">
          <div className="nh-footer-col">
            <div className="nh-footer-brand">
              <img 
                src="https://i.pinimg.com/1200x/14/a1/71/14a171de882e567cc020668c691eba2d.jpg" 
                alt="NhoyHub Logo" 
                className="nh-footer-logo" 
              />
              <span className="nh-footer-title">Nhoy<span>Hub</span></span>
            </div>
            <p className="nh-footer-desc">
              Your source for esign, Trollstore, and other iOS utilities. Providing free downloads and resources for the community.
            </p>
          </div>
          <div className="nh-footer-col">
            <h3 className="nh-footer-heading">Quick Links</h3>
            <ul className="nh-footer-links">
              <li>
                <button onClick={(e) => { e.preventDefault(); onResetView(); }}>Home</button>
              </li>
              <li>
                <button onClick={(e) => { e.preventDefault(); window.location.href = '/index.html#esign'; }}>ESIGN</button>
              </li>
              <li>
                <button onClick={(e) => { e.preventDefault(); window.location.href = '/index.html#roblox'; }}>Roblox Hack</button>
              </li>
              <li>
                <button onClick={(e) => { e.preventDefault(); window.location.href = '/index.html#troll'; }}>Troll Store</button>
              </li>
            </ul>
          </div>
          <div className="nh-footer-col">
            <h3 className="nh-footer-heading">Contact Us</h3>
            <div className="nh-footer-socials">
              <a 
                href="https://t.me/nhoy200" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="nh-footer-social-btn tg"
              >
                <i className="fa-brands fa-telegram"></i>
              </a>
              <a 
                href="https://www.youtube.com/@xai-qq" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="nh-footer-social-btn yt"
              >
                <i className="fa-brands fa-youtube"></i>
              </a>
            </div>
          </div>
          <div className="nh-footer-col">
            <h3 className="nh-footer-heading">Language</h3>
            <button className="nh-footer-lang-btn">
              <span>English</span>
              <i className="fa-solid fa-check" style={{ color: 'var(--violet)' }}></i>
            </button>
          </div>
        </div>
        <div className="nh-footer-bottom">
          <p>© 2025 Nhoy Official. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
