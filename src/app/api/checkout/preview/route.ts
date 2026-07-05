import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureGuestCartToken } from '@/lib/cart';
import { listOwnedAddresses, resolveCheckoutCart, shippingForSubtotal, taxForSubtotal } from '@/lib/checkout';
import { upsertUserFromClerk } from '@/lib/clerk';
import { validateCouponForSubtotal } from '@/lib/coupons';

export async function GET(req: Request) {
  const auth = getAuth(req as Parameters<typeof getAuth>[0]);
  if (!auth.userId) return NextResponse.json({ ok: false, error: 'Sign in required to checkout', data: { requiresAuth: true } }, { status: 401 });
  const dbUser = await upsertUserFromClerk(auth.userId);
  if (!dbUser) return NextResponse.json({ ok: false, error: 'Unable to resolve user' }, { status: 500 });
  const guestToken = await ensureGuestCartToken();
  const cart = await resolveCheckoutCart(dbUser.id, guestToken);
  if (!cart || cart.items.length === 0) return NextResponse.json({ ok: true, data: { requiresAuth: false, cartId: null, items: [], subtotal: 0, shipping: 0, tax: 0, total: 0, itemCount: 0, addresses: [], selectedAddressId: null } });

  const items = [];
  let subtotal = 0;
  for (const item of cart.items) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: item.variantId, product: { deletedAt: null, isPublished: true } },
      include: { inventory: true, product: { include: { images: { orderBy: { position: 'asc' } } } } },
    });
    if (!variant || (variant.inventory?.quantityOnHand ?? 0) < item.quantity) continue;
    const unitPrice = variant.price;
    subtotal += unitPrice * item.quantity;
    items.push({
      id: item.id,
      variantId: item.variantId,
      quantity: item.quantity,
      product: { id: variant.product.id, title: variant.product.title, slug: variant.product.slug, price: variant.product.price, image: variant.product.images[0]?.url ?? null },
      variant: { id: variant.id, title: variant.title, price: variant.price, sku: variant.sku ?? null },
    });
  }
  const url = new URL(req.url);
  const couponCode = url.searchParams.get('couponCode') ?? '';
  const couponResult = couponCode ? await validateCouponForSubtotal(couponCode, subtotal) : null;
  const discount = couponResult?.ok ? couponResult.discount : 0;
  const addresses = await listOwnedAddresses(dbUser.id);
  const shipping = shippingForSubtotal(subtotal - discount);
  const tax = taxForSubtotal(Math.max(0, subtotal - discount));
  const grandTotal = Math.max(0, subtotal - discount) + shipping + tax;
  return NextResponse.json({ ok: true, data: { requiresAuth: false, cartId: cart.id, items, subtotal, discount, shipping, tax, total: grandTotal, couponCode: couponResult?.ok ? couponResult.coupon.code : null, couponError: couponResult && !couponResult.ok ? couponResult.error : null, itemCount: items.reduce((n, item) => n + item.quantity, 0), addresses, selectedAddressId: addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null } });
}
