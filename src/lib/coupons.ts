import type { Coupon, Prisma } from '@prisma/client';
import { prisma } from './prisma';

export type CouponValidationResult =
  | { ok: true; coupon: Coupon; discount: number; subtotal: number; total: number }
  | { ok: false; error: string };

export function normalizeCouponCode(code: string) {
  return code.trim().toUpperCase();
}

export function calculateCouponDiscount(coupon: Coupon, subtotal: number) {
  if (coupon.minAmount !== null && coupon.minAmount !== undefined && subtotal < coupon.minAmount) return 0;
  if (coupon.discountType === 'PERCENT') return Math.min(subtotal, Math.floor((subtotal * coupon.amount) / 100));
  return Math.min(subtotal, coupon.amount);
}

export async function validateCouponForSubtotal(code: string, subtotal: number): Promise<CouponValidationResult> {
  const normalized = normalizeCouponCode(code);
  const coupon = await prisma.coupon.findUnique({ where: { code: normalized } });
  if (!coupon) return { ok: false, error: 'Coupon not found' };
  const now = new Date();
  if (!coupon.active) return { ok: false, error: 'Coupon is inactive' };
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, error: 'Coupon is not active yet' };
  if (coupon.expiresAt && coupon.expiresAt < now) return { ok: false, error: 'Coupon has expired' };
  if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) return { ok: false, error: 'Coupon usage limit reached' };
  if (coupon.minAmount !== null && coupon.minAmount !== undefined && subtotal < coupon.minAmount) return { ok: false, error: 'Order does not meet minimum amount' };
  const discount = calculateCouponDiscount(coupon, subtotal);
  return { ok: true, coupon, discount, subtotal, total: Math.max(0, subtotal - discount) };
}

export async function incrementCouponUsage(tx: Prisma.TransactionClient, couponId: string) {
  await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
}

