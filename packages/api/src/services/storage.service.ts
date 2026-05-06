import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '../lib/logger.js';

let s3Client: S3Client | null = null;

function getClient(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? '',
        secretAccessKey: process.env.S3_SECRET_KEY ?? '',
      },
      forcePathStyle: true, // required for MinIO
    });
  }
  return s3Client;
}

/**
 * Uploads a file buffer to S3-compatible storage.
 * Returns the public URL of the uploaded object.
 */
export async function uploadReceiptImage(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const bucket = process.env.S3_BUCKET ?? 'tagora-receipts';

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  const endpoint = process.env.S3_ENDPOINT ?? '';
  const url = `${endpoint}/${bucket}/${key}`;
  logger.info(`Receipt uploaded: ${url}`);
  return url;
}
