// User roles in the system
export type UserRole = 'tso' | 'admin' | 'customer';

// Admin-specific roles
export type AdminRole = 'SuperAdmin' | 'CSM' | 'HOP' | 'TeamLead' | 'Fincon';

// KYC status for members
export type KycStatus = 'pending' | 'verified' | 'rejected';

// Member account
export interface Member {
  memberId: string;
  accountNumber: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  branch?: string;
  nationalIdRef?: string;
  kycStatus: KycStatus;
  savingsBalance?: number;
  tsoName?: string;
  createdAt: Date;
}

// Savings plan frequency
export type PlanFrequency = 'daily' | 'weekly' | 'monthly';

// Savings plan status
export type PlanStatus = 'active' | 'paused' | 'closed';

// Savings plan linked to a member
export interface SavingsPlan {
  planId: string;
  memberId: string;
  name: string;
  amount: number;
  frequency: PlanFrequency;
  startDate: Date;
  nextScheduledDate: Date;
  status: PlanStatus;
}

// TSO agent status
export type TsoStatus = 'active' | 'suspended';

// TSO field agent
export interface Tso {
  tsoId: string;
  name: string;
  phone: string;
  deviceId: string;
  assignedAreas: string[];
  status: TsoStatus;
  createdAt: Date;
}

// Collection method
export type CollectionMethod = 'cash' | 'tsa' | 'tagora_pool';

// Collection record status
export type CollectionStatus = 'pending' | 'confirmed' | 'rejected' | 'matched' | 'flagged' | 'reconciled';

// Individual savings collection by a TSO
export interface Collection {
  collectionId: string;
  planId: string;
  memberId: string;
  tsoId: string;
  amount: number;
  method: CollectionMethod;
  timestamp: Date;
  photoReceiptUrl?: string;
  geo?: { lat: number; lng: number };
  matchedTransactionId?: string;
  status: CollectionStatus;
  idempotencyKey: string;
}

// Incoming payment transaction from bank/USSD
export type TransactionMethod = 'transfer' | 'ussd';
export type TransactionStatus = 'unmatched' | 'matched' | 'flagged';

export interface Transaction {
  transactionId: string;
  externalRef: string;
  memberId?: string;
  amount: number;
  method: TransactionMethod;
  timestamp: Date;
  status: TransactionStatus;
}

// Withdrawal request
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'disbursed';
export type DisbursementMethod = 'bank_transfer' | 'cash' | 'mobile_money';

export interface WithdrawalRequest {
  withdrawalId: string;
  requesterTsoId: string;
  memberId: string;
  planId: string;
  amount: number;
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  status: WithdrawalStatus;
  disbursementMethod: DisbursementMethod;
}

// Daily reconciliation record
export interface ReconciliationRecord {
  reconId: string;
  date: Date;
  expectedTotal: number;
  cashCounted: number;
  transfersTotal: number;
  variance: number;
  resolvedBy?: string;
  notes?: string;
}

// Audit log entry
export interface AuditLog {
  logId: string;
  actorId: string;
  action: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

// Standardised API response envelope
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Paginated list wrapper
export interface PaginatedList<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
