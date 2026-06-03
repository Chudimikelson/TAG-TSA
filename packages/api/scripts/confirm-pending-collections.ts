import mongoose from 'mongoose';
import 'dotenv/config';

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('Missing MONGODB_URI environment variable.');
  }

  await mongoose.connect(mongoUri);

  const { CollectionModel } = await import('../src/models/Collection.js');
  const { MemberModel } = await import('../src/models/Member.js');

  const pendingCollections = await CollectionModel.find({ status: 'pending' }).lean();
  if (pendingCollections.length === 0) {
    console.log('No pending collections found. Nothing to migrate.');
    await mongoose.disconnect();
    return;
  }

  const amountByMember = new Map<string, number>();
  for (const record of pendingCollections) {
    const prev = amountByMember.get(record.memberId) ?? 0;
    amountByMember.set(record.memberId, prev + (Number(record.amount) || 0));
  }

  let memberUpdates = 0;
  for (const [memberId, amount] of amountByMember.entries()) {
    const result = await MemberModel.updateOne(
      { memberId },
      { $inc: { savingsBalance: amount } },
    );
    memberUpdates += result.modifiedCount;
  }

  const collectionUpdate = await CollectionModel.updateMany(
    { status: 'pending' },
    { $set: { status: 'confirmed' } },
  );

  console.log(`Pending collections migrated: ${collectionUpdate.modifiedCount}`);
  console.log(`Members with balance updates: ${memberUpdates}`);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
