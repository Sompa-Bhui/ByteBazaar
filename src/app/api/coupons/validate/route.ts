import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureGuestCartToken } from '@/lib/cart';
import { resolveCheckoutCart, shippingForSubtotal, taxForSubtotal } from '@/lib/checkout';
import { validateCouponForSubtotal } from '@/lib/coupons';
import { upsertUserFromClerk } from '@/lib/clerk';

const schema = z.object({ couponCode: z.string().min(1) });

export async function POST(req: Request) {
  const auth = getAuth(req as Parameters<typeof getAuth>[0]);
  if (!auth.userId) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  const body = schema.parse(await req.json());
  const dbUser = await upsertUserFromClerk(auth.userId);
  if (!dbUser) return NextResponse.json({ ok: false, error: 'Unable to resolve user' }, { status: 500 });
  const cart = await resolveCheckoutCart(dbUser.id, await ensureGuestCartToken());
  if (!cart) return NextResponse.json({ ok: false, error: 'Cart not found' }, { status: 404 });
  let subtotal = 0;
  for (const item of cart.items) subtotal += item.variant.price * item.quantity;
  const result = await validateCouponForSubtotal(body.couponCode, subtotal);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  const discounted = Math.max(0, subtotal - result.discount);
  return NextResponse.json({
    ok: true,
    data: {
      code: result.coupon.code,
      discount: result.discount,
      subtotal,
      total: discounted + shippingForSubtotal(discounted) + taxForSubtotal(discounted),
      usageLimit: result.coupon.usageLimit,
      usedCount: result.coupon.usedCount,
      minAmount: result.coupon.minAmount,
    },
  });
}
