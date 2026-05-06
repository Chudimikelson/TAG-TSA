import styles from './DashboardPage.module.css';

const CARDS = [
  { label: 'Thrift Savers', to: '/members' },
  { label: 'Collections', to: '/collections' },
  { label: 'Pending Withdrawals', to: '/withdrawals' },
  { label: 'Unmatched Transactions', to: '/transactions' },
  { label: 'Reconciliation', to: '/reconciliation' },
];

export function DashboardPage() {
  return (
    <div>
      <h1 className={styles.heading}>Dashboard</h1>
      <div className={styles.grid}>
        {CARDS.map(({ label, to }) => (
          <a key={to} href={to} className={styles.card}>
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
