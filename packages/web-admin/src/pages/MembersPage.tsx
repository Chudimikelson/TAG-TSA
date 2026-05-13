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
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [targetTsoId, setTargetTsoId] = useState('');
  const [savingReassignment, setSavingReassignment] = useState(false);

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

    setSavingReassignment(true);
    setError('');
    setSuccess('');

    try {
      await updateMember(selectedMember.memberId, { createdByTsoId: targetTsoId });
      await loadMembers();
      const assignedTso = tsos.find((item) => item.tsoId === targetTsoId);
      setSuccess(`${selectedMember.name} was reassigned to ${assignedTso?.name ?? 'the selected TSO'}.`);
      setSearch('');
      setSelectedMemberId('');
      setTargetTsoId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reassign thrift saver');
    } finally {
      setSavingReassignment(false);
    }
  }

  return (
    <div>
      <h1 className={styles.heading}>Thrift Savers</h1>
      {success && <p className={styles.success}>{success}</p>}
      {error && <p className={styles.error}>{error}</p>}

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
              }}
              placeholder="Search by customer name or account number"
            />
          </label>

          <label className={styles.label}>
            <span>Reassign To</span>
            <select
              className={styles.input}
              value={targetTsoId}
              onChange={(e) => setTargetTsoId(e.target.value)}
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
                  style={{ justifyContent: 'flex-start', display: 'flex', padding: '10px 12px' }}
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
