import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { upsertUserFromClerk } from '@/lib/clerk';

const createSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional().nullable(),
  body: z.string().max(2000).optional().nullable(),
});

export async function GET(req: Request, context: { params: Promise<{ productId: string }> }) {
  const { productId } = await context.params;
  const auth = getAuth(req as Parameters<typeof getAuth>[0]);
  const dbUser = auth.userId ? await upsertUserFromClerk(auth.userId).catch(() => null) : null;
  const reviews = await prisma.review.findMany({
    where: { productId, isApproved: true },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const mine = dbUser
    ? await prisma.review.findFirst({ where: { productId, userId: dbUser.id }, include: { user: true } })
    : null;
  return NextResponse.json({
    ok: true,
    data: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      createdAt: review.createdAt.toISOString(),
      userName: review.user.name ?? 'Customer',
      verifiedPurchase: review.verifiedPurchase,
    })),
    mine: mine ? {
      id: mine.id,
      rating: mine.rating,
      title: mine.title,
      body: mine.body,
      verifiedPurchase: mine.verifiedPurchase,
    } : null,
  });
}

export async function POST(req: Request, context: { params: Promise<{ productId: string }> }) {
  const { productId } = await context.params;
  const auth = getAuth(req as Parameters<typeof getAuth>[0]);
  if (!auth.userId) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  const dbUser = await upsertUserFromClerk(auth.userId);
  if (!dbUser) return NextResponse.json({ ok: false, error: 'Unable to resolve user' }, { status: 500 });
  const body = createSchema.parse(await req.json());
  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null, isPublished: true } });
  if (!product) return NextResponse.json({ ok: false, error: 'Product not found' }, { status: 404 });
  const existing = await prisma.review.findFirst({ where: { productId, userId: dbUser.id } });
  if (existing) return NextResponse.json({ ok: false, error: 'Review already exists' }, { status: 409 });
  const verifiedPurchase = Boolean(await prisma.orderItem.findFirst({
    where: {
      variant: { productId },
      order: { userId: dbUser.id, payments: { some: { status: 'SUCCEEDED' } } },
    },
  }));
  const review = await prisma.review.create({
    data: {
      userId: dbUser.id,
      productId,
      rating: body.rating,
      title: body.title ?? null,
      body: body.body ?? null,
      verifiedPurchase,
      isApproved: true,
    },
  });
  return NextResponse.json({ ok: true, data: review }, { status: 201 });
}
