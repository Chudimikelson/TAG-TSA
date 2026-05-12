/**
 * One-time seed script: creates the initial admin user.
 * Usage: npm run seed:admin
 */
import crypto from 'crypto';
import mongoose from 'mongoose';
import 'dotenv/config';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'osellezino@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'blackgene';
const ADMIN_NAME = process.env.ADMIN_NAME ?? 'Oselle';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 310_000, 32, 'sha256')
    .toString('hex');
  return `${salt}:${hash}`;
}

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set in .env');
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // Import model after connect so mongoose is ready
  const { AdminModel } = await import('../src/models/Admin.js');

  const existing = await AdminModel.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    console.log(`Admin already exists: ${ADMIN_EMAIL}`);
    await mongoose.disconnect();
    return;
  }

  const adminId = `admin_${crypto.randomBytes(8).toString('hex')}`;
  await AdminModel.create({
    adminId,
    name: ADMIN_NAME,
    email: ADMIN_EMAIL.toLowerCase(),
    passwordHash: hashPassword(ADMIN_PASSWORD),
    role: 'SuperAdmin',
    status: 'active',
  });

  console.log(`Admin created: ${ADMIN_EMAIL} (adminId: ${adminId}, role: SuperAdmin)`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
