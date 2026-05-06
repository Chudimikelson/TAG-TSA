import { z } from 'zod';

export const createCollectionSchema = z.object({
  planId: z.string().min(1).trim(),
  memberId: z.string().min(1).trim(),
  amount: z.coerce.number().int().positive(),
  method: z.enum(['cash', 'tsa', 'tagora_pool']),
  timestamp: z.coerce.date().optional(),
  geo: z
    .object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
    })
    .optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  idempotencyKey: z.string().min(1).max(128).trim(),
})
  .superRefine((val, ctx) => {
    const latProvided = val.lat !== undefined;
    const lngProvided = val.lng !== undefined;
    if (latProvided !== lngProvided) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['geo'],
        message: 'Both lat and lng are required when providing coordinates',
      });
    }
  })
  .transform(({ lat, lng, timestamp, geo, ...rest }) => {
    const resolvedGeo = geo ?? (lat !== undefined && lng !== undefined ? { lat, lng } : undefined);
    return {
      ...rest,
      timestamp: timestamp ?? new Date(),
      ...(resolvedGeo ? { geo: resolvedGeo } : {}),
    };
  });

export type CreateCollectionBody = z.infer<typeof createCollectionSchema>;
