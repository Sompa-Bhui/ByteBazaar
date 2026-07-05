import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { canTransitionOrderStatus, isAdminRole } from '@/lib/admin-orders';

const schema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'FULFILLED', 'CANCELLED', 'REFUNDED']),
  reason: z.string().max(500).optional(),
});

async function isAdmin(userId: string | null) {
  if (!userId || !process.env.CLERK_SECRET_KEY) return false;
  const { clerkClient } = await import('@clerk/nextjs/server');
  const client = await clerkClient();
  const user = await client.users.getUser(userId).catch(() => null);
  const role = user && typeof user.publicMetadata === 'object' && user.publicMetadata ? (user.publicMetadata as Record<string, unknown>).role : null;
  return isAdminRole(typeof role === 'string' ? role : null);
}

export async function PATCH(req: Request, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  const auth = getAuth(req as Parameters<typeof getAuth>[0]);
  if (!(await isAdmin(auth.userId ?? null))) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = schema.parse(await req.json());

  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: { orderBy: { createdAt: 'desc' } } },
    });
    if (!order) throw new Error('NOT_FOUND');
    if (!canTransitionOrderStatus(order.status, body.status)) throw new Error('INVALID_TRANSITION');

    const latestPayment = order.payments[0] ?? null;
    const paid = latestPayment?.status === 'SUCCEEDED';
    if (!paid && body.status === 'PROCESSING') throw new Error('PAYMENT_REQUIRED');
    if (!paid && body.status === 'FULFILLED') throw new Error('PAYMENT_REQUIRED');

    if (body.status === 'CANCELLED' && order.restockedAt === null) {
      for (const item of order.items) {
        await tx.inventory.updateMany({
          where: { variantId: item.variantId },
          data: { quantityOnHand: { increment: item.quantity } },
        });
      }
    }

    return tx.order.update({
      where: { id: order.id },
      data: {
        status: body.status,
        cancelledAt: body.status === 'CANCELLED' ? new Date() : order.cancelledAt,
        restockedAt: body.status === 'CANCELLED' ? new Date() : order.restockedAt,
      },
      include: { user: true, items: true, payments: { orderBy: { createdAt: 'desc' } }, shippingAddress: true, billingAddress: true },
    });
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unable to update order';
    return NextResponse.json({ ok: false, error: message }, { status: message === 'NOT_FOUND' ? 404 : 400 });
  });

  if (updated instanceof NextResponse) return updated;
  return NextResponse.json({ ok: true, data: updated });
}

