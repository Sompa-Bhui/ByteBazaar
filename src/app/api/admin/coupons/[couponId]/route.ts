import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminUserId } from '@/lib/admin-auth';

const patchSchema = z.object({
  description: z.string().max(500).optional().nullable(),
  discountType: z.enum(['PERCENT', 'AMOUNT']).optional(),
  amount: z.number().int().positive().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  minAmount: z.number().int().nonnegative().optional().nullable(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, context: { params: Promise<{ couponId: string }> }) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const { couponId } = await context.params;
  const body = patchSchema.parse(await req.json());
  const coupon = await prisma.coupon.update({
    where: { id: couponId },
    data: {
      ...body,
      startsAt: body.startsAt ? new Date(body.startsAt) : body.startsAt === null ? null : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : body.expiresAt === null ? null : undefined,
    },
  });
  return NextResponse.json({ ok: true, data: coupon });
}

export async function DELETE(req: Request, context: { params: Promise<{ couponId: string }> }) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const { couponId } = await context.params;
  const coupon = await prisma.coupon.update({ where: { id: couponId }, data: { active: false } });
  return NextResponse.json({ ok: true, data: coupon });
}

