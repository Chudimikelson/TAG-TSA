import { FormEvent, useEffect, useState } from 'react';
import { Badge } from '../components/Badge.js';
import { Table } from '../components/Table.js';
import { createTso, getTsos, TsoItem } from '../api/tsos.js';
import styles from './Page.module.css';

export function TsosPage() {
  const [rows, setRows] = useState<TsoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [deviceId, setDeviceId] = useState('web');
  const [assignedAreas, setAssignedAreas] = useState('');
  const [creating, setCreating] = useState(false);

  async function loadTsos() {
    setLoading(true);
    setError('');
    try {
      const res = await getTsos();
      setRows(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch TSOs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTsos();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreating(true);

    try {
      const areas = assignedAreas
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await createTso({ name, phone, password, deviceId, assignedAreas: areas });

      setSuccess('TSO added successfully.');
      setName('');
      setPhone('');
      setPassword('');
      setDeviceId('web');
      setAssignedAreas('');

      await loadTsos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add TSO');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h1 className={styles.heading}>TSOs</h1>

      <div className={styles.card}>
        <h2 style={{ fontSize: '1.05rem', marginBottom: 16 }}>Add TSO</h2>

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}

        <form onSubmit={onSubmit}>
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
              Device ID
              <input
                className={styles.input}
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="web"
                required
              />
            </label>

            <label className={styles.label} style={{ gridColumn: '1 / -1' }}>
              Assigned areas (comma-separated)
              <input
                className={styles.input}
                value={assignedAreas}
                onChange={(e) => setAssignedAreas(e.target.value)}
                placeholder="Ikeja, Yaba, Surulere"
              />
            </label>
          </div>

          <button className={styles.btnPrimary} type="submit" disabled={creating}>
            {creating ? 'Adding...' : 'Add TSO'}
          </button>
        </form>
      </div>

      <Table
        rows={rows}
        keyFn={(r) => r.tsoId}
        emptyMessage={loading ? 'Loading TSOs...' : 'No TSOs yet.'}
        columns={[
          { header: 'Name', render: (r) => r.name },
          { header: 'Phone', render: (r) => r.phone },
          { header: 'Device', render: (r) => r.deviceId },
          {
            header: 'Areas',
            render: (r) => (r.assignedAreas.length ? r.assignedAreas.join(', ') : '—'),
          },
          { header: 'Status', render: (r) => <Badge value={r.status} /> },
          {
            header: 'Created',
            render: (r) => new Date(r.createdAt).toLocaleDateString('en-NG'),
          },
        ]}
      />
    </div>
  );
}
