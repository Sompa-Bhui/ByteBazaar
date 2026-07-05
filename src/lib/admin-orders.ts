import type { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';

export function isAdminRole(role?: string | null) {
  return role === 'ADMIN';
}

export function canTransitionOrderStatus(current: OrderStatus, next: OrderStatus) {
  if (current === next) return true;
  if (current === 'PENDING') return next === 'PROCESSING' || next === 'CANCELLED';
  if (current === 'PROCESSING') return next === 'FULFILLED' || next === 'CANCELLED';
  return false;
}

export function orderPaid(paymentStatus?: PaymentStatus | null) {
  return paymentStatus === 'SUCCEEDED';
}

export type AdminOrderFilters = {
  q?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  sort?: 'newest' | 'oldest';
  page?: number;
};

export function buildAdminOrderWhere(filters: AdminOrderFilters): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  if (filters.orderStatus) where.status = filters.orderStatus;
  if (filters.paymentStatus) where.payments = { some: { status: filters.paymentStatus } };
  if (filters.q) {
    where.OR = [
      { id: { contains: filters.q, mode: 'insensitive' } },
      { user: { email: { contains: filters.q, mode: 'insensitive' } } },
      { user: { name: { contains: filters.q, mode: 'insensitive' } } },
    ];
  }
  return where;
}

