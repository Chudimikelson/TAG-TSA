import { ChangeEvent, useRef, useState } from 'react';
import {
  bulkUpdateDepositBalances,
  BalanceUpdateRow,
  BalanceUpdateResult,
  getMembers,
} from '../api/members.js';
import pageStyles from './Page.module.css';
import styles from './DepositBalancePage.module.css';

type ParseError = string;

interface ParsedRow {
  accountNumber: string;
  balance: number;
}

function parseCSV(text: string): { rows: ParsedRow[]; errors: ParseError[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { rows: [], errors: ['The CSV file is empty.'] };
  }

  // Detect header row (first line contains non-numeric second column)
  const firstCols = lines[0].split(',').map((c) => c.trim());
  const hasHeader =
    firstCols.length >= 2 && isNaN(Number(firstCols[1].replace(/[^0-9.]/g, '')));
  const dataLines = hasHeader ? lines.slice(1) : lines;

  if (dataLines.length === 0) {
    return { rows: [], errors: ['No data rows found after the header.'] };
  }

  const rows: ParsedRow[] = [];
  const errors: ParseError[] = [];

  dataLines.forEach((line, idx) => {
    const lineNum = hasHeader ? idx + 2 : idx + 1;
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));

    if (cols.length < 2) {
      errors.push(`Row ${lineNum}: expected 2 columns (accountNumber, balance), got ${cols.length}.`);
      return;
    }

    const accountNumber = cols[0];
    const balanceRaw = cols[1].replace(/[^0-9.]/g, '');
    const balance = parseFloat(balanceRaw);

    if (!accountNumber) {
      errors.push(`Row ${lineNum}: account number is blank.`);
      return;
    }

    if (isNaN(balance) || balance < 0) {
      errors.push(`Row ${lineNum}: "${cols[1]}" is not a valid non-negative number.`);
      return;
    }

    rows.push({ accountNumber, balance });
  });

  return { rows, errors };
}

type Phase = 'upload' | 'preview' | 'results';

export function DepositBalancePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('upload');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [lookingUpNames, setLookingUpNames] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [results, setResults] = useState<BalanceUpdateResult[]>([]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setParseErrors(['Please select a .csv file.']);
      setParsedRows([]);
      setFileName('');
      setPhase('upload');
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const { rows, errors } = parseCSV(text);
      setParsedRows(rows);
      setParseErrors(errors);
      setPhase('preview');

      if (rows.length > 0) {
        setLookingUpNames(true);
        try {
          const res = await getMembers();
          const map: Record<string, string> = {};
          for (const m of res.data) {
            map[m.accountNumber] = m.name;
          }
          setNameMap(map);
        } catch {
          // name lookup is best-effort; preview still works without it
        } finally {
          setLookingUpNames(false);
        }
      }
    };
    reader.readAsText(file);
  }

  function handleReset() {
    setParsedRows([]);
    setParseErrors([]);
    setNameMap({});
    setFileName('');
    setSubmitError('');
    setResults([]);
    setPhase('upload');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const updates: BalanceUpdateRow[] = parsedRows.map((r) => ({
        accountNumber: r.accountNumber,
        balance: r.balance,
      }));
      const res = await bulkUpdateDepositBalances(updates);
      setResults(res.data);
      setPhase('results');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const updatedCount = results.filter((r) => r.status === 'updated').length;
  const notFoundCount = results.filter((r) => r.status === 'not_found').length;
  const invalidCount = results.filter((r) => r.status === 'invalid').length;

  return (
    <div className={styles.page}>
      <h1 className={pageStyles.heading}>Deposit Balance Upload</h1>

      {/* Upload phase */}
      {phase === 'upload' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Upload CSV File</span>
          </div>
          <div className={styles.cardBody}>
            <p className={styles.hint}>
              Upload a CSV file to bulk-update customer deposit balances. The file must have two
              columns: <strong>accountNumber</strong> and <strong>balance</strong>.
            </p>
            <div className={styles.csvFormat}>
              <div className={styles.csvFormatTitle}>Expected format</div>
              <pre className={styles.csvExample}>{`accountNumber,balance\nACC-001,5000\nACC-002,12500.50`}</pre>
            </div>
            <label className={styles.dropzone}>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className={styles.fileInput}
                onChange={handleFileChange}
              />
              <span className={styles.dropzoneIcon}>📂</span>
              <span className={styles.dropzoneText}>Click to select a CSV file</span>
            </label>
            {parseErrors.length > 0 && (
              <div className={pageStyles.error}>
                {parseErrors.map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview phase */}
      {phase === 'preview' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Preview — {fileName}</span>
            <span className={styles.rowCount}>{parsedRows.length} row{parsedRows.length !== 1 ? 's' : ''}</span>
          </div>
          <div className={styles.cardBody}>
            {parseErrors.length > 0 && (
              <div className={pageStyles.error}>
                <strong>Parse warnings:</strong>
                {parseErrors.map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </div>
            )}
            {parsedRows.length === 0 ? (
              <p className={styles.hint}>No valid rows to import.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Account Number</th>
                      <th>Customer Name</th>
                      <th>New Balance (₦)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, i) => {
                      const name = nameMap[row.accountNumber];
                      return (
                        <tr key={i} className={!lookingUpNames && name === undefined ? styles.row_not_found : undefined}>
                          <td className={styles.tdMuted}>{i + 1}</td>
                          <td>{row.accountNumber}</td>
                          <td>
                            {lookingUpNames ? (
                              <span className={styles.tdMuted}>Looking up…</span>
                            ) : name !== undefined ? (
                              name
                            ) : (
                              <span className={styles.pillNotFound}>Not found</span>
                            )}
                          </td>
                          <td className={styles.tdAmount}>
                            {row.balance.toLocaleString('en-NG', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {submitError && <div className={pageStyles.error}>{submitError}</div>}

            <div className={styles.actions}>
              <button className={pageStyles.btnDanger} onClick={handleReset} disabled={submitting}>
                Cancel
              </button>
              <button
                className={pageStyles.btnPrimary}
                onClick={handleSubmit}
                disabled={submitting || parsedRows.length === 0}
              >
                {submitting ? 'Updating…' : `Update ${parsedRows.length} Balance${parsedRows.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results phase */}
      {phase === 'results' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Update Results</span>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.summaryRow}>
              <div className={`${styles.summaryChip} ${styles.chipSuccess}`}>
                ✓ {updatedCount} Updated
              </div>
              {notFoundCount > 0 && (
                <div className={`${styles.summaryChip} ${styles.chipWarn}`}>
                  ⚠ {notFoundCount} Not Found
                </div>
              )}
              {invalidCount > 0 && (
                <div className={`${styles.summaryChip} ${styles.chipError}`}>
                  ✕ {invalidCount} Invalid
                </div>
              )}
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Account Number</th>
                    <th>Name</th>
                    <th>Previous Balance (₦)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className={styles[`row_${r.status}`]}>
                      <td>{r.accountNumber}</td>
                      <td>{r.name ?? '—'}</td>
                      <td className={styles.tdAmount}>
                        {r.previousBalance !== undefined
                          ? r.previousBalance.toLocaleString('en-NG', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : '—'}
                      </td>
                      <td>
                        <span className={`${styles.statusPill} ${styles[`pill_${r.status}`]}`}>
                          {r.status === 'updated'
                            ? 'Updated'
                            : r.status === 'not_found'
                            ? 'Not Found'
                            : 'Invalid'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.actions}>
              <button className={pageStyles.btnPrimary} onClick={handleReset}>
                Upload Another File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
