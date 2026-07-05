import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { setDefaultAddress } from '@/lib/checkout';
import { upsertUserFromClerk } from '@/lib/clerk';

const schema = z.object({
  label: z.string().max(80).optional().nullable(),
  isDefault: z.boolean().optional(),
  fullName: z.string().min(2).max(120),
  phone: z.string().min(5).max(30),
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(2).max(100),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().min(2).max(20),
  country: z.string().min(2).max(100),
});

async function resolveOwnedAddress(userId: string, addressId: string) {
  return prisma.address.findFirst({ where: { id: addressId, userId } });
}

export async function PATCH(req: Request, context: { params: Promise<{ addressId: string }> }) {
  const { addressId } = await context.params;
  const auth = getAuth(req as Parameters<typeof getAuth>[0]);
  if (!auth.userId) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  const dbUser = await upsertUserFromClerk(auth.userId);
  if (!dbUser) return NextResponse.json({ ok: false, error: 'Unable to resolve user' }, { status: 500 });
  const existing = await resolveOwnedAddress(dbUser.id, addressId);
  if (!existing) return NextResponse.json({ ok: false, error: 'Address not found' }, { status: 404 });
  const body = schema.parse(await req.json());
  const updated = await prisma.$transaction(async (tx) => {
    const address = await tx.address.update({
      where: { id: addressId },
      data: {
        label: body.label ?? null,
        fullName: body.fullName,
        line1: body.line1,
        line2: body.line2 ?? null,
        city: body.city,
        state: body.state ?? null,
        postalCode: body.postalCode,
        country: body.country,
        phone: body.phone,
      },
    });
    if (body.isDefault ?? existing.isDefault) await setDefaultAddress(tx, dbUser.id, address.id);
    return address;
  });
  return NextResponse.json({ ok: true, data: updated });
}

export async function DELETE(req: Request, context: { params: Promise<{ addressId: string }> }) {
  const { addressId } = await context.params;
  const auth = getAuth(req as Parameters<typeof getAuth>[0]);
  if (!auth.userId) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  const dbUser = await upsertUserFromClerk(auth.userId);
  if (!dbUser) return NextResponse.json({ ok: false, error: 'Unable to resolve user' }, { status: 500 });
  const existing = await resolveOwnedAddress(dbUser.id, addressId);
  if (!existing) return NextResponse.json({ ok: false, error: 'Address not found' }, { status: 404 });
  await prisma.address.delete({ where: { id: addressId } });
  return NextResponse.json({ ok: true });
}
