import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { resolveWishlistUserId, getOrCreateWishlist } from '@/lib/wishlist';

function emptyWishlistResponse() {
  return NextResponse.json({ ok: true, data: { id: null, userId: null, name: 'Favorites', items: [] } });
}

export async function GET(req: Request) {
  try {
    const auth = getAuth(req as Parameters<typeof getAuth>[0]);
    const userId = await resolveWishlistUserId(auth.userId ?? null);
    if (!userId) return emptyWishlistResponse();
    const wishlist = await getOrCreateWishlist(userId);
    return NextResponse.json({ ok: true, data: wishlist });
  } catch {
    return emptyWishlistResponse();
  }
}
