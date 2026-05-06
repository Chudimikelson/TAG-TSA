import { ReactNode } from 'react';
import styles from './Table.module.css';

interface Props {
  headers: string[];
  children: ReactNode;
}

export function Table({ headers, children }: Props) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}
