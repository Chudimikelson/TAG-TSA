import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { CollectionModel } from '../models/Collection.js';
import { MemberModel } from '../models/Member.js';
import { SavingsPlanModel } from '../models/SavingsPlan.js';
import { WithdrawalRequestModel } from '../models/WithdrawalRequest.js';

export const customerRouter = Router();

customerRouter.use(requireAuth, requireRole('customer'));

// GET /customer/me — member profile + plans
customerRouter.get('/me', async (req, res, next) => {
  try {
    const memberId = req.actor!.sub;
    const [member, plans] = await Promise.all([
      MemberModel.findOne({ memberId }),
      SavingsPlanModel.find({ memberId }).sort({ createdAt: -1 }),
    ]);
    if (!member) {
      res.status(404).json({ success: false, error: 'Member not found' });
      return;
    }
    res.json({ success: true, data: { member, plans } });
  } catch (err) {
    next(err);
  }
});

// GET /customer/collections — contribution history
customerRouter.get('/collections', async (req, res, next) => {
  try {
    const memberId = req.actor!.sub;
    const collections = await CollectionModel.find({ memberId }).sort({
      timestamp: -1,
    });
    res.json({ success: true, data: collections });
  } catch (err) {
    next(err);
  }
});

// GET /customer/withdrawals — withdrawal requests for this member
customerRouter.get('/withdrawals', async (req, res, next) => {
  try {
    const memberId = req.actor!.sub;
    const withdrawals = await WithdrawalRequestModel.find({ memberId }).sort({
      requestedAt: -1,
    });
    res.json({ success: true, data: withdrawals });
  } catch (err) {
    next(err);
  }
});
