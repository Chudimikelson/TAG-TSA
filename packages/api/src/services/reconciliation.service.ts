import { randomUUID } from 'crypto';
import { AppError } from '../middleware/errorHandler.js';
import { AuditLogModel } from '../models/AuditLog.js';
import { CollectionModel } from '../models/Collection.js';
import { ReconciliationRecordModel } from '../models/ReconciliationRecord.js';
import { TransactionModel } from '../models/Transaction.js';
import { CreateReconciliationInput, ManualMatchInput } from '../validators/reconciliation.validators.js';

export async function createReconciliation(
  input: CreateReconciliationInput,
  adminId: string,
) {
  const variance =
    input.cashCounted + input.transfersTotal - input.expectedTotal;

  const record = await ReconciliationRecordModel.create({
    reconId: randomUUID(),
    date: new Date(input.date),
    expectedTotal: input.expectedTotal,
    cashCounted: input.cashCounted,
    transfersTotal: input.transfersTotal,
    variance,
    resolvedBy: adminId,
    notes: input.notes,
  });

  await AuditLogModel.create({
    action: 'reconciliation_created',
    performedBy: adminId,
    targetId: record.reconId,
    targetType: 'ReconciliationRecord',
    meta: { variance },
  });

  return record;
}

export async function getUnmatchedTransactions() {
  return TransactionModel.find({ status: 'unmatched' }).sort({ timestamp: -1 });
}

export async function manuallyMatchTransaction(
  transactionId: string,
  input: ManualMatchInput,
  adminId: string,
) {
  const transaction = await TransactionModel.findOne({ transactionId });
  if (!transaction) throw new AppError(404, 'Transaction not found');
  if (transaction.status !== 'unmatched') {
    throw new AppError(409, 'Transaction is already matched or flagged');
  }

  const collection = await CollectionModel.findOne({ collectionId: input.collectionId });
  if (!collection) throw new AppError(404, 'Collection not found');

  transaction.status = 'matched';
  transaction.memberId = collection.memberId;
  await transaction.save();

  collection.status = 'matched';
  collection.matchedTransactionId = transaction.transactionId;
  await collection.save();

  await AuditLogModel.create({
    action: 'manual_match',
    performedBy: adminId,
    targetId: transaction.transactionId,
    targetType: 'Transaction',
    meta: { collectionId: collection.collectionId },
  });

  return { transactionId: transaction.transactionId, collectionId: collection.collectionId };
}

export async function exportCollectionsCsv(): Promise<string> {
  const collections = await CollectionModel.find({}).sort({ timestamp: -1 }).lean();

  const header = 'collectionId,planId,memberId,tsoId,amount,method,status,timestamp\n';
  const rows = collections
    .map((c) =>
      [
        c.collectionId,
        c.planId,
        c.memberId,
        c.tsoId,
        c.amount,
        c.method,
        c.status,
        c.timestamp.toISOString(),
      ].join(','),
    )
    .join('\n');

  return header + rows;
}
