import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getRazorpayClient, hasRazorpayConfig, RazorpayConfigError } from '@/lib/razorpay';
import { upsertUserFromClerk } from '@/lib/clerk';

const schema = z.object({
  orderId: z.string().min(1),
});

export async function POST(req: Request) {
  const auth = getAuth(req as Parameters<typeof getAuth>[0]);
  if (!auth.userId) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  if (!hasRazorpayConfig()) return NextResponse.json({ ok: false, error: 'Payment gateway is not configured' }, { status: 503 });
  const dbUser = await upsertUserFromClerk(auth.userId);
  if (!dbUser) return NextResponse.json({ ok: false, error: 'Unable to resolve user' }, { status: 500 });
  const body = schema.parse(await req.json());

  const order = await prisma.order.findFirst({
    where: { id: body.orderId, userId: dbUser.id, deletedAt: null },
    include: { payments: true },
  });
  if (!order) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
  if (order.status === 'CANCELLED') return NextResponse.json({ ok: false, error: 'Order cannot be paid' }, { status: 409 });
  if (order.payments.some((payment) => payment.status === 'SUCCEEDED')) {
    return NextResponse.json({ ok: false, error: 'Order is already paid' }, { status: 409 });
  }

  const amount = order.total;
  const currency = order.currency;
  try {
    const razorpay = getRazorpayClient();
    const providerOrder = await razorpay.orders.create({
      amount,
      currency,
      receipt: order.id,
      payment_capture: true,
      notes: { bytebazaarOrderId: order.id, userId: dbUser.id },
    });
    const payment = await prisma.payment.upsert({
      where: { providerOrderId: providerOrder.id },
      create: {
        orderId: order.id,
        userId: dbUser.id,
        provider: 'razorpay',
        providerOrderId: providerOrder.id,
        providerId: providerOrder.id,
        amount,
        currency,
        status: 'PENDING',
        metadata: providerOrder as unknown as Prisma.JsonObject,
      },
      update: {
        amount,
        currency,
        status: 'PENDING',
        metadata: providerOrder as unknown as Prisma.JsonObject,
      },
    });
    return NextResponse.json({
      ok: true,
      data: {
        orderId: order.id,
        providerOrderId: providerOrder.id,
        amount: providerOrder.amount,
        currency: providerOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID ?? '',
        paymentId: payment.id,
      },
    });
  } catch (error) {
    if (error instanceof RazorpayConfigError) return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
    return NextResponse.json({ ok: false, error: 'Unable to create payment order' }, { status: 500 });
  }
}
