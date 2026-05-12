import { ReactNode, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

interface LayoutProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function Layout({ title, action, children }: LayoutProps) {
  const { tso, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className={`app-shell ${navOpen ? 'mobile-nav-open' : ''}`}>
      <div className="mobile-topbar">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setNavOpen((prev) => !prev)}
          aria-label={navOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={navOpen}
          aria-controls="agent-sidebar-nav"
        >
          Menu
        </button>
        <div className="mobile-topbar-title">{title}</div>
      </div>

      <button
        type="button"
        className="sidebar-backdrop"
        onClick={() => setNavOpen(false)}
        aria-label="Close navigation menu"
      />

      <aside className="sidebar">
        <div className="sidebar-logo">
          Tagora
          <span>TSO Portal</span>
        </div>

        <nav className="sidebar-nav" id="agent-sidebar-nav">
          <NavLink to="/" end onClick={() => setNavOpen(false)}>Collections</NavLink>
          <NavLink to="/thrift-savers" onClick={() => setNavOpen(false)}>Thrift Savers</NavLink>
          <NavLink to="/daily-report" onClick={() => setNavOpen(false)}>Daily Report</NavLink>
          <NavLink to="/kyc-update" onClick={() => setNavOpen(false)}>KYC Update</NavLink>
          <NavLink to="/withdrawals" onClick={() => setNavOpen(false)}>Withdrawals</NavLink>
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
