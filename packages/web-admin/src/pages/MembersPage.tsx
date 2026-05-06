import { useEffect, useState } from 'react';
import type { Member, SavingsPlan } from '@tagora/shared';
import { getMemberPlans, getMembers } from '../api/members.js';
import { Badge } from '../components/Badge.js';
import { Table } from '../components/Table.js';
import styles from './Page.module.css';

export function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [plans, setPlans] = useState<SavingsPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    getMembers()
      .then((res) => setMembers(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSelect(memberId: string) {
    if (selected === memberId) {
      setSelected(null);
      setPlans([]);
      return;
    }
    setSelected(memberId);
    setPlansLoading(true);
    try {
      const res = await getMemberPlans(memberId);
      setPlans(res.data);
    } catch {
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  }

  return (
    <div>
      <h1 className={styles.heading}>Thrift Savers</h1>
      {error && <p className={styles.error}>{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <Table
          rows={members}
          keyFn={(r) => r.memberId}
          emptyMessage="No thrift savers."
          columns={[
            { header: 'Account No.', render: (r) => r.accountNumber },
            { header: 'Name', render: (r) => r.name },
            {
              header: 'Balance (₦)',
              render: (r) => Number(r.savingsBalance ?? 0).toLocaleString(),
            },
            {
              header: 'Savings Plan',
              render: (r) => (
                <button
                  className={styles.btnPrimary}
                  onClick={() => handleSelect(r.memberId)}
                >
                  {selected === r.memberId ? 'Hide' : 'View plans'}
                </button>
              ),
            },
            { header: 'KYC', render: (r) => <Badge value={r.kycStatus} /> },
            { header: 'TSO', render: (r) => r.tsoName ?? '—' },
          ]}
        />
      )}

      {selected && (
        <div style={{ marginTop: 24 }}>
          <h2
            style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12 }}
          >
            Plans for {members.find((m) => m.memberId === selected)?.name}
          </h2>
          {plansLoading ? (
            <p>Loading plans…</p>
          ) : (
            <Table
              rows={plans}
              keyFn={(r) => r.planId}
              emptyMessage="No plans."
              columns={[
                { header: 'Plan', render: (r) => r.name },
                {
                  header: 'Amount (₦)',
                  render: (r) => r.amount.toLocaleString(),
                },
                { header: 'Frequency', render: (r) => r.frequency },
                {
                  header: 'Next Due',
                  render: (r) =>
                    new Date(r.nextScheduledDate).toLocaleDateString('en-NG'),
                },
                {
                  header: 'Status',
                  render: (r) => <Badge value={r.status} />,
                },
              ]}
            />
          )}
        </div>
      )}
    </div>
  );
}
