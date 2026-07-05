import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { buildAdminOrderWhere } from '@/lib/admin-orders';

const schema = z.object({
  q: z.string().optional(),
  orderStatus: z.enum(['PENDING', 'PROCESSING', 'FULFILLED', 'CANCELLED', 'REFUNDED']).optional(),
  paymentStatus: z.enum(['PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED']).optional(),
  sort: z.enum(['newest', 'oldest']).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

async function isAdmin(userId: string | null) {
  if (!userId || !process.env.CLERK_SECRET_KEY) return false;
  const { clerkClient } = await import('@clerk/nextjs/server');
  const client = await clerkClient();
  const user = await client.users.getUser(userId).catch(() => null);
  const role = user && typeof user.publicMetadata === 'object' && user.publicMetadata ? (user.publicMetadata as Record<string, unknown>).role : null;
  return role === 'ADMIN';
}

export async function GET(req: Request) {
  const auth = getAuth(req as Parameters<typeof getAuth>[0]);
  if (!(await isAdmin(auth.userId ?? null))) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const url = new URL(req.url);
  const parsed = schema.parse({
    q: url.searchParams.get('q') ?? undefined,
    orderStatus: url.searchParams.get('orderStatus') ?? undefined,
    paymentStatus: url.searchParams.get('paymentStatus') ?? undefined,
    sort: url.searchParams.get('sort') ?? undefined,
    page: url.searchParams.get('page') ?? undefined,
  });
  const pageSize = 20;
  const page = parsed.page ?? 1;
  const where = buildAdminOrderWhere(parsed);
  const orders = await prisma.order.findMany({
    where,
    include: { user: true, items: true, payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { createdAt: parsed.sort === 'oldest' ? 'asc' : 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  const total = await prisma.order.count({ where });
  return NextResponse.json({
    ok: true,
    data: {
      items: orders.map((order) => ({
        id: order.id,
        customer: order.user.name ?? order.user.email ?? order.userId,
        createdAt: order.createdAt,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        total: order.total,
        orderStatus: order.status,
        paymentStatus: order.payments[0]?.status ?? 'PENDING',
      })),
      page,
      total,
      pageSize,
    },
  });
}

