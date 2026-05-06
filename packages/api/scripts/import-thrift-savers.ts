import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config';

type CsvRow = Record<string, string | undefined>;

type NormalizedRow = {
  rowNumber: number;
  accountNumber: string;
  accountName: string;
  accountBalance: number;
  phone?: string;
  tsoName: string;
  branch: string;
  dateCreated: Date;
};

type ImportOptions = {
  filePath: string;
  commit: boolean;
};

function getArgValue(args: string[], key: string): string | undefined {
  const idx = args.indexOf(key);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function parseOptions(argv: string[]): ImportOptions {
  const filePath = getArgValue(argv, '--file');
  if (!filePath) {
    throw new Error('Missing required argument: --file <path-to-csv>');
  }

  return {
    filePath: path.resolve(filePath),
    commit: argv.includes('--commit'),
  };
}

function pick(row: CsvRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string') return value;
  }
  return '';
}

function normalizePhone(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const compact = trimmed.replace(/[\s()-]/g, '');
  if (compact === '234' || compact === '+234') return undefined;
  if (!/^\+?[1-9]\d{7,14}$/.test(compact)) {
    throw new Error('invalid phone format');
  }
  return compact;
}

function parseBalance(raw: string): number {
  const value = raw.trim().replace(/,/g, '');
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('invalid account balance');
  }
  return parsed;
}

function parseDate(raw: string): Date {
  const date = new Date(raw.trim());
  if (Number.isNaN(date.getTime())) {
    throw new Error('invalid date created');
  }
  return date;
}

function ensureString(raw: string, label: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }
  return trimmed;
}

function ensurePhoneIndexMessage(indexes: Array<{ name: string; key: Record<string, 1 | -1> }>): string {
  const phoneIndex = indexes.find((idx) => idx.key.phone === 1);
  if (!phoneIndex) {
    return 'No phone index found. Optional phone records are supported by schema.';
  }
  return `Phone index detected: ${phoneIndex.name}`;
}

async function ensureOptionalPhoneIndex(
  indexes: Array<{ name: string; key: Record<string, 1 | -1>; unique?: boolean; sparse?: boolean }>,
  commit: boolean,
): Promise<string> {
  const { MemberModel } = await import('../src/models/Member.js');
  const phoneIndex = indexes.find((idx) => idx.key.phone === 1);
  if (!phoneIndex) {
    if (commit) {
      await MemberModel.collection.createIndex(
        { phone: 1 },
        { unique: true, sparse: true, name: 'phone_1' },
      );
      return 'Created sparse unique phone index.';
    }
    return 'No phone index found; will create sparse unique phone index on commit.';
  }

  if (phoneIndex.unique && phoneIndex.sparse) {
    return `Phone index '${phoneIndex.name}' is already sparse+unique.`;
  }

  if (!commit) {
    return `Phone index '${phoneIndex.name}' is not sparse+unique and will be migrated on commit.`;
  }

  await MemberModel.collection.dropIndex(phoneIndex.name);
  await MemberModel.collection.createIndex(
    { phone: 1 },
    { unique: true, sparse: true, name: 'phone_1' },
  );
  return `Migrated phone index '${phoneIndex.name}' to sparse+unique.`;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const fileContent = fs.readFileSync(options.filePath, 'utf8');

  const csvRows = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as CsvRow[];

  if (csvRows.length === 0) {
    throw new Error('CSV is empty');
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  await mongoose.connect(uri);

  const { MemberModel } = await import('../src/models/Member.js');
  const { TsoModel } = await import('../src/models/Tso.js');

  const tsos = await TsoModel.find({}).select('tsoId name').lean();
  const tsoByName = new Map(tsos.map((t) => [t.name.trim().toLowerCase(), t.tsoId]));

  const normalized: NormalizedRow[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenAccounts = new Set<string>();
  const seenPhones = new Map<string, number>();

  csvRows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    try {
      const accountNumber = ensureString(
        pick(row, ['accountNumber', 'account number', 'Account Number']),
        'account number',
      );
      const accountName = ensureString(
        pick(row, ['accountName', 'account name', 'Account Name']),
        'account name',
      );
      const accountBalance = parseBalance(
        pick(row, ['accountBalance', 'account balance', 'Account Balance']),
      );
      let phone = normalizePhone(
        pick(row, ['phoneNumber', 'phone number', 'Phone Number', 'phone']),
      );
      const tsoName = ensureString(pick(row, ['TSO', 'tso', 'tsoName', 'tso name']), 'TSO');
      const branch = ensureString(pick(row, ['branch', 'Branch']), 'branch');
      const dateCreated = parseDate(
        pick(row, ['dateCreated', 'date created', 'Date Created', 'createdAt']),
      );

      if (/[eE]\+/.test(accountNumber)) {
        throw new Error('account number looks like scientific notation; export as text to preserve leading zeroes');
      }

      if (seenAccounts.has(accountNumber)) {
        throw new Error('duplicate account number inside CSV');
      }
      seenAccounts.add(accountNumber);

      if (phone) {
        const firstSeenAt = seenPhones.get(phone);
        if (typeof firstSeenAt === 'number') {
          warnings.push(
            `Row ${rowNumber}: duplicate phone '${phone}' (first seen on row ${firstSeenAt}) - phone dropped for this row`,
          );
          phone = undefined;
        } else {
          seenPhones.set(phone, rowNumber);
        }
      }

      if (!tsoByName.has(tsoName.trim().toLowerCase())) {
        throw new Error(`TSO '${tsoName}' not found in database`);
      }

      normalized.push({
        rowNumber,
        accountNumber,
        accountName,
        accountBalance,
        phone,
        tsoName,
        branch,
        dateCreated,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'invalid row';
      errors.push(`Row ${rowNumber}: ${message}`);
    }
  });

  const existingAccounts = new Set(await MemberModel.distinct('accountNumber'));
  const existingPhoneOwners = new Map<string, string>();
  const existingWithPhones = await MemberModel.find({ phone: { $exists: true, $ne: '' } })
    .select('accountNumber phone')
    .lean();
  for (const row of existingWithPhones) {
    if (row.phone) {
      existingPhoneOwners.set(row.phone, row.accountNumber);
    }
  }

  for (const row of normalized) {
    if (!row.phone) continue;
    const ownerAccount = existingPhoneOwners.get(row.phone);
    if (ownerAccount && ownerAccount !== row.accountNumber) {
      warnings.push(
        `Row ${row.rowNumber}: phone '${row.phone}' already belongs to account '${ownerAccount}' in DB - phone dropped for this row`,
      );
      row.phone = undefined;
    }
  }

  const summary = {
    mode: options.commit ? 'commit' : 'dry-run',
    filePath: options.filePath,
    totalRows: csvRows.length,
    validRows: normalized.length,
    errors: errors.length,
    toInsert: normalized.filter((r) => !existingAccounts.has(r.accountNumber)).length,
    toUpdate: normalized.filter((r) => existingAccounts.has(r.accountNumber)).length,
  };

  const indexes = (await MemberModel.collection.indexes()) as Array<{
    name: string;
    key: Record<string, 1 | -1>;
    unique?: boolean;
    sparse?: boolean;
  }>;

  const phoneIndexMigration = await ensureOptionalPhoneIndex(indexes, false);

  console.log(
    JSON.stringify(
      {
        summary,
        phoneIndex: ensurePhoneIndexMessage(indexes),
        phoneIndexMigration,
        warnings: warnings.length,
      },
      null,
      2,
    ),
  );

  if (warnings.length > 0) {
    console.log('\nValidation warnings:');
    warnings.slice(0, 100).forEach((w) => console.log(`- ${w}`));
    if (warnings.length > 100) {
      console.log(`- ...and ${warnings.length - 100} more`);
    }
  }

  if (errors.length > 0) {
    console.log('\nValidation errors:');
    errors.slice(0, 100).forEach((e) => console.log(`- ${e}`));
    if (errors.length > 100) {
      console.log(`- ...and ${errors.length - 100} more`);
    }
  }

  if (!options.commit) {
    console.log('\nDry run complete. Re-run with --commit to apply changes.');
    await mongoose.disconnect();
    return;
  }

  if (errors.length > 0) {
    throw new Error('Import aborted because validation errors exist. Fix CSV and retry.');
  }

  const indexesForCommit = (await MemberModel.collection.indexes()) as Array<{
    name: string;
    key: Record<string, 1 | -1>;
    unique?: boolean;
    sparse?: boolean;
  }>;
  const phoneIndexCommitMessage = await ensureOptionalPhoneIndex(indexesForCommit, true);
  console.log(phoneIndexCommitMessage);

  for (const row of normalized) {
    const tsoId = tsoByName.get(row.tsoName.trim().toLowerCase());
    if (!tsoId) {
      throw new Error(`Unexpected missing TSO mapping for ${row.tsoName}`);
    }

    const setData: Record<string, unknown> = {
      accountNumber: row.accountNumber,
      name: row.accountName,
      savingsBalance: row.accountBalance,
      createdByTsoId: tsoId,
      branch: row.branch,
    };

    if (row.phone) {
      setData.phone = row.phone;
    }

    const unsetData: Record<string, unknown> = {};
    if (!row.phone) {
      unsetData.phone = '';
    }

    await MemberModel.updateOne(
      { accountNumber: row.accountNumber },
      {
        $set: setData,
        ...(Object.keys(unsetData).length ? { $unset: unsetData } : {}),
        $setOnInsert: {
          memberId: uuidv4(),
          nationalIdRef: `LEGACY-${row.accountNumber}`,
          kycStatus: 'pending',
          createdAt: row.dateCreated,
        },
      },
      { upsert: true },
    );
  }

  console.log(`\nImport committed successfully. Rows processed: ${normalized.length}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
