import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { resolveWishlistUserId, getOrCreateWishlist } from '@/lib/wishlist';

export async function GET(req: Request) {
  try {
    const auth = getAuth(req as Parameters<typeof getAuth>[0]);
    const userId = await resolveWishlistUserId(auth.userId ?? null);
    if (!userId) return NextResponse.json({ ok: true, data: { id: null, items: [] } });
    const wishlist = await getOrCreateWishlist(userId);
    return NextResponse.json({ ok: true, data: wishlist });
  } catch {
    return NextResponse.json({ ok: false, error: 'Unable to load wishlist' }, { status: 500 });
  }
}
