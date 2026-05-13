import mongoose from 'mongoose';
import 'dotenv/config';

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('Missing MONGODB_URI environment variable.');
  }

  await mongoose.connect(mongoUri);
  const { MemberModel } = await import('../src/models/Member.js');

  const result = await MemberModel.updateMany(
    { nationalIdRef: { $regex: /^LEGACY-/i } },
    { $unset: { nationalIdRef: '' } },
  );

  console.log(`Legacy national ID values removed: ${result.modifiedCount}`);
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
