import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ensureGuestCartToken } from '@/lib/cart';
import { normalizeOrder, resolveCheckoutCart, shippingForSubtotal, taxForSubtotal } from '@/lib/checkout';
import { upsertUserFromClerk } from '@/lib/clerk';
import { incrementCouponUsage, validateCouponForSubtotal } from '@/lib/coupons';

const schema = z.object({
  shippingAddressId: z.string().min(1),
  billingAddressId: z.string().min(1).optional().nullable(),
  idempotencyKey: z.string().min(8).max(120).optional().nullable(),
  couponCode: z.string().trim().min(1).optional().nullable(),
});

export async function POST(req: Request) {
  const auth = getAuth(req as Parameters<typeof getAuth>[0]);
  if (!auth.userId) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  const dbUser = await upsertUserFromClerk(auth.userId);
  if (!dbUser) return NextResponse.json({ ok: false, error: 'Unable to resolve user' }, { status: 500 });
  const body = schema.parse(await req.json());
  const guestToken = await ensureGuestCartToken();
  const cart = await resolveCheckoutCart(dbUser.id, guestToken);
  if (!cart || cart.items.length === 0) return NextResponse.json({ ok: false, error: 'Cart is empty' }, { status: 400 });

  const existingOrder = body.idempotencyKey ? await prisma.order.findUnique({ where: { idempotencyKey: body.idempotencyKey }, include: { items: true, shippingAddress: true, billingAddress: true } }) : null;
  if (existingOrder && existingOrder.userId === dbUser.id) return NextResponse.json({ ok: true, data: await normalizeOrder(existingOrder) });

  const order = await prisma.$transaction(async (tx) => {
    const shippingAddress = await tx.address.findFirst({ where: { id: body.shippingAddressId, userId: dbUser.id } });
    if (!shippingAddress) throw new Error('INVALID_SHIPPING_ADDRESS');
    if (body.billingAddressId) {
      const billing = await tx.address.findFirst({ where: { id: body.billingAddressId, userId: dbUser.id } });
      if (!billing) throw new Error('INVALID_BILLING_ADDRESS');
    }

    const refreshed = await tx.cart.findFirst({
      where: { id: cart.id, userId: dbUser.id },
      include: { items: { include: { variant: { include: { inventory: true, product: true } } } } },
    });
    if (!refreshed || refreshed.items.length === 0) throw new Error('EMPTY_CART');

    let subtotal = 0;
    const snapshots = [];
    for (const item of refreshed.items) {
      const variant = item.variant;
      if (!variant || variant.product.deletedAt || !variant.product.isPublished) throw new Error('INVALID_ITEM');
      const inventory = variant.inventory;
      if (!inventory || inventory.quantityOnHand < item.quantity) throw new Error('INSUFFICIENT_STOCK');
      const unitPrice = variant.price;
      subtotal += unitPrice * item.quantity;
      snapshots.push({ variantId: variant.id, title: variant.title, sku: variant.sku ?? null, unitPrice, quantity: item.quantity, totalPrice: unitPrice * item.quantity });
    }

    const couponResult = body.couponCode ? await validateCouponForSubtotal(body.couponCode, subtotal) : null;
    if (body.couponCode && (!couponResult || !couponResult.ok)) throw new Error(couponResult?.error ?? 'INVALID_COUPON');
    const discount = couponResult?.ok ? couponResult.discount : 0;
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const shipping = shippingForSubtotal(discountedSubtotal);
    const tax = taxForSubtotal(discountedSubtotal);
    const total = discountedSubtotal + shipping + tax;

    for (const item of refreshed.items) {
      const result = await tx.inventory.updateMany({
        where: { variantId: item.variantId, quantityOnHand: { gte: item.quantity } },
        data: { quantityOnHand: { decrement: item.quantity } },
      });
      if (result.count !== 1) throw new Error('INSUFFICIENT_STOCK');
    }

    const created = await tx.order.create({
      data: {
        userId: dbUser.id,
        idempotencyKey: body.idempotencyKey ?? null,
        shippingAddressId: shippingAddress.id,
        billingAddressId: body.billingAddressId ?? null,
        subtotal,
        discount,
        shipping,
        tax,
        total,
        status: 'PENDING',
        couponId: couponResult?.ok ? couponResult.coupon.id : null,
        items: { create: snapshots.map((item) => ({ variantId: item.variantId, title: item.title, sku: item.sku, unitPrice: item.unitPrice, quantity: item.quantity, totalPrice: item.totalPrice })) },
      },
      include: { items: true, shippingAddress: true, billingAddress: true },
    });

    await tx.cartItem.deleteMany({ where: { cartId: refreshed.id } });
    if (couponResult?.ok) await incrementCouponUsage(tx, couponResult.coupon.id);
    return created;
  });

  return NextResponse.json({ ok: true, data: await normalizeOrder(order) }, { status: 201 });
}
