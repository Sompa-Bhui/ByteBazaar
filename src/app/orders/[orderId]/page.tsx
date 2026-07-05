import { getAuth } from '@clerk/nextjs/server';
import { headers, cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { upsertUserFromClerk } from '@/lib/clerk';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const auth = getAuth({ headers: headers(), cookies: cookies() } as never);
  if (!auth.userId) redirect('/sign-in');
  const dbUser = await upsertUserFromClerk(auth.userId);
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: dbUser?.id ?? '' },
    include: { items: true, shippingAddress: true, billingAddress: true, payments: { orderBy: { createdAt: 'desc' } } },
  });
  if (!order) notFound();
  const latestPayment = order.payments[0] ?? null;
  const canRetry = Boolean(latestPayment && latestPayment.status !== 'SUCCEEDED' && order.status !== 'CANCELLED');

  return (
    <main className="container mx-auto py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-semibold">Order {order.id}</h1>
          <p className="text-slate-500">Placed on {order.createdAt.toLocaleDateString()}</p>
        </div>
        {canRetry ? (
          <RetryPaymentButton orderId={order.id} />
        ) : null}
      </div>

      <section className="mt-8 rounded-3xl border p-6">
        <h2 className="mb-4 text-xl font-semibold">Payment</h2>
        <div className="space-y-2 text-sm">
          <div>Status: {latestPayment?.status ?? 'PENDING'}</div>
          <div>Provider: {latestPayment?.provider ?? 'razorpay'}</div>
          <div>Amount: ₹{(order.total / 100).toFixed(2)}</div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border p-6">
        <h2 className="mb-4 text-xl font-semibold">Items</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-4">
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="text-sm text-slate-500">Qty {item.quantity}{item.sku ? ` · SKU ${item.sku}` : ''}</div>
              </div>
              <div>₹{(item.totalPrice / 100).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border p-6">
        <h2 className="mb-4 text-xl font-semibold">Summary</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>₹{(order.subtotal / 100).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>₹{(order.shipping / 100).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>₹{(order.tax / 100).toFixed(2)}</span></div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span>₹{(order.total / 100).toFixed(2)}</span></div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border p-6">
        <h2 className="mb-4 text-xl font-semibold">Shipping address</h2>
        <div className="text-sm text-slate-700">
          <div className="font-medium">{order.shippingAddress?.fullName}</div>
          <div>{order.shippingAddress?.line1}{order.shippingAddress?.line2 ? `, ${order.shippingAddress.line2}` : ''}</div>
          <div>{order.shippingAddress?.city}, {order.shippingAddress?.state ?? ''} {order.shippingAddress?.postalCode}</div>
          <div>{order.shippingAddress?.country}</div>
        </div>
      </section>

      <div className="mt-6">
        <Link href="/orders" className="rounded-full border px-4 py-2 text-sm">Back to orders</Link>
      </div>
    </main>
  );
}

function RetryPaymentButton({ orderId }: { orderId: string }) {
  return (
    <Link href={`/checkout?orderId=${orderId}`} className="rounded-full bg-slate-950 px-4 py-2 text-sm text-white">
      Retry payment
    </Link>
  );
}

