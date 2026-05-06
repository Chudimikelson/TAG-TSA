import 'dotenv/config';
import { createApp } from './app.js';
import { connectDatabase } from './db/connection.js';
import { startPaymentMatchWorker } from './workers/paymentMatch.worker.js';
import { logger } from './lib/logger.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function main() {
  await connectDatabase();
  if (process.env.REDIS_URL) {
    startPaymentMatchWorker();
  } else {
    logger.warn('REDIS_URL not set — payment match worker disabled');
  }
  const app = createApp();
  app.listen(PORT, () => {
    logger.info(`Tagora API running on port ${PORT} [${process.env.NODE_ENV}]`);
  });
}

main().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
