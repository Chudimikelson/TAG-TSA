import { useEffect, useState } from 'react';
import { getMe, type MeResponse } from '../api/customer.js';
import styles from './Page.module.css';
import db from './DashboardPage.module.css';

export function DashboardPage() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getMe()
      .then((res) => setData(res.data))
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <div className={styles.error}>{error}</div>;
  if (!data) return <p className={styles.loading}>Loading…</p>;

  const { member, plans } = data;
  const activePlan = plans.find((p) => p.status === 'active');

  return (
    <div className={styles.page}>
      <h1>Welcome, {member.name}</h1>
      <div className={db.cards}>
        <div className={db.card}>
          <span className={db.label}>Member ID</span>
          <span className={db.value}>{member.memberId}</span>
        </div>
        <div className={db.card}>
          <span className={db.label}>Phone</span>
          <span className={db.value}>{member.phone}</span>
        </div>
        {activePlan && (
          <>
            <div className={db.card}>
              <span className={db.label}>Plan name</span>
              <span className={db.value}>{activePlan.name}</span>
            </div>
            <div className={db.card}>
              <span className={db.label}>Contribution</span>
              <span className={db.value}>
                {activePlan.amount.toLocaleString()} / {activePlan.frequency}
              </span>
            </div>
            <div className={db.card}>
              <span className={db.label}>Next due</span>
              <span className={db.value}>
                {new Date(activePlan.nextScheduledDate).toLocaleDateString()}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
