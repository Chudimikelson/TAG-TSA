import type { Member, SavingsPlan } from '@tagora/shared';

export type AuthStackParamList = {
  Login: undefined;
  VerifyOtp: { phone: string };
};

export type AppStackParamList = {
  Assignments: undefined;
  ThriftSaverDetails: { memberId: string; member?: Member; plan?: SavingsPlan };
  RecordCollection: { member: Member; plan?: SavingsPlan };
  CollectionsHistory: undefined;
  Withdrawals: undefined;
  NewWithdrawal: undefined;
};
