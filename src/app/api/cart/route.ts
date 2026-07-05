import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { ensureGuestCartToken, getGuestCartCookieOptions, getResolvedCart, mergeGuestCartIntoUserCart } from '@/lib/cart';

export async function GET(req: Request) {
  try {
    const auth = getAuth(req as Parameters<typeof getAuth>[0]);
    const guestToken = await ensureGuestCartToken();
    if (auth.userId) {
      await mergeGuestCartIntoUserCart(guestToken, auth.userId).catch(() => null);
      return NextResponse.json({ ok: true, data: await getResolvedCart(auth.userId, guestToken) });
    }
    const response = NextResponse.json({ ok: true, data: await getResolvedCart(null, guestToken) });
    response.cookies.set('bytebazaar_guest_cart', guestToken, getGuestCartCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: 'Unable to load cart' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = getAuth(req as Parameters<typeof getAuth>[0]);
    const guestToken = await ensureGuestCartToken();
    const cart = auth.userId
      ? await prisma.cart.findFirst({ where: { user: { clerkId: auth.userId } } })
      : await prisma.cart.findFirst({ where: { token: guestToken } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.cart.delete({ where: { id: cart.id } });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Unable to clear cart' }, { status: 500 });
  }
}
