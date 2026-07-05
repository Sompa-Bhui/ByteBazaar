import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyRazorpaySignature } from '@/lib/razorpay';
import { upsertUserFromClerk } from '@/lib/clerk';

const schema = z.object({
  orderId: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(req: Request) {
  const auth = getAuth(req as Parameters<typeof getAuth>[0]);
  if (!auth.userId) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  const dbUser = await upsertUserFromClerk(auth.userId);
  if (!dbUser) return NextResponse.json({ ok: false, error: 'Unable to resolve user' }, { status: 500 });
  const body = schema.parse(await req.json());

  const order = await prisma.order.findFirst({
    where: { id: body.orderId, userId: dbUser.id },
    include: { payments: true },
  });
  if (!order) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });

  const payment = order.payments.find((item) => item.provider === 'razorpay' && item.providerOrderId === body.razorpay_order_id);
  if (!payment) return NextResponse.json({ ok: false, error: 'Payment not found' }, { status: 404 });
  if (payment.status === 'SUCCEEDED') {
    return NextResponse.json({ ok: true, data: { orderId: order.id, paymentId: payment.id, paid: true } });
  }

  const verified = verifyRazorpaySignature({
    orderId: body.razorpay_order_id,
    paymentId: body.razorpay_payment_id,
    signature: body.razorpay_signature,
  });
  if (!verified) return NextResponse.json({ ok: false, error: 'Payment verification failed' }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        providerId: body.razorpay_payment_id,
        status: 'SUCCEEDED',
        verifiedAt: new Date(),
        failureReason: null,
      },
    });
    if (order.status === 'PENDING') {
      await tx.order.update({ where: { id: order.id }, data: { status: 'PROCESSING' } });
    }
  });

  return NextResponse.json({ ok: true, data: { orderId: order.id, paymentId: body.razorpay_payment_id, paid: true } });
}

