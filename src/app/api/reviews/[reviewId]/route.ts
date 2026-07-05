import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { upsertUserFromClerk } from '@/lib/clerk';

const patchSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(120).optional().nullable(),
  body: z.string().max(2000).optional().nullable(),
});

async function getReviewer(authUserId?: string | null) {
  if (!authUserId) return null;
  return upsertUserFromClerk(authUserId);
}

export async function PATCH(req: Request, context: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await context.params;
  const auth = getAuth(req as Parameters<typeof getAuth>[0]);
  const dbUser = await getReviewer(auth.userId ?? null);
  if (!dbUser) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  const body = patchSchema.parse(await req.json());
  const review = await prisma.review.findFirst({ where: { id: reviewId, userId: dbUser.id } });
  if (!review) return NextResponse.json({ ok: false, error: 'Review not found' }, { status: 404 });
  const updated = await prisma.review.update({ where: { id: reviewId }, data: { ...body } });
  return NextResponse.json({ ok: true, data: updated });
}

export async function DELETE(req: Request, context: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await context.params;
  const auth = getAuth(req as Parameters<typeof getAuth>[0]);
  const dbUser = await getReviewer(auth.userId ?? null);
  if (!dbUser) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  const review = await prisma.review.findFirst({ where: { id: reviewId, userId: dbUser.id } });
  if (!review) return NextResponse.json({ ok: false, error: 'Review not found' }, { status: 404 });
  await prisma.review.delete({ where: { id: reviewId } });
  return NextResponse.json({ ok: true });
}

