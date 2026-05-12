import { Request, Response, NextFunction } from 'express';
import {
  createTsoByAdmin,
  flagCollection,
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
import {
  CreateAdminBody,
  UpdateAdminBody,
  UpdateAdminRoleBody,
  UpdateAdminStatusBody,
  UpdateTsoBody,
  UpdateTsoStatusBody,
} from '../validators/admin.validators.js';

export async function handleFlagCollection(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const collection = await flagCollection(req.params.id, req.actor!.sub);
    res.json({ success: true, data: collection });
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
