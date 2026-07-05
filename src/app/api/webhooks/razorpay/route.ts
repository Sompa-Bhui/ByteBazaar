import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: 'Webhook not configured' }, { status: 503 });

  const signature = req.headers.get('x-razorpay-signature');
  if (!signature) return NextResponse.json({ ok: false, error: 'Missing signature' }, { status: 400 });

  const rawBody = await req.text();
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const isValid = Buffer.from(signature, 'utf8').length === Buffer.from(expected, 'utf8').length &&
    crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
  if (!isValid) return NextResponse.json({ ok: false }, { status: 400 });

  const event = JSON.parse(rawBody) as { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; status?: string; amount?: number; currency?: string } } } };
  const payment = event.payload?.payment?.entity;
  if (!payment?.id || !payment.order_id) return NextResponse.json({ ok: true });

  const localPayment = await prisma.payment.findFirst({ where: { provider: 'razorpay', providerOrderId: payment.order_id } });
  if (!localPayment) return NextResponse.json({ ok: true });
  if (localPayment.status === 'SUCCEEDED') return NextResponse.json({ ok: true });

  if (payment.status === 'captured' || payment.status === 'authorized') {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: localPayment.id },
        data: { providerId: payment.id, status: 'SUCCEEDED', verifiedAt: new Date(), failureReason: null },
      });
      await tx.order.update({ where: { id: localPayment.orderId ?? '' }, data: { status: 'PROCESSING' } }).catch(() => null);
    });
  }

  return NextResponse.json({ ok: true });
}

