import { Request, Response, NextFunction } from 'express';
import {
  createTsoByAdmin,
  reviewCollection,
  reviewCollectionsBulk,
  listTsos,
  updateTso,
  updateTsoStatus,
  createAdmin,
  listAdmins,
  getAdmin,
  updateAdmin,
  updateAdminRole,
  updateAdminStatus,
} from '../services/admin.service.js';
import { bulkUpdateDepositBalances, BulkBalanceUpdate } from '../services/member.service.js';
import {
  CreateAdminBody,
  UpdateAdminBody,
  UpdateAdminRoleBody,
  UpdateAdminStatusBody,
  UpdateTsoBody,
  UpdateTsoStatusBody,
  ConfirmCollectionsBulkBody,
} from '../validators/admin.validators.js';

export async function handleConfirmCollection(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const collection = await reviewCollection(req.params.id, 'confirmed', req.actor!.sub);
    res.json({ success: true, data: collection });
  } catch (err) {
    next(err);
  }
}

export async function handleRejectCollection(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const collection = await reviewCollection(req.params.id, 'rejected', req.actor!.sub);
    res.json({ success: true, data: collection });
  } catch (err) {
    next(err);
  }
}

export async function handleConfirmCollectionsBulk(
  req: Request<object, object, ConfirmCollectionsBulkBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await reviewCollectionsBulk(req.body.collectionIds, 'confirmed', req.actor!.sub);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleRejectCollectionsBulk(
  req: Request<object, object, ConfirmCollectionsBulkBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await reviewCollectionsBulk(req.body.collectionIds, 'rejected', req.actor!.sub);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleCreateTso(req: Request, res: Response, next: NextFunction) {
  try {
    const tso = await createTsoByAdmin(req.body, req.actor!.sub);
    res.status(201).json({ success: true, data: tso });
  } catch (err) {
    next(err);
  }
}

export async function handleListTsos(_req: Request, res: Response, next: NextFunction) {
  try {
    const tsos = await listTsos();
    res.json({ success: true, data: tsos });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateTsoStatus(
  req: Request<{ id: string }, object, UpdateTsoStatusBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const tso = await updateTsoStatus(req.params.id, req.body, req.actor!.sub);
    res.json({ success: true, data: tso });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateTso(
  req: Request<{ id: string }, object, UpdateTsoBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const tso = await updateTso(req.params.id, req.body, req.actor!.sub);
    res.json({ success: true, data: tso });
  } catch (err) {
    next(err);
  }
}

export async function handleCreateAdmin(
  req: Request<object, object, CreateAdminBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const admin = await createAdmin(req.body, req.actor!.sub);
    res.status(201).json({ success: true, data: admin });
  } catch (err) {
    next(err);
  }
}

export async function handleListAdmins(_req: Request, res: Response, next: NextFunction) {
  try {
    const admins = await listAdmins();
    res.json({ success: true, data: admins });
  } catch (err) {
    next(err);
  }
}

export async function handleGetAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const admin = await getAdmin(req.params.id);
    res.json({ success: true, data: admin });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateAdminRole(
  req: Request<{ id: string }, object, UpdateAdminRoleBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const admin = await updateAdminRole(req.params.id, req.body, req.actor!.sub);
    res.json({ success: true, data: admin });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateAdminStatus(
  req: Request<{ id: string }, object, UpdateAdminStatusBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const admin = await updateAdminStatus(req.params.id, req.body, req.actor!.sub);
    res.json({ success: true, data: admin });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateAdmin(
  req: Request<{ id: string }, object, UpdateAdminBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const admin = await updateAdmin(req.params.id, req.body, req.actor!.sub);
    res.json({ success: true, data: admin });
  } catch (err) {
    next(err);
  }
}

export async function handleBulkUpdateDepositBalances(
  req: Request<object, object, { updates: BulkBalanceUpdate[] }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({ success: false, error: 'updates must be a non-empty array' });
      return;
    }
    if (updates.length > 1000) {
      res.status(400).json({ success: false, error: 'Maximum 1000 rows per upload' });
      return;
    }
    const results = await bulkUpdateDepositBalances(updates, req.actor!.sub);
    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}
