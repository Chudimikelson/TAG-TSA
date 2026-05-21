import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import styles from './Layout.module.css';

const NAV_LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/tso-performance', label: 'TSO Performance' },
  { to: '/members', label: 'Thrift Savers' },
  { to: '/collections', label: 'Collections' },
  { to: '/withdrawals', label: 'Withdrawals' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/reconciliation', label: 'Reconciliation' },
];

const ADMIN_ONLY_LINKS = [
  { to: '/user-management', label: 'User Management', requiredAdminRole: 'SuperAdmin' },
];

export function Layout() {
  const { logout, user } = useAuth();

  const visibleNavLinks = NAV_LINKS.filter(
    (link) => !(link.to === '/tso-performance' && user?.adminRole === 'CSM'),
  );

  const visibleAdminLinks = ADMIN_ONLY_LINKS.filter(
    (link) => user?.adminRole === link.requiredAdminRole,
  );

  const allLinks = [...visibleNavLinks, ...visibleAdminLinks];

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandLogoWrap}>
            <img src="/tagora-logo-2.png" alt="Tagora logo" className={styles.brandLogo} />
          </div>
          <span className={styles.brandTitle}>TAGORA</span>
          <span className={styles.brandSubtitle}>Igniting Possibilities</span>
        </div>
        <nav className={styles.nav}>
          {allLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [styles.link, isActive ? styles.active : ''].join(' ')
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.identity}>
            <div className={styles.identityName}>{user?.name ?? 'Admin User'}</div>
            <div className={styles.identityRole}>{user?.adminRole ?? 'Admin'}</div>
          </div>
          <button className={styles.logout} onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
