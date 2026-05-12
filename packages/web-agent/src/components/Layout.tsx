import { ReactNode, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

interface LayoutProps {
  title: string;
  action?: ReactNode;
  mobileAction?: ReactNode;
  children: ReactNode;
}

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Collections', icon: '💵' },
  { to: '/thrift-savers', label: 'Thrift Savers', icon: '👥' },
  { to: '/daily-report', label: 'Daily Report', icon: '📊' },
  { to: '/kyc-update', label: 'KYC Update', icon: '🪪' },
  { to: '/withdrawals', label: 'Withdrawals', icon: '💳' },
];

export function Layout({ title, action, mobileAction, children }: LayoutProps) {
  const { tso, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className={`app-shell ${navOpen ? 'mobile-nav-open' : ''} ${userMenuOpen ? 'mobile-user-open' : ''}`}>
      <div className="mobile-topbar">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setNavOpen((prev) => !prev)}
          aria-label={navOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={navOpen}
          aria-controls="agent-sidebar-nav"
        >
          <span aria-hidden>{navOpen ? '✕' : '☰'}</span>
        </button>
        <div className="mobile-topbar-title">{title}</div>

        <div className="mobile-topbar-actions">
          {mobileAction}

          <div className="mobile-user-menu-wrap">
            <button
              type="button"
              className="mobile-user-btn"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-label="Open user menu"
            >
              👤
            </button>

            {userMenuOpen && (
              <div className="mobile-user-menu">
                <div className="mobile-user-name">{tso?.name ?? 'Agent'}</div>
                <button type="button" className="mobile-user-signout" onClick={handleLogout}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="sidebar-backdrop"
        onClick={() => {
          setNavOpen(false);
          setUserMenuOpen(false);
        }}
        aria-label="Close navigation menu"
      />

      <aside className="sidebar">
        <div className="sidebar-logo">
          Tagora
          <span>TSO Portal</span>
        </div>

        <nav className="sidebar-nav" id="agent-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setNavOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <strong>{tso?.name ?? 'Agent'}</strong>
            {tso?.phone}
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="mobile-menu-panel" aria-hidden={!navOpen}>
        <div className="mobile-menu-grid">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={`mobile-${item.to}`}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `mobile-menu-card ${isActive ? 'active' : ''}`}
              onClick={() => setNavOpen(false)}
            >
              <span className="mobile-menu-icon" aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      <div className="main-content">
        <div className="page-header">
          <h1>{title}</h1>
          {action && <div className="page-header-action">{action}</div>}
        </div>
        <div className="page-body">{children}</div>
      </div>
    </div>
  );
}
