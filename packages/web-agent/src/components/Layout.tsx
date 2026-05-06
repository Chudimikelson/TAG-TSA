import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

interface LayoutProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function Layout({ title, action, children }: LayoutProps) {
  const { tso, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          Tagora
          <span>TSO Portal</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end>Thrift Savers</NavLink>
          <NavLink to="/daily-report">Daily Report</NavLink>
          <NavLink to="/kyc-update">KYC Update</NavLink>
          <NavLink to="/thrift-savers/add">+ Add Thrift Saver</NavLink>
          <NavLink to="/collections">Collections</NavLink>
          <NavLink to="/withdrawals">Withdrawals</NavLink>
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
          {action}
        </div>
        <div className="page-body">{children}</div>
      </div>
    </div>
  );
}
