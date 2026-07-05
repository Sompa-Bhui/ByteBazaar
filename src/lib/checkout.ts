import type { Address, Order, OrderItem, Prisma } from '@prisma/client';
import { prisma } from './prisma';

export type CheckoutCartItem = {
  id: string;
  variantId: string;
  quantity: number;
  product: { id: string; title: string; slug: string; price: number; image: string | null };
  variant: { id: string; title: string; price: number; sku: string | null };
};

export type CheckoutPreviewResponse = {
  requiresAuth: boolean;
  cartId: string | null;
  items: CheckoutCartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  itemCount: number;
  addresses: Address[];
  selectedAddressId: string | null;
};

export type AddressPayload = {
  label?: string | null;
  isDefault?: boolean;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
};

const cartInclude = {
  items: {
    include: {
      variant: {
        include: {
          inventory: true,
          product: { include: { images: { orderBy: { position: 'asc' } } } },
        },
      },
    },
    orderBy: { addedAt: 'asc' },
  },
} satisfies Prisma.CartInclude;

export async function resolveCheckoutCart(userId: string | null, guestToken: string | null) {
  if (!userId) return prisma.cart.findFirst({ where: { token: guestToken }, include: cartInclude });
  return prisma.cart.findFirst({ where: { userId }, include: cartInclude });
}

export function shippingForSubtotal(subtotal: number) {
  return subtotal > 50000 ? 0 : subtotal > 0 ? 499 : 0;
}

export function taxForSubtotal(subtotal: number) {
  return Math.round(subtotal * 0.05);
}

export async function listOwnedAddresses(userId: string) {
  return prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] });
}

export async function setDefaultAddress(tx: Prisma.TransactionClient, userId: string, addressId: string) {
  await tx.address.updateMany({ where: { userId, id: { not: addressId } }, data: { isDefault: false } });
  await tx.address.update({ where: { id: addressId }, data: { isDefault: true } });
}

export async function normalizeOrder(order: Order & { items: OrderItem[]; shippingAddress: Address | null; billingAddress: Address | null }) {
  return {
    id: order.id,
    status: order.status,
    total: order.total,
    subtotal: order.subtotal,
    shipping: order.shipping,
    tax: order.tax,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      id: item.id,
      title: item.title,
      sku: item.sku,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      totalPrice: item.totalPrice,
      variantId: item.variantId,
    })),
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
  };
}
