import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ensureGuestCartToken, findOrCreateCart, getGuestCartCookieOptions, assertQuantity, assertStock, normalizeCart, validateVariantForCart } from '@/lib/cart';

const schema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export async function POST(req: Request) {
  try {
    const auth = getAuth(req as Parameters<typeof getAuth>[0]);
    const body = schema.parse(await req.json());
    assertQuantity(body.quantity);
    const variant = await validateVariantForCart(body.variantId);
    if (!variant) return NextResponse.json({ ok: false, error: 'Invalid variant' }, { status: 404 });
    assertStock(variant.inventory?.quantityOnHand ?? 0, body.quantity);
    const guestToken = await ensureGuestCartToken();
    const cart = await findOrCreateCart(auth.userId ?? null, guestToken);
    const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, variantId: body.variantId }, select: { id: true, quantity: true } });
    const nextQty = Math.min((existing?.quantity ?? 0) + body.quantity, variant.inventory?.quantityOnHand ?? 0);
    if (nextQty <= 0) return NextResponse.json({ ok: false, error: 'Out of stock' }, { status: 409 });
    if (existing) {
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQty } });
    } else {
      await prisma.cartItem.create({ data: { cartId: cart.id, variantId: body.variantId, quantity: nextQty } });
    }
    const normalized = normalizeCart(await prisma.cart.findUniqueOrThrow({
      where: { id: cart.id },
      include: { items: { include: { variant: { include: { product: { include: { images: { orderBy: { position: 'asc' } } } } } } }, orderBy: { addedAt: 'asc' } } },
    }) as never);
    const response = NextResponse.json({ ok: true, data: normalized });
    if (!auth.userId) response.cookies.set('bytebazaar_guest_cart', guestToken, getGuestCartCookieOptions());
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
