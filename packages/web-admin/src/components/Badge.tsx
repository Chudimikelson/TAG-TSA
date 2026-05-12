import styles from './Badge.module.css';

type Variant = 'green' | 'red' | 'yellow' | 'blue' | 'gray';

const STATUS_VARIANTS: Record<string, Variant> = {
  active: 'green',
  approved: 'green',
  confirmed: 'green',
  matched: 'green',
  reconciled: 'green',
  pending: 'yellow',
  unmatched: 'yellow',
  paused: 'yellow',
  rejected: 'red',
  flagged: 'red',
  suspended: 'red',
  disbursed: 'blue',
  closed: 'gray',
};

export function Badge({ value }: { value: string }) {
  const variant: Variant = STATUS_VARIANTS[value] ?? 'gray';
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>{value}</span>
  );
}
