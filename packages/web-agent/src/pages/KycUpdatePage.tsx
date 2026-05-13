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

function isLegacyNationalId(value?: string): boolean {
  const normalized = String(value ?? '').trim();
  return /^LEGACY-/i.test(normalized);
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
  const [isEditing, setIsEditing] = useState(false);
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
  const selectedMember = selectedAssignment?.member;
  const kycCompletion = useMemo(() => {
    if (!selectedMember) return 0;
    const checks = [
      selectedMember.phone,
      selectedMember.address,
      selectedMember.accountNumber,
    ].map((value) => Boolean(String(value ?? '').trim()));

    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }, [selectedMember]);

  useEffect(() => {
    if (!selectedAssignment) return;
    const { member } = selectedAssignment;
    setPhone(member.phone ?? '');
    setAddress(member.address ?? '');
    setAccountNumber(member.accountNumber ?? '');
    setNationalIdRef(isLegacyNationalId(member.nationalIdRef) ? '' : (member.nationalIdRef ?? ''));
    setSuccess('');
    setIsEditing(false);

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
        nationalIdRef: trimmedNin || undefined,
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
      setIsEditing(false);
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
          <div className="kyc-intro-card card static" style={{ marginBottom: 16 }}>
            <div className="row kyc-intro-row">
              <div>
                <div className="card-title" style={{ marginBottom: 4 }}>Update Customer KYC</div>
                <div className="card-sub">Search a thrift saver, review the current record, then update personal details and plan information.</div>
              </div>
              <div className="kyc-intro-pill">{assignments.length} customer{assignments.length === 1 ? '' : 's'}</div>
            </div>
          </div>

          <div className={`kyc-desktop-grid ${isEditing ? 'editing' : 'view-only'}`} style={{ marginBottom: 20 }}>
            <div className="kyc-left-column">
              <div className="card static kyc-search-card">
                <div className="section-label" style={{ marginBottom: 12 }}>Search Customer</div>
                <div className="field" style={{ marginBottom: 12 }}>
                  <div className="search-input-frame">
                    <label className="search-input-legend" htmlFor="customer-search">Search Customer</label>
                    <input
                      className="modern-search-input"
                      id="customer-search"
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by customer name, phone or account number"
                    />
                  </div>
                </div>

                {search.trim() && (
                  <div className="kyc-results-list">
                    {filteredAssignments.length === 0 && (
                      <div className="empty-state" style={{ margin: 0, padding: '20px 12px' }}>No customers matched.</div>
                    )}
                    {filteredAssignments.slice(0, 8).map(({ member }) => (
                      <button
                        key={member.memberId}
                        type="button"
                        className={`kyc-result-card ${selectedMemberId === member.memberId ? 'active' : ''}`}
                        onClick={() => { setSelectedMemberId(member.memberId); setSearch(''); }}
                      >
                        <div className="kyc-result-avatar">{member.name.charAt(0).toUpperCase()}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700 }}>{member.name}</div>
                          <div className="card-sub">{member.phone ?? member.accountNumber}</div>
                        </div>
                        <div className="kyc-result-arrow">›</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="card static kyc-selected-card">
                <div className="section-label" style={{ marginBottom: 12 }}>
                  {isEditing ? 'Edit Details' : 'Selected Customer'}
                </div>
                {!selectedAssignment && !search.trim() && (
                  <div className="empty-state" style={{ margin: 0, padding: '22px 12px' }}>Search for a customer above to edit their details.</div>
                )}

                {selectedAssignment && selectedMember && !isEditing && (
                  <>
                    <div style={{ marginBottom: 14 }}>
                      <div className="row" style={{ marginBottom: 6 }}>
                        <div className="card-sub">KYC Completion</div>
                        <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {kycCompletion}% Complete
                        </div>
                      </div>
                      <div
                        style={{
                          height: 8,
                          borderRadius: 999,
                          background: '#e5e7eb',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${kycCompletion}%`,
                            height: '100%',
                            background: 'var(--primary-mid)',
                            transition: 'width 0.2s ease',
                          }}
                        />
                      </div>
                    </div>

                    <div className="kyc-summary-header">
                      <div className="kyc-summary-avatar">{selectedMember.name.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="card-title" style={{ marginBottom: 4 }}>{selectedMember.name}</div>
                        <div className="card-sub">Member ID: {selectedMember.memberId}</div>
                      </div>
                    </div>

                    <div className="kyc-summary-grid">
                      <div>
                        <div className="card-sub">Phone</div>
                        <div style={{ fontWeight: 600 }}>{selectedMember.phone ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div className="card-sub">Account</div>
                        <div style={{ fontWeight: 600 }}>{selectedMember.accountNumber ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div className="card-sub">Balance</div>
                        <div style={{ fontWeight: 700, color: 'var(--primary)' }}>₦{Number(selectedMember.savingsBalance ?? 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="card-sub">KYC Status</div>
                        <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{selectedMember.kycStatus}</div>
                      </div>
                      <div>
                        <div className="card-sub">National ID / BVN</div>
                        <div style={{ fontWeight: 600 }}>
                          {isLegacyNationalId(selectedMember.nationalIdRef)
                            ? 'Not provided'
                            : (selectedMember.nationalIdRef ?? 'Not provided')}
                        </div>
                      </div>
                      <div>
                        <div className="card-sub">Address</div>
                        <div style={{ fontWeight: 600 }}>{selectedMember.address ?? 'N/A'}</div>
                      </div>
                    </div>

                    {selectedAssignment.activePlan && (
                      <div className="kyc-plan-preview">
                        {selectedAssignment.activePlan.name} · ₦{selectedAssignment.activePlan.amount.toLocaleString()} / {selectedAssignment.activePlan.frequency}
                      </div>
                    )}

                    <div className="form-actions" style={{ marginTop: 12 }}>
                      <button
                        className="btn btn-primary"
                        type="button"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit Details
                      </button>
                    </div>
                  </>
                )}

                {selectedAssignment && isEditing && (
                  <form onSubmit={handleSubmit} className="kyc-form-shell">
                    <div className="kyc-form-grid">
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
                    </div>

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

                    <div className="kyc-form-grid">
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
                    </div>

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
                        onClick={() => setIsEditing(false)}
                        disabled={saving}
                      >
                        Back
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
