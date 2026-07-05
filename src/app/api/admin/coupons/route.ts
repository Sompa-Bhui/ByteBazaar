import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminUserId } from '@/lib/admin-auth';

const createSchema = z.object({
  code: z.string().min(2),
  discountType: z.enum(['PERCENT', 'AMOUNT']),
  amount: z.number().int().positive(),
  description: z.string().max(500).optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  minAmount: z.number().int().nonnegative().optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET(req: Request) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ ok: true, data: coupons });
}

export async function POST(req: Request) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = createSchema.parse(await req.json());
  const coupon = await prisma.coupon.create({
    data: {
      code: body.code.trim().toUpperCase(),
      discountType: body.discountType,
      amount: body.amount,
      description: body.description ?? null,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      usageLimit: body.usageLimit ?? null,
      minAmount: body.minAmount ?? null,
      active: body.active ?? true,
    },
  });
  return NextResponse.json({ ok: true, data: coupon }, { status: 201 });
}
