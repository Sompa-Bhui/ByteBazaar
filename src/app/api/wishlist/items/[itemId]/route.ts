import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateWishlist, resolveWishlistUserId } from '@/lib/wishlist';

export async function DELETE(req: Request, context: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await context.params;
    const auth = getAuth(req as Parameters<typeof getAuth>[0]);
    const userId = await resolveWishlistUserId(auth.userId ?? null);
    if (!userId) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
    const wishlist = await getOrCreateWishlist(userId);
    const item = await prisma.wishlistItem.findFirst({ where: { id: itemId, wishlistId: wishlist.id }, select: { id: true } });
    if (!item) return NextResponse.json({ ok: false, error: 'Item not found' }, { status: 404 });
    await prisma.wishlistItem.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Unable to remove item' }, { status: 500 });
  }
}
