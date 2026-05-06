import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import styles from './Layout.module.css';

const NAV_LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/tsos', label: 'TSOs' },
  { to: '/members', label: 'Thrift Savers' },
  { to: '/collections', label: 'Collections' },
  { to: '/withdrawals', label: 'Withdrawals' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/reconciliation', label: 'Reconciliation' },
];

export function Layout() {
  const { logout } = useAuth();
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>Tagora Admin</div>
        <nav className={styles.nav}>
          {NAV_LINKS.map(({ to, label }) => (
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
        <button className={styles.logout} onClick={logout}>
          Sign out
        </button>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
