import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#166534',
  primaryLight: '#dcfce7',
  danger: '#991b1b',
  dangerLight: '#fee2e2',
  warning: '#854d0e',
  warningLight: '#fef9c3',
  text: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  bg: '#f0fdf4',
  white: '#ffffff',
};

export const shared = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: colors.white,
    marginBottom: 12,
    color: colors.text,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center' as const,
    marginTop: 4,
  },
  btnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  error: {
    backgroundColor: colors.dangerLight,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    color: colors.danger,
    fontSize: 13,
  },
  success: {
    backgroundColor: colors.primaryLight,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    color: colors.primary,
    fontSize: 13,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  muted: {
    fontSize: 12,
    color: colors.muted,
  },
});
