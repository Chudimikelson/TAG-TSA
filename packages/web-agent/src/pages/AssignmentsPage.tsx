import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout.js';
import { getAssignments, Assignment } from '../api/collections.js';
import { useAuth } from '../context/AuthContext.js';

type SummaryCard = {
  label: string;
  amount: number;
  savers: number;
};

function normalizePlanName(name?: string): 'regular' | 'target' | 'special' | 'other' {
  const normalized = (name ?? '').trim().toLowerCase();
  if (normalized === 'regular') return 'regular';
  if (normalized === 'target') return 'target';
  if (normalized === 'special') return 'special';
  return 'other';
}

export function AssignmentsPage() {
  const { tso } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tso) return;
    getAssignments(tso.tsoId)
      .then(setAssignments)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tso]);

  const totalSavingsAmount = assignments.reduce(
    (sum, { member }) => sum + Number(member.savingsBalance ?? 0),
    0,
  );

  const byPlan = assignments.reduce(
    (acc, { member, activePlan }) => {
      const key = normalizePlanName(activePlan?.name);
      if (key === 'other') return acc;
      acc[key].amount += Number(member.savingsBalance ?? 0);
      acc[key].savers += 1;
      return acc;
    },
    {
      regular: { amount: 0, savers: 0 },
      target: { amount: 0, savers: 0 },
      special: { amount: 0, savers: 0 },
    },
  );

  const summaryCards: SummaryCard[] = [
    { label: 'Total Savings', amount: totalSavingsAmount, savers: assignments.length },
    { label: 'Regular Plan', amount: byPlan.regular.amount, savers: byPlan.regular.savers },
    { label: 'Target Plan', amount: byPlan.target.amount, savers: byPlan.target.savers },
    { label: 'Special Plan', amount: byPlan.special.amount, savers: byPlan.special.savers },
  ];

  const normalizedSearch = search.trim().toLowerCase();
  const filteredAssignments = assignments.filter(({ member }) => {
    if (!normalizedSearch) return true;
    const searchable = [member.name, member.phone, member.accountNumber, member.memberId]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return searchable.includes(normalizedSearch);
  });

  return (
    <Layout
      title="Thrift Savers"
      action={
        <Link to="/thrift-savers/add" className="btn btn-primary btn-sm">
          + Add Thrift Saver
        </Link>
      }
    >
      <div className="mobile-thrift-saver-add-wrap">
        <Link to="/thrift-savers/add" className="btn btn-primary btn-sm mobile-thrift-saver-add-btn">
          + Add Thrift Saver
        </Link>
      </div>

      {loading && <div className="spinner" aria-label="Loading members" />}
      {error && <div className="error-msg">{error}</div>}

      {!loading && !error && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 12,
            marginBottom: 14,
          }}
        >
          {summaryCards.map((card) => (
            <div key={card.label} className="card static">
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{card.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>
                ₦{card.amount.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {card.savers.toLocaleString()} saver{card.savers === 1 ? '' : 's'}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && assignments.length === 0 && (
        <div className="empty-state">No assigned members yet.</div>
      )}

      {!loading && !error && assignments.length > 0 && (
        <div className="field" style={{ marginBottom: 12 }}>
          <div className="search-input-frame">
            <label className="search-input-legend" htmlFor="thrift-saver-search">Search Customer</label>
            <input
              className="modern-search-input"
              id="thrift-saver-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name"
            />
          </div>
        </div>
      )}

      {!loading && !error && assignments.length > 0 && filteredAssignments.length === 0 && (
        <div className="empty-state">No thrift savers match your search.</div>
      )}

      {filteredAssignments.map(({ member, activePlan }) => (
        <div
          key={member.memberId}
          className="card"
          onClick={() =>
            navigate(`/thrift-savers/${member.memberId}`, {
              state: { member, activePlan },
            })
          }
        >
          <div className="row">
            <div>
              <div className="card-title">{member.name}</div>
              <div className="card-sub">{member.phone}</div>
              <div className="card-sub">
                Balance: ₦{Number(member.savingsBalance ?? 0).toLocaleString()}
              </div>
            </div>
            {activePlan && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
                  ₦{activePlan.amount.toLocaleString()}
                </div>
                <div className="card-sub">{activePlan.frequency}</div>
              </div>
            )}
          </div>
          {activePlan && (
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>
              Plan: {activePlan.name}
            </div>
          )}
          {!activePlan && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--warning)' }}>
              No active plan
            </div>
          )}
        </div>
      ))}
    </Layout>
  );
}
