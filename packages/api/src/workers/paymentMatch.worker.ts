import { Worker, Job } from 'bullmq';
import { getRedisClient } from '../lib/redis.js';
import { PAYMENT_MATCH_QUEUE, PaymentMatchJobData } from '../queues/paymentMatch.queue.js';
import { TransactionModel } from '../models/Transaction.js';
import { CollectionModel } from '../models/Collection.js';
import { audit } from '../services/audit.service.js';
import { logger } from '../lib/logger.js';

/**
 * Auto-match strategy:
 * 1. If the payload includes a phone, resolve it to a memberId.
 * 2. Find the most recent pending collection for that member with the same amount.
 * 3. Match if found; flag the transaction as unmatched if not.
 *
 * Target match rate: >= 90% (per project brief).
 */
async function processMatchJob(job: Job<PaymentMatchJobData>): Promise<void> {
  const { transactionId, amount, phone } = job.data;

  logger.info(`Processing match job for transactionId=${transactionId}`);

  const transaction = await TransactionModel.findOne({ transactionId });
  if (!transaction) {
    logger.warn(`Transaction not found for matchJob: ${transactionId}`);
    return;
  }

  // Attempt to find a member via phone if provided
  let memberId: string | undefined;
  if (phone) {
    // Lazy import to avoid circular deps — Member model resolved at runtime
    const { MemberModel } = await import('../models/Member.js');
    const member = await MemberModel.findOne({ phone });
    if (member) {
      memberId = member.memberId;
    }
  }

  if (!memberId) {
    // Cannot resolve to a member — flag for manual review
    transaction.status = 'flagged';
    await transaction.save();
    logger.warn(`Transaction flagged (no member match): transactionId=${transactionId}`);
    await audit({
      actorId: 'system',
      action: 'transaction.flagged',
      targetId: transactionId,
      metadata: { reason: 'no_member_resolved' },
    });
    return;
  }

  // Find best-match pending collection: same member, same amount, not yet matched
  const collection = await CollectionModel.findOne({
    memberId,
    amount,
    method: 'transfer',
    status: 'pending',
  }).sort({ timestamp: -1 });

  if (!collection) {
    transaction.status = 'flagged';
    transaction.memberId = memberId;
    await transaction.save();
    logger.warn(`Transaction flagged (no matching collection): transactionId=${transactionId}`);
    await audit({
      actorId: 'system',
      action: 'transaction.flagged',
      targetId: transactionId,
      metadata: { reason: 'no_collection_match', memberId },
    });
    return;
  }

  // Perform the match
  transaction.status = 'matched';
  transaction.memberId = memberId;
  await transaction.save();

  collection.status = 'matched';
  collection.matchedTransactionId = transactionId;
  await collection.save();

  logger.info(
    `Matched transactionId=${transactionId} → collectionId=${collection.collectionId}`,
  );

  await audit({
    actorId: 'system',
    action: 'transaction.matched',
    targetId: transactionId,
    metadata: { collectionId: collection.collectionId, memberId },
  });
}

/**
 * Starts the payment-match worker.
 * Call this once at server startup (after DB and Redis are ready).
 */
export function startPaymentMatchWorker(): Worker<PaymentMatchJobData> {
  const worker = new Worker<PaymentMatchJobData>(PAYMENT_MATCH_QUEUE, processMatchJob, {
    connection: getRedisClient(),
    concurrency: 5,
  });

  worker.on('completed', (job) => {
    logger.info(`Match job completed: jobId=${job.id}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Match job failed: jobId=${job?.id}`, err);
  });

  return worker;
}
