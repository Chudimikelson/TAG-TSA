import mongoose from 'mongoose';
import 'dotenv/config';

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('Missing MONGODB_URI environment variable.');
  }

  await mongoose.connect(mongoUri);

  const { WithdrawalRequestModel } = await import('../src/models/WithdrawalRequest.js');

  const now = new Date();
  const result = await WithdrawalRequestModel.updateMany(
    { status: 'pending' },
    {
      $set: {
        status: 'approved',
        approvedBy: 'system-migration',
        approvedAt: now,
      },
    },
  );

  console.log(`Pending withdrawals migrated to approved: ${result.modifiedCount}`);
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
