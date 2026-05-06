import { Request, Response, NextFunction } from 'express';
import {
  createMemberSchema,
  createPlanSchema,
  updateMemberSchema,
  updatePlanSchema,
  CreateMemberBody,
  CreatePlanBody,
  UpdateMemberBody,
  UpdatePlanBody,
} from '../validators/member.validators.js';
import {
  createMember,
  getMember,
  listMembers,
  createPlan,
  getMemberPlans,
  updateMember,
  updateMemberPlan,
} from '../services/member.service.js';

export async function handleListMembers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const members = await listMembers(req.actor!.sub, req.actor!.role as 'admin' | 'tso');
    res.json({ success: true, data: members });
  } catch (err) {
    next(err);
  }
}

export async function handleCreateMember(
  req: Request<object, object, CreateMemberBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = createMemberSchema.parse(req.body);
    const member = await createMember(body, req.actor!.sub, req.actor!.role as 'admin' | 'tso');
    res.status(201).json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
}

export async function handleGetMember(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const member = await getMember(req.params.id);
    res.json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
}

export async function handleCreatePlan(
  req: Request<{ id: string }, object, CreatePlanBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = createPlanSchema.parse(req.body);
    const plan = await createPlan(req.params.id, body, req.actor!.sub);
    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
}

export async function handleGetMemberPlans(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const plans = await getMemberPlans(req.params.id);
    res.json({ success: true, data: plans });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateMember(
  req: Request<{ id: string }, object, UpdateMemberBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = updateMemberSchema.parse(req.body);
    const member = await updateMember(
      req.params.id,
      body,
      req.actor!.sub,
      req.actor!.role as 'admin' | 'tso',
    );
    res.json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateMemberPlan(
  req: Request<{ id: string; planId: string }, object, UpdatePlanBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = updatePlanSchema.parse(req.body);
    const plan = await updateMemberPlan(
      req.params.id,
      req.params.planId,
      body,
      req.actor!.sub,
      req.actor!.role as 'admin' | 'tso',
    );
    res.json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
}
