import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import type { Prisma, Cart, CartItem, Product, ProductVariant } from '@prisma/client';
import { prisma } from './prisma';

export const GUEST_CART_COOKIE = 'bytebazaar_guest_cart';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export type NormalizedCartItem = {
  id: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: { id: string; title: string; slug: string; price: number; image: string | null };
  variant: { id: string; title: string; price: number; sku: string | null };
};

export type NormalizedCart = {
  id: string;
  token: string | null;
  userId: string | null;
  items: NormalizedCartItem[];
  subtotal: number;
  itemCount: number;
};

type CartWithItems = Cart & {
  items: (CartItem & { variant: ProductVariant & { product: Product & { images: { url: string; position: number }[] } } })[];
};

const cartInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: { images: { orderBy: { position: 'asc' } } },
          },
        },
      },
    },
    orderBy: { addedAt: 'asc' },
  },
} satisfies Prisma.CartInclude;

function getGuestTokenFromCookies() {
  return cookies().get(GUEST_CART_COOKIE)?.value ?? null;
}

export function getGuestCartCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  };
}

export async function ensureGuestCartToken() {
  return getGuestTokenFromCookies() ?? randomUUID();
}

export function normalizeCart(cart: CartWithItems): NormalizedCart {
  const items = cart.items.map((item) => {
    const unitPrice = item.variant.price;
    return {
      id: item.id,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice,
      subtotal: unitPrice * item.quantity,
      product: {
        id: item.variant.product.id,
        title: item.variant.product.title,
        slug: item.variant.product.slug,
        price: item.variant.product.price,
        image: item.variant.product.images[0]?.url ?? null,
      },
      variant: {
        id: item.variant.id,
        title: item.variant.title,
        price: item.variant.price,
        sku: item.variant.sku ?? null,
      },
    };
  });

  return {
    id: cart.id,
    token: cart.token ?? null,
    userId: cart.userId ?? null,
    items,
    subtotal: items.reduce((sum, item) => sum + item.subtotal, 0),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export async function resolveUserDbId(clerkId?: string | null) {
  if (!clerkId) return null;
  const existing = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.user.create({ data: { clerkId }, select: { id: true } });
  return created.id;
}

export async function findOrCreateCart(clerkId?: string | null) {
  const userId = await resolveUserDbId(clerkId);
  if (userId) {
    const existing = await prisma.cart.findFirst({ where: { userId }, include: cartInclude });
    if (existing) return existing;
    return prisma.cart.create({ data: { userId }, include: cartInclude });
  }
  const token = await ensureGuestCartToken();
  const existing = await prisma.cart.findFirst({ where: { token }, include: cartInclude });
  if (existing) return existing;
  return prisma.cart.create({ data: { token }, include: cartInclude });
}

export async function getResolvedCart(clerkId?: string | null) {
  const cart = await findOrCreateCart(clerkId);
  return normalizeCart(cart);
}

export async function validateVariantForCart(variantId: string) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true, inventory: true },
  });
  if (!variant || variant.product.deletedAt || !variant.product.isPublished) return null;
  return variant;
}

export function assertQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('INVALID_QUANTITY');
}

export function assertStock(quantityOnHand: number, quantity: number) {
  if (quantity > quantityOnHand) throw new Error('INSUFFICIENT_STOCK');
}

export async function mergeGuestCartIntoUserCart(guestToken: string, clerkId: string) {
  const userId = await resolveUserDbId(clerkId);
  if (!userId) return null;

  return prisma.$transaction(async (tx) => {
    const guestCart = await tx.cart.findFirst({
      where: { token: guestToken },
      include: cartInclude,
    });
    if (!guestCart) return null;

    const targetCart = (await tx.cart.findFirst({ where: { userId }, include: cartInclude })) ??
      (await tx.cart.create({ data: { userId }, include: cartInclude }));

    for (const item of guestCart.items) {
      const current = await tx.cartItem.findFirst({
        where: { cartId: targetCart.id, variantId: item.variantId },
        select: { id: true, quantity: true },
      });
      const available = item.variant.inventory?.quantityOnHand ?? 0;
      const mergedQty = Math.min((current?.quantity ?? 0) + item.quantity, available);
      if (mergedQty <= 0) continue;
      if (current) await tx.cartItem.update({ where: { id: current.id }, data: { quantity: mergedQty } });
      else await tx.cartItem.create({ data: { cartId: targetCart.id, variantId: item.variantId, quantity: mergedQty } });
    }

    await tx.cart.delete({ where: { id: guestCart.id } });
    return targetCart;
  });
}
