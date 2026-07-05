import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateWishlist, resolveWishlistUserId } from '@/lib/wishlist';

const schema = z.object({
  variantId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const auth = getAuth(req as Parameters<typeof getAuth>[0]);
    const userId = await resolveWishlistUserId(auth.userId ?? null);
    if (!userId) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
    const body = schema.parse(await req.json());
    const variant = await prisma.productVariant.findUnique({ where: { id: body.variantId }, include: { product: true } });
    if (!variant || variant.product.deletedAt || !variant.product.isPublished) return NextResponse.json({ ok: false, error: 'Invalid variant' }, { status: 404 });
    const wishlist = await getOrCreateWishlist(userId);
    const existing = await prisma.wishlistItem.findFirst({ where: { wishlistId: wishlist.id, variantId: body.variantId }, select: { id: true } });
    if (!existing) await prisma.wishlistItem.create({ data: { wishlistId: wishlist.id, variantId: body.variantId } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
