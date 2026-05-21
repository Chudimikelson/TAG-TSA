import { useEffect, useMemo, useState } from 'react';
import type { Member } from '@tagora/shared';
import { getMembers, updateMember } from '../api/members.js';
import { getTsos, type TsoItem } from '../api/tsos.js';
import { Badge } from '../components/Badge.js';
import { Table } from '../components/Table.js';
import styles from './Page.module.css';

export function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [tsos, setTsos] = useState<TsoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [kycFilter, setKycFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [tsoFilter, setTsoFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [targetTsoId, setTargetTsoId] = useState('');
  const [savingReassignment, setSavingReassignment] = useState(false);
  const [copiedMemberId, setCopiedMemberId] = useState('');

  async function loadMembers() {
    const res = await getMembers();
    setMembers(res.data);
  }

  useEffect(() => {
    setLoading(true);
    setError('');
    setSuccess('');
    Promise.all([loadMembers(), getTsos().then((res) => setTsos(res.data))])
      .then(() => undefined)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setLoading(false));
  }, []);

  const filteredMembers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return [];

    return members
      .filter((member) => {
        const haystack = [member.name, member.accountNumber, member.tsoName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, 8);
  }, [members, search]);

  const tableRows = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();

    return [...members]
      .filter((member) => {
        if (kycFilter !== 'all' && member.kycStatus !== kycFilter) {
          return false;
        }

        if (tsoFilter !== 'all' && (member.tsoName ?? '') !== tsoFilter) {
          return false;
        }

        if (branchFilter !== 'all' && (member.branch ?? '') !== branchFilter) {
          return false;
        }

        if (!query) {
          return true;
        }

        const haystack = [
          member.name,
          member.accountNumber,
          member.memberId,
          member.tsoName,
          member.branch,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(query);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [branchFilter, kycFilter, members, tableSearch, tsoFilter]);

  const summary = useMemo(() => {
    const totalBalance = members.reduce((sum, member) => sum + Number(member.savingsBalance ?? 0), 0);
    const verifiedCount = members.filter((member) => member.kycStatus === 'verified').length;
    const pendingCount = members.filter((member) => member.kycStatus === 'pending').length;
    const assignedCount = members.filter((member) => Boolean(member.tsoName)).length;

    return {
      totalCount: members.length,
      totalBalance,
      verifiedCount,
      pendingCount,
      unassignedCount: members.length - assignedCount,
    };
  }, [members]);

  const availableTsoNames = useMemo(
    () => [...new Set(members.map((member) => member.tsoName).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b)),
    [members],
  );

  const availableBranches = useMemo(
    () => [...new Set(members.map((member) => member.branch).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b)),
    [members],
  );

  const selectedMember = members.find((member) => member.memberId === selectedMemberId);

  async function handleReassign() {
    if (!selectedMember) {
      setError('Select a thrift saver to reassign.');
      return;
    }

    if (!targetTsoId) {
      setError('Select a TSO to reassign this thrift saver to.');
      return;
    }

    const nextTso = tsos.find((item) => item.tsoId === targetTsoId);
    if (selectedMember.tsoName && nextTso && selectedMember.tsoName === nextTso.name) {
      setError(`${selectedMember.name} is already assigned to ${nextTso.name}.`);
      return;
    }

    setSavingReassignment(true);
    setError('');
    setSuccess('');

    try {
      await updateMember(selectedMember.memberId, { createdByTsoId: targetTsoId });
      await loadMembers();
      setSuccess(`${selectedMember.name} was reassigned to ${nextTso?.name ?? 'the selected TSO'}.`);
      setSearch('');
      setSelectedMemberId('');
      setTargetTsoId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reassign thrift saver');
    } finally {
      setSavingReassignment(false);
    }
  }

  async function handleCopyAccount(accountNumber: string, memberId: string) {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopiedMemberId(memberId);
      window.setTimeout(() => setCopiedMemberId(''), 1200);
    } catch {
      setError('Unable to copy account number.');
    }
  }

  return (
    <div>
      <h1 className={styles.heading}>Thrift Savers</h1>
      {success && <p className={styles.success}>{success}</p>}
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.card}>
        <div className={styles.formGrid}>
          <div className={styles.label}><span>Total Savers</span><strong>{summary.totalCount.toLocaleString()}</strong></div>
          <div className={styles.label}><span>Total Balance</span><strong>₦{summary.totalBalance.toLocaleString()}</strong></div>
          <div className={styles.label}><span>KYC Verified</span><strong>{summary.verifiedCount.toLocaleString()}</strong></div>
          <div className={styles.label}><span>KYC Pending</span><strong>{summary.pendingCount.toLocaleString()}</strong></div>
          <div className={styles.label}><span>Unassigned</span><strong>{summary.unassignedCount.toLocaleString()}</strong></div>
        </div>
      </div>

      <div className={styles.card}>
        <p className={styles.sectionTitle}>Reassign Thrift Saver</p>
        <p className={styles.sectionSub} style={{ marginBottom: 16 }}>
          Search by customer name or account number, then choose the TSO to reassign the thrift saver to.
        </p>

        <div className={styles.formGrid}>
          <label className={styles.label}>
            <span>Customer Search</span>
            <input
              className={styles.input}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedMemberId('');
                setError('');
              }}
              placeholder="Search by customer name or account number"
            />
          </label>

          <label className={styles.label}>
            <span>Reassign To</span>
            <select
              className={styles.input}
              value={targetTsoId}
              onChange={(e) => {
                setTargetTsoId(e.target.value);
                setError('');
              }}
            >
              <option value="">Select TSO</option>
              {tsos.map((tso) => (
                <option key={tso.tsoId} value={tso.tsoId}>
                  {tso.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {search.trim() && (
          <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
            {filteredMembers.length === 0 ? (
              <p className={styles.sectionSub} style={{ margin: 0 }}>No thrift saver matched that search.</p>
            ) : (
              filteredMembers.map((member) => (
                <button
                  key={member.memberId}
                  type="button"
                  className={styles.btnSmall}
                  style={{
                    justifyContent: 'flex-start',
                    display: 'flex',
                    padding: '10px 12px',
                    background: selectedMemberId === member.memberId ? '#dbeafe' : undefined,
                    color: selectedMemberId === member.memberId ? '#1d4ed8' : undefined,
                    border: selectedMemberId === member.memberId ? '1px solid #93c5fd' : undefined,
                  }}
                  onClick={() => setSelectedMemberId(member.memberId)}
                >
                  {member.name} ({member.accountNumber}){member.tsoName ? ` - ${member.tsoName}` : ''}
                </button>
              ))
            )}
          </div>
        )}

        {selectedMember && (
          <div className={styles.card} style={{ marginBottom: 16, padding: 16 }}>
            <p className={styles.sectionTitle}>{selectedMember.name}</p>
            <p className={styles.sectionSub}>
              Account: {selectedMember.accountNumber} · Current TSO: {selectedMember.tsoName ?? '—'}
            </p>
            {targetTsoId && (
              <p className={styles.sectionSub} style={{ marginTop: 6 }}>
                New TSO: {tsos.find((item) => item.tsoId === targetTsoId)?.name ?? '—'}
              </p>
            )}
          </div>
        )}

        <button
          className={styles.btnPrimary}
          type="button"
          onClick={handleReassign}
          disabled={savingReassignment}
        >
          {savingReassignment ? 'Reassigning…' : 'Reassign Thrift Saver'}
        </button>
      </div>

      <div className={styles.card}>
        <p className={styles.sectionTitle}>Thrift Saver Directory</p>
        <p className={styles.sectionSub} style={{ marginBottom: 16 }}>
          Filter and search all thrift savers by name, account number, KYC state, or assigned TSO.
        </p>

        <div className={styles.formGrid}>
          <label className={styles.label}>
            <span>Search</span>
            <input
              className={styles.input}
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Name, account number or member ID"
            />
          </label>

          <label className={styles.label}>
            <span>KYC Status</span>
            <select
              className={styles.input}
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value as 'all' | 'pending' | 'verified' | 'rejected')}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>

          <label className={styles.label}>
            <span>Assigned TSO</span>
            <select
              className={styles.input}
              value={tsoFilter}
              onChange={(e) => setTsoFilter(e.target.value)}
            >
              <option value="all">All TSOs</option>
              {availableTsoNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>

          <label className={styles.label}>
            <span>Branch</span>
            <select
              className={styles.input}
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="all">All Branches</option>
              {availableBranches.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="spinner" aria-label="Loading" />
      ) : (
        <Table
          rows={tableRows}
          keyFn={(r) => r.memberId}
          emptyMessage="No thrift savers."
          columns={[
            {
              header: 'Account No.',
              render: (r) => (
                <span className={styles.row}>
                  <span>{r.accountNumber}</span>
                  <button
                    type="button"
                    className={styles.btnSmall}
                    onClick={() => handleCopyAccount(r.accountNumber, r.memberId)}
                    title="Copy account number"
                    aria-label="Copy account number"
                  >
                    {copiedMemberId === r.memberId ? 'Copied' : '⧉'}
                  </button>
                </span>
              ),
            },
            { header: 'Name', render: (r) => r.name },
            {
              header: 'Balance (₦)',
              render: (r) => Number(r.savingsBalance ?? 0).toLocaleString(),
            },
            {
              header: 'TSO',
              render: (r) => r.tsoName ?? '—',
            },
            { header: 'KYC', render: (r) => <Badge value={r.kycStatus} /> },
          ]}
        />
      )}
    </div>
  );
}
