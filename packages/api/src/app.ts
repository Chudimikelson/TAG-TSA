import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { tsoRouter } from './routes/tso.js';
import { memberRouter } from './routes/member.js';
import { collectionRouter } from './routes/collection.js';
import { withdrawalRouter } from './routes/withdrawal.js';
import { reconciliationRouter } from './routes/reconciliation.js';
import { webhookRouter } from './routes/webhook.js';
import { adminRouter } from './routes/admin.js';
import { customerRouter } from './routes/customer.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

export function createApp() {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS – supports single origin, comma-separated origins, or wildcard
  const rawCorsOrigin = process.env.CORS_ORIGIN ?? '*';
  const allowedOrigins = rawCorsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (allowedOrigins.includes('*')) {
    app.use(cors({ origin: '*' }));
  } else {
    app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
          }
          callback(new Error('Blocked by CORS'));
        },
      }),
    );
  }

  // Body parsing (webhooks use raw body – mount before json middleware)
  app.use('/webhooks', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '1mb' }));

  // Request logging
  app.use(requestLogger);

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Routes
  app.use('/auth', authRouter);
  app.use('/tso', tsoRouter);
  app.use('/members', memberRouter);
  app.use('/collections', collectionRouter);
  app.use('/withdrawals', withdrawalRouter);
  app.use('/reconciliation', reconciliationRouter);
  app.use('/webhooks', webhookRouter);
  app.use('/admin', adminRouter);
  app.use('/customer', customerRouter);

  // Central error handler
  app.use(errorHandler);

  return app;
}
