import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminRole } from '@/lib/admin-orders';

async function isAdmin(userId: string | null) {
  if (!userId || !process.env.CLERK_SECRET_KEY) return false;
  const { clerkClient } = await import('@clerk/nextjs/server');
  const client = await clerkClient();
  const user = await client.users.getUser(userId).catch(() => null);
  const role = user && typeof user.publicMetadata === 'object' && user.publicMetadata ? (user.publicMetadata as Record<string, unknown>).role : null;
  return isAdminRole(typeof role === 'string' ? role : null);
}

export async function GET(req: Request, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  const auth = getAuth(req as Parameters<typeof getAuth>[0]);
  if (!(await isAdmin(auth.userId ?? null))) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, items: true, payments: { orderBy: { createdAt: 'desc' } }, shippingAddress: true, billingAddress: true },
  });
  if (!order) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: order });
}

