import { FormEvent, useEffect, useState } from 'react';
import { Badge } from '../components/Badge.js';
import { Table } from '../components/Table.js';
import { createAdmin, listAdmins, updateAdmin } from '../api/admin.js';
import { createTso, getTsos, updateTso } from '../api/tsos.js';
import styles from './Page.module.css';

const USER_ROLES = ['TSO', 'SuperAdmin', 'CSM', 'HOP', 'TeamLead', 'Fincon'];
const ADMIN_ROLES = ['SuperAdmin', 'CSM', 'HOP', 'TeamLead', 'Fincon'];
const ADMIN_STATUSES = ['active', 'suspended'];

interface UserRow {
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'active' | 'suspended';
  createdAt: string;
  source: 'admin' | 'tso';
}

export function UserManagementPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states for creating new admin
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('TSO');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingEmail, setEditingEmail] = useState('');
  const [editingPhone, setEditingPhone] = useState('');
  const [editingPassword, setEditingPassword] = useState('');
  const [editingRole, setEditingRole] = useState('');
  const [editingStatus, setEditingStatus] = useState<'active' | 'suspended'>('active');
  const [savingEdit, setSavingEdit] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const [admins, tsosResponse] = await Promise.all([listAdmins(), getTsos()]);

      const adminRows: UserRow[] = admins.map((admin) => ({
        userId: admin.adminId,
        name: admin.name,
        email: admin.email,
        phone: admin.phone ?? '',
        role: admin.role,
        status: (admin.status as 'active' | 'suspended') ?? 'active',
        createdAt: String(admin.createdAt),
        source: 'admin',
      }));

      const tsoRows: UserRow[] = tsosResponse.data.map((tso) => ({
        userId: tso.tsoId,
        name: tso.name,
        email: tso.email ?? '',
        phone: tso.phone,
        role: 'TSO',
        status: tso.status,
        createdAt: tso.createdAt,
        source: 'tso',
      }));

      setRows([...adminRows, ...tsoRows]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function onCreateAdmin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreating(true);

    try {
      if (role === 'TSO') {
        await createTso({
          name,
          email,
          phone,
          password,
          deviceId: 'web',
          assignedAreas: [],
        });
      } else {
        await createAdmin({ name, email, phone, password, role });
      }

      setSuccess('User created successfully.');
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setRole('TSO');

      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  async function onSaveEdit(user: UserRow) {
    setError('');
    setSuccess('');

    const normalizedName = editingName.trim();
    const normalizedEmail = editingEmail.trim().toLowerCase();
    const normalizedPhone = editingPhone.trim();
    const normalizedPassword = editingPassword.trim();

    if (normalizedPassword && normalizedPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (user.source === 'admin' && !normalizedEmail) {
      setError('Email is required for admin users.');
      return;
    }

    if (user.source === 'admin' && !normalizedPhone) {
      setError('Phone number is required for admin users.');
      return;
    }

    setSavingEdit(true);

    try {
      const updates: Promise<unknown>[] = [];

      if (user.source === 'admin') {
        const payload: {
          name?: string;
          email?: string;
          phone?: string;
          password?: string;
          role?: string;
          status?: 'active' | 'suspended';
        } = {};

        if (normalizedName !== user.name) payload.name = normalizedName;
        if (normalizedEmail !== user.email.toLowerCase()) {
          payload.email = normalizedEmail;
        }
        if (normalizedPhone !== user.phone) payload.phone = normalizedPhone;
        if (normalizedPassword) payload.password = normalizedPassword;
        if (editingRole !== user.role) payload.role = editingRole;
        if (editingStatus !== user.status) payload.status = editingStatus;

        if (Object.keys(payload).length > 0) {
          updates.push(updateAdmin(user.userId, payload));
        }
      } else {
        const payload: {
          name?: string;
          email?: string;
          phone?: string;
          password?: string;
          status?: 'active' | 'suspended';
        } = {};

        if (normalizedName !== user.name) payload.name = normalizedName;
        if (normalizedEmail && normalizedEmail !== user.email.toLowerCase()) {
          payload.email = normalizedEmail;
        }
        if (normalizedPhone !== user.phone) payload.phone = normalizedPhone;
        if (normalizedPassword) payload.password = normalizedPassword;
        if (editingStatus !== user.status) payload.status = editingStatus;

        if (Object.keys(payload).length > 0) {
          updates.push(updateTso(user.userId, payload));
        }
      }

      if (updates.length > 0) {
        await Promise.all(updates);
        setSuccess('User updated successfully.');
      }

      setEditingId(null);
      setEditingPassword('');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSavingEdit(false);
    }
  }

  function beginEdit(user: UserRow) {
    setEditingId(user.userId);
    setEditingName(user.name);
    setEditingEmail(user.email);
    setEditingPhone(user.phone);
    setEditingPassword('');
    setEditingRole(user.role);
    setEditingStatus(user.status);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingPassword('');
  }

  const filteredRows = rows.filter((row) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const haystack = `${row.name} ${row.email} ${row.phone} ${row.role}`.toLowerCase();
    return haystack.includes(q);
  });

  const editingUser = rows.find((row) => row.userId === editingId) ?? null;

  return (
    <div>
      <h1 className={styles.heading}>User Management</h1>

      <div className={styles.card}>
        <h2 style={{ fontSize: '1.05rem', marginBottom: 16 }}>Onboard User</h2>

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}

        <form onSubmit={onCreateAdmin}>
          <div className={styles.formGrid}>
            <label className={styles.label}>
              Name
              <input
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>

            <label className={styles.label}>
              Email
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className={styles.label}>
              Phone
              <input
                className={styles.input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234..."
                required
              />
            </label>

            <label className={styles.label}>
              Password
              <input
                className={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>

            <label className={styles.label}>
              Role
              <select
                className={styles.input}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                {USER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

          </div>

          <button className={styles.btnPrimary} type="submit" disabled={creating}>
            {creating ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </div>

      <div className={styles.card}>
        <div className={styles.row} style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 className={styles.sectionTitle}>Users</h2>
            <p className={styles.sectionSub}>
              {filteredRows.length} result{filteredRows.length === 1 ? '' : 's'}
            </p>
          </div>
          <input
            className={styles.input}
            style={{ maxWidth: 320, width: '100%' }}
            placeholder="Search name, email, phone, role"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {editingUser && (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Edit User</h2>
          <p className={styles.sectionSub}>
            Updating {editingUser.source === 'admin' ? 'admin' : 'TSO'} account details for {editingUser.name}
          </p>

          <div className={styles.formGrid}>
            <label className={styles.label}>
              Name
              <input
                className={styles.input}
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
              />
            </label>

            <label className={styles.label}>
              Email
              <input
                className={styles.input}
                type="email"
                value={editingEmail}
                onChange={(e) => setEditingEmail(e.target.value)}
              />
            </label>

            <label className={styles.label}>
              Phone
              <input
                className={styles.input}
                value={editingPhone}
                onChange={(e) => setEditingPhone(e.target.value)}
                placeholder="+234..."
              />
            </label>

            <label className={styles.label}>
              Password
              <input
                className={styles.input}
                type="password"
                value={editingPassword}
                minLength={8}
                onChange={(e) => setEditingPassword(e.target.value)}
                placeholder="Leave blank to keep current"
              />
            </label>

            <label className={styles.label}>
              Role
              <select
                className={styles.input}
                value={editingRole}
                onChange={(e) => setEditingRole(e.target.value)}
                disabled={editingUser.source === 'tso'}
              >
                {(editingUser.source === 'admin' ? ADMIN_ROLES : ['TSO']).map((itemRole) => (
                  <option key={itemRole} value={itemRole}>
                    {itemRole}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Status
              <select
                className={styles.input}
                value={editingStatus}
                onChange={(e) => setEditingStatus(e.target.value as 'active' | 'suspended')}
              >
                {ADMIN_STATUSES.map((itemStatus) => (
                  <option key={itemStatus} value={itemStatus}>
                    {itemStatus}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.row} style={{ gap: 10 }}>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => onSaveEdit(editingUser)}
              disabled={savingEdit}
            >
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className={styles.btnSmall} onClick={cancelEdit} disabled={savingEdit}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <Table
        rows={filteredRows}
        keyFn={(r) => r.userId}
        emptyMessage={loading ? 'Loading users...' : 'No users yet.'}
        columns={[
          { header: 'Name', render: (r) => r.name },
          { header: 'Email', render: (r) => r.email || '—' },
          { header: 'Phone', render: (r) => r.phone || '—' },
          {
            header: 'Role',
            render: (r) => r.role,
          },
          {
            header: 'Status',
            render: (r) => <Badge value={r.status} />,
          },
          {
            header: 'Action',
            render: (r) => (
              <button
                type="button"
                className={styles.btnSmall}
                onClick={() => beginEdit(r)}
              >
                {editingId === r.userId ? 'Editing...' : 'Edit User'}
              </button>
            ),
          },
          {
            header: 'Created',
            render: (r) => new Date(r.createdAt).toLocaleDateString('en-NG'),
          },
        ]}
      />
    </div>
  );
}
