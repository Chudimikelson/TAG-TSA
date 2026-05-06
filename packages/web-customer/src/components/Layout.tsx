import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import styles from './Layout.module.css';

export function Layout() {
  const { logout } = useAuth();
  return (
    <div className={styles.layout}>
      <nav className={styles.sidebar}>
        <h2>Tagora Savings</h2>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/collections">Collections</Link>
        <Link to="/withdrawals">Withdrawals</Link>
        <button className={styles.logoutBtn} onClick={logout}>
          Log out
        </button>
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
