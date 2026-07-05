import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ensureGuestCartToken, findOrCreateCart, assertQuantity, assertStock, validateVariantForCart } from '@/lib/cart';

const schema = z.object({
  quantity: z.number().int().positive(),
});

export async function PATCH(req: Request, context: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await context.params;
    const body = schema.parse(await req.json());
    assertQuantity(body.quantity);
    const auth = getAuth(req as Parameters<typeof getAuth>[0]);
    const cart = await findOrCreateCart(auth.userId ?? null, await ensureGuestCartToken());
    const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, select: { id: true, variantId: true } });
    if (!item) return NextResponse.json({ ok: false, error: 'Item not found' }, { status: 404 });
    const variant = await validateVariantForCart(item.variantId);
    if (!variant) return NextResponse.json({ ok: false, error: 'Invalid variant' }, { status: 404 });
    assertStock(variant.inventory?.quantityOnHand ?? 0, body.quantity);
    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity: body.quantity } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await context.params;
    const auth = getAuth(req as Parameters<typeof getAuth>[0]);
    const cart = await findOrCreateCart(auth.userId ?? null, await ensureGuestCartToken());
    const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, select: { id: true } });
    if (!item) return NextResponse.json({ ok: false, error: 'Item not found' }, { status: 404 });
    await prisma.cartItem.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Unable to remove item' }, { status: 500 });
  }
}
