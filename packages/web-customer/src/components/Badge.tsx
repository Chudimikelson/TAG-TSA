import styles from './Badge.module.css';

type Color = 'green' | 'red' | 'yellow' | 'gray';

const STATUS_COLOR: Record<string, Color> = {
  active: 'green',
  completed: 'gray',
  approved: 'green',
  rejected: 'red',
  pending: 'yellow',
  suspended: 'red',
};

interface Props {
  status: string;
}

export function Badge({ status }: Props) {
  const color: Color = STATUS_COLOR[status] ?? 'gray';
  return <span className={`${styles.badge} ${styles[color]}`}>{status}</span>;
}
