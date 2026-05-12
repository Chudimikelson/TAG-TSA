import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { Member, SavingsPlan } from '@tagora/shared';
import { Layout } from '../components/Layout.js';
import { getAssignments, type Assignment } from '../api/collections.js';
import { useAuth } from '../context/AuthContext.js';

interface LocationState {
  member?: Member;
  activePlan?: SavingsPlan | null;
}

export function ThriftSaverDetailsPage() {
  const { tso } = useAuth();
  const location = useLocation();
  const { memberId = '' } = useParams<{ memberId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignment, setAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    const state = (location.state as LocationState | null) ?? null;
    if (state?.member && state.member.memberId === memberId) {
      setAssignment({ member: state.member, activePlan: state.activePlan ?? null });
      setLoading(false);
      return;
    }

    if (!tso) {
      setLoading(false);
      setError('Unable to load thrift saver details.');
      return;
    }

    getAssignments(tso.tsoId)
      .then((rows) => {
        const match = rows.find((item) => item.member.memberId === memberId) ?? null;
        setAssignment(match);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [location.state, memberId, tso]);

  const member = assignment?.member;
  const activePlan = assignment?.activePlan;

  return (
    <Layout
      title="Thrift Saver Details"
      action={
        <Link to="/thrift-savers" className="btn btn-outline btn-sm">
          Back to Thrift Savers
        </Link>
      }
    >
      {loading && <div className="spinner">Loading thrift saver details…</div>}
      {error && <div className="error-msg">{error}</div>}

      {!loading && !error && !member && (
        <div className="empty-state">Thrift saver not found.</div>
      )}

      {!loading && !error && member && (
        <>
          <div className="card static">
            <div className="card-title" style={{ marginBottom: 8 }}>{member.name}</div>
            <div className="card-sub" style={{ marginBottom: 4 }}>Member ID: {member.memberId}</div>
            <div className="card-sub">Account Number: {member.accountNumber}</div>
          </div>

          <div className="card static">
            <div className="section-label">Contact Details</div>
            <div className="card-sub" style={{ marginBottom: 4 }}>Phone: {member.phone ?? 'N/A'}</div>
            <div className="card-sub" style={{ marginBottom: 4 }}>Email: {member.email ?? 'N/A'}</div>
            <div className="card-sub">Address: {member.address ?? 'N/A'}</div>
          </div>

          <div className="card static">
            <div className="section-label">Savings Snapshot</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>
              ₦{Number(member.savingsBalance ?? 0).toLocaleString()}
            </div>
            <div className="card-sub" style={{ marginBottom: 4 }}>
              KYC Status: <span className={`badge badge-${member.kycStatus}`}>{member.kycStatus}</span>
            </div>
            {activePlan ? (
              <div className="card-sub">
                Active Plan: {activePlan.name} • ₦{activePlan.amount.toLocaleString()} / {activePlan.frequency}
              </div>
            ) : (
              <div className="card-sub" style={{ color: 'var(--warning)' }}>No active plan</div>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}
