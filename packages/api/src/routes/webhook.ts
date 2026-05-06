import { Router } from 'express';
import { handlePaymentWebhook } from '../controllers/webhook.controller.js';

export const webhookRouter = Router();

// POST /webhooks/payments
// Body is raw Buffer — express.raw() is applied in app.ts before this router
webhookRouter.post('/payments', handlePaymentWebhook);
