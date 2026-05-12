import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout.js';
import { getAssignments, type Assignment } from '../api/collections.js';
import {
  getMemberPlans,
  updateMember,
  updatePlan,
  createPlan,
  type UpdateMemberPayload,
  type UpdatePlanPayload,
} from '../api/members.js';
import type { SavingsPlan } from '@tagora/shared';
import { useAuth } from '../context/AuthContext.js';

type Frequency = 'daily' | 'weekly' | 'monthly';

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const PLAN_OPTIONS = ['Regular', 'Target', 'Special'] as const;

function normalizePlanName(name?: string): (typeof PLAN_OPTIONS)[number] {
  const match = PLAN_OPTIONS.find(
    (option) => option.toLowerCase() === (name ?? '').trim().toLowerCase(),
  );
  return match ?? 'Regular';
}

export function KycUpdatePage() {
  const { tso } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [search, setSearch] = useState('');
  const [plans, setPlans] = useState<SavingsPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [nationalIdRef, setNationalIdRef] = useState('');

  const [planName, setPlanName] = useState<(typeof PLAN_OPTIONS)[number]>('Regular');
  const [planAmount, setPlanAmount] = useState('');
  const [planFrequency, setPlanFrequency] = useState<Frequency>('daily');
  const [planStartDate, setPlanStartDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!tso) return;
    setLoading(true);
    getAssignments(tso.tsoId)
      .then((rows) => {
        setAssignments(rows);
        if (rows.length > 0) {
          setSelectedMemberId(rows[0].member.memberId);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tso]);

  const filteredAssignments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter(({ member }) => {
      const haystack = [member.name, member.phone, member.accountNumber, member.memberId]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [assignments, search]);

  const selectedAssignment = assignments.find((row) => row.member.memberId === selectedMemberId);

  useEffect(() => {
    if (!selectedAssignment) return;
    const { member } = selectedAssignment;
    setPhone(member.phone ?? '');
    setAddress(member.address ?? '');
    setAccountNumber(member.accountNumber ?? '');
    setNationalIdRef(member.nationalIdRef ?? '');
    setSuccess('');

    getMemberPlans(member.memberId)
      .then((memberPlans) => {
        setPlans(memberPlans);
        const activePlan = memberPlans.find((p) => p.status === 'active') ?? memberPlans[0];
        if (!activePlan) {
          setSelectedPlanId('');
          setPlanName('Regular');
          setPlanAmount('');
          setPlanFrequency('daily');
          setPlanStartDate(new Date().toISOString().slice(0, 10));
          return;
        }

        setSelectedPlanId(activePlan.planId);
        setPlanName(normalizePlanName(activePlan.name));
        setPlanAmount(String(activePlan.amount));
        setPlanFrequency(activePlan.frequency);
        setPlanStartDate(new Date(activePlan.startDate).toISOString().slice(0, 10));
      })
      .catch((e: Error) => setError(e.message));
  }, [selectedAssignment]);

  useEffect(() => {
    if (!selectedPlanId) return;
    const plan = plans.find((p) => p.planId === selectedPlanId);
    if (!plan) return;
    setPlanName(normalizePlanName(plan.name));
    setPlanAmount(String(plan.amount));
    setPlanFrequency(plan.frequency);
    setPlanStartDate(new Date(plan.startDate).toISOString().slice(0, 10));
  }, [plans, selectedPlanId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedAssignment) return;

    const trimmedAccount = accountNumber.trim();
    const trimmedNin = nationalIdRef.trim();
    if (!trimmedAccount) {
      setError('Account number is required.');
      return;
    }
    if (!trimmedNin) {
      setError('NIN/BVN is required.');
      return;
    }

    const amount = Number(planAmount);
    if (!Number.isInteger(amount) || amount <= 0) {
      setError('Savings plan amount must be a whole number greater than zero.');
      return;
    }
    if (!planName.trim()) {
      setError('Plan name is required.');
      return;
    }
    if (!planStartDate) {
      setError('Start date is required.');
      return;
    }

    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const memberPayload: UpdateMemberPayload = {
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        accountNumber: trimmedAccount,
        nationalIdRef: trimmedNin,
      };
      const updatedMember = await updateMember(selectedAssignment.member.memberId, memberPayload);

      setAssignments((prev) =>
        prev.map((row) =>
          row.member.memberId === updatedMember.memberId
            ? { ...row, member: { ...row.member, ...updatedMember } }
            : row,
        ),
      );

      if (selectedPlanId) {
        const planPayload: UpdatePlanPayload = {
          name: planName.trim() || undefined,
          amount,
          frequency: planFrequency,
          startDate: planStartDate,
        };
        const updatedPlan = await updatePlan(selectedAssignment.member.memberId, selectedPlanId, planPayload);
        setPlans((prev) => prev.map((p) => (p.planId === updatedPlan.planId ? updatedPlan : p)));
        setAssignments((prev) =>
          prev.map((row) =>
            row.member.memberId === selectedAssignment.member.memberId
              ? { ...row, activePlan: row.activePlan?.planId === updatedPlan.planId ? updatedPlan : row.activePlan }
              : row,
          ),
        );
      } else {
        const newPlan = await createPlan(selectedAssignment.member.memberId, {
          name: planName.trim(),
          amount,
          frequency: planFrequency,
          startDate: planStartDate,
        });
        setPlans([newPlan]);
        setSelectedPlanId(newPlan.planId);
        setAssignments((prev) =>
          prev.map((row) =>
            row.member.memberId === selectedAssignment.member.memberId
              ? { ...row, activePlan: newPlan }
              : row,
          ),
        );
      }

      setSuccess('KYC and savings plan details updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer details');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="KYC Update">
      {loading && <div className="spinner">Loading customers…</div>}
      {error && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      {!loading && assignments.length === 0 && (
        <div className="empty-state">No thrift savers available for KYC updates yet.</div>
      )}

      {!loading && assignments.length > 0 && (
        <>
          {/* ── Customer search ── */}
          <div style={{ maxWidth: 720, marginBottom: 20 }}>
            <div className="field">
              <div className="search-input-frame">
                <label className="search-input-legend" htmlFor="customer-search">Search Customer</label>
                <input
                  className="modern-search-input"
                  id="customer-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by customer name"
                />
              </div>
            </div>

            {search.trim() && (
              <div style={{ display: 'grid', gap: 6 }}>
                {filteredAssignments.length === 0 && (
                  <div className="empty-state" style={{ margin: 0 }}>No customers matched.</div>
                )}
                {filteredAssignments.slice(0, 8).map(({ member }) => (
                  <button
                    key={member.memberId}
                    type="button"
                    className="card static"
                    style={{ textAlign: 'left', cursor: 'pointer' }}
                    onClick={() => { setSelectedMemberId(member.memberId); setSearch(''); }}
                  >
                    <span style={{ fontWeight: 600 }}>{member.name}</span>
                    <span className="card-sub" style={{ marginLeft: 8 }}>{member.phone ?? member.accountNumber}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Edit form (mirrors AddThriftSaverPage exactly) ── */}
          {!selectedAssignment && !search.trim() && (
            <div className="empty-state">Search for a customer above to edit their details.</div>
          )}

          {selectedAssignment && (
            <form onSubmit={handleSubmit} style={{ maxWidth: 720 }}>
              {/* ── Personal Details ── */}
              <p className="section-label" style={{ marginBottom: 12, fontSize: 14, color: 'var(--primary)', fontWeight: 700 }}>
                Personal Details — {selectedAssignment.member.name}
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '0 20px',
              }}>

                <div className="field">
                  <label className="field-label" htmlFor="kyc-phone">Phone number</label>
                  <input
                    id="kyc-phone"
                    type="tel"
                    placeholder="+234…"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="kyc-account">Account number</label>
                  <input
                    id="kyc-account"
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="kyc-nin">National ID / BVN</label>
                  <input
                    id="kyc-nin"
                    type="text"
                    placeholder="NIN or BVN reference"
                    value={nationalIdRef}
                    onChange={(e) => setNationalIdRef(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="kyc-address">Address (optional)</label>
                  <input
                    id="kyc-address"
                    type="text"
                    placeholder="e.g. 12 Market Road, Lagos"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

              </div>{/* end personal grid */}

              {/* ── Savings Plan ── */}
              <p className="section-label" style={{ margin: '20px 0 12px', fontSize: 14, color: 'var(--primary)', fontWeight: 700 }}>
                Savings Plan
              </p>

              {plans.length > 1 && (
                <div className="field">
                  <label className="field-label" htmlFor="kyc-plan-select">Select plan</label>
                  <select
                    id="kyc-plan-select"
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                  >
                    {plans.map((plan) => (
                      <option key={plan.planId} value={plan.planId}>
                        {plan.name} ({plan.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '0 20px',
              }}>

                <div className="field">
                  <label className="field-label" htmlFor="kyc-plan-name">Plan name</label>
                  <select
                    id="kyc-plan-name"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value as (typeof PLAN_OPTIONS)[number])}
                    required
                  >
                    {PLAN_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="kyc-plan-amount">Amount per contribution (₦)</label>
                  <input
                    id="kyc-plan-amount"
                    type="number"
                    min="1"
                    step="1"
                    value={planAmount}
                    onChange={(e) => setPlanAmount(e.target.value)}
                    required
                  />
                </div>

              </div>{/* end plan grid */}

              <div className="field">
                <span className="section-label">Frequency</span>
                <div className="toggle-group">
                  {FREQUENCIES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`toggle-btn ${planFrequency === item.value ? 'active' : ''}`}
                      onClick={() => setPlanFrequency(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="kyc-plan-date">Start date</label>
                <input
                  id="kyc-plan-date"
                  type="date"
                  value={planStartDate}
                  onChange={(e) => setPlanStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-actions">
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={() => setSelectedMemberId('')}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </Layout>
  );
}
