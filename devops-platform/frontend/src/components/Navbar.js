import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { to: '/', label: 'Home', exact: true },
  { to: '/tracks', label: 'Tracks', exact: false },
  { to: '/courses', label: 'Courses', exact: true },
  { to: '/articles', label: 'Articles', exact: false },
  { to: '/live', label: 'Live', exact: false, live: true },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const dropRef = useRef(null);

  /* close dropdown on outside click */
  useEffect(() => {
    const handle = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  /* close mobile menu on route change */
  useEffect(() => { setMenuOpen(false); setDropOpen(false); }, [location.pathname]);

  /* lock body scroll when mobile menu open */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  /* subtle shadow on scroll */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (link) =>
    link.exact
      ? location.pathname === link.to
      : location.pathname.startsWith(link.to);

  const handleLogout = () => {
    logout();
    navigate('/');
    setDropOpen(false);
    setMenuOpen(false);
  };

  return (
    <>
      {/* ── Main navbar ──────────────────────────────────────── */}
      <nav
        className="navbar"
        style={scrolled ? { boxShadow: '0 2px 20px rgba(0,0,0,0.5)' } : undefined}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Brand */}
        <Link to="/" className="navbar-brand" aria-label="CloudNexa Academy home">
          <div className="brand-icon" aria-hidden="true">☁️</div>
          <span>CloudNexa <span className="brand-accent">Academy</span></span>
        </Link>

        {/* Desktop links */}
        <div className="navbar-links" role="menubar">
          {NAV_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link ${isActive(link) ? 'active' : ''}`}
              role="menuitem"
            >
              {link.live && <span className="live-dot" aria-hidden="true" />}
              {link.label}
            </Link>
          ))}
          {user && (
            <Link
              to="/dashboard"
              className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
              role="menuitem"
            >
              My Learning
            </Link>
          )}
        </div>

        {/* Desktop actions */}
        <div className="navbar-actions">
          {user ? (
            <div className="nav-dropdown" ref={dropRef}>
              <button
                className="nav-avatar"
                onClick={() => setDropOpen(o => !o)}
                aria-label="Account menu"
                aria-expanded={dropOpen}
                aria-haspopup="true"
                style={{ backgroundImage: user.avatar ? `url(${user.avatar})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', color: user.avatar ? 'transparent' : 'white' }}
              >
                {user.avatar ? '' : user.name.charAt(0).toUpperCase()}
              </button>

              {dropOpen && (
                <div className="nav-dropdown-menu" role="menu">
                  <div className="dropdown-user">
                    <div className="dropdown-user-name">{user.name}</div>
                    <div className="dropdown-user-email">{user.email}</div>
                  </div>

                  {user.role === 'admin' && (
                    <button
                      className="nav-dropdown-item"
                      role="menuitem"
                      onClick={() => { navigate('/admin'); setDropOpen(false); }}
                    >
                      <span aria-hidden="true">🛡️</span> Admin Panel
                    </button>
                  )}

                  <button
                    className="nav-dropdown-item"
                    role="menuitem"
                    onClick={() => { navigate('/dashboard'); setDropOpen(false); }}
                  >
                    <span aria-hidden="true">📚</span> My Courses
                  </button>

                  <button
                    className="nav-dropdown-item"
                    role="menuitem"
                    onClick={() => { navigate('/profile'); setDropOpen(false); }}
                  >
                    <span aria-hidden="true">⚙️</span> Profile Settings
                  </button>

                  <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

                  <button
                    className="nav-dropdown-item danger"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <span aria-hidden="true">🚪</span> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="nav-btn outline">Login</Link>
              <Link to="/register" className="nav-btn">Get Started</Link>
            </>
          )}
        </div>

        {/* Hamburger — mobile only */}
        <button
          className={`hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* ── Mobile nav drawer ────────────────────────────────── */}
      <div
        id="mobile-nav"
        className={`mobile-nav ${menuOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        {/* Nav links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link ${isActive(link) ? 'active' : ''}`}
            >
              {link.live && <span className="live-dot" aria-hidden="true" />}
              {link.label}
            </Link>
          ))}
          {user && (
            <Link
              to="/dashboard"
              className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
            >
              My Learning
            </Link>
          )}
        </div>

        <div className="mobile-nav-divider" />

        {/* Auth section */}
        {user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* User info card */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              marginBottom: 4,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--blue), var(--purple))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '1rem', color: '#fff',
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
              </div>
            </div>

            <button
              className="nav-link"
              style={{ justifyContent: 'flex-start', background: 'none', border: 'none', width: '100%', textAlign: 'left', padding: '12px 16px' }}
              onClick={() => { navigate('/profile'); setMenuOpen(false); }}
            >
              <span aria-hidden="true">⚙️</span> Profile Settings
            </button>

            {user.role === 'admin' && (
              <button
                className="nav-link"
                style={{ justifyContent: 'flex-start', background: 'none', border: 'none', width: '100%', textAlign: 'left', padding: '12px 16px' }}
                onClick={() => { navigate('/admin'); setMenuOpen(false); }}
              >
                <span aria-hidden="true">🛡️</span> Admin Panel
              </button>
            )}

            <button
              style={{
                width: '100%', padding: '12px 16px',
                borderRadius: 'var(--radius)', background: 'var(--red-light)',
                color: 'var(--red)', border: '1px solid var(--red-border)',
                fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, marginTop: 4,
                fontFamily: 'var(--font-ui)',
              }}
              onClick={handleLogout}
            >
              <span aria-hidden="true">🚪</span> Logout
            </button>
          </div>
        ) : (
          <div className="mobile-nav-actions">
            <Link
              to="/login"
              className="nav-btn outline"
              style={{ width: '100%', textAlign: 'center', padding: '12px', fontSize: '0.95rem', borderRadius: 'var(--radius)' }}
            >
              Login
            </Link>
            <Link
              to="/register"
              className="nav-btn"
              style={{ width: '100%', textAlign: 'center', padding: '12px', fontSize: '0.95rem', borderRadius: 'var(--radius)' }}
            >
              Get Started →
            </Link>
          </div>
        )}
      </div>

      {/* Backdrop — tap to close on mobile */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed', inset: '64px 0 0 0',
            zIndex: 189, cursor: 'pointer',
          }}
          aria-hidden="true"
        />
      )}
    </>
  );
}
