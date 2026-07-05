import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getAdminUserId } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { AdminOrderActions } from '@/components/AdminOrderActions';

export const dynamic = 'force-dynamic';

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const adminId = await getAdminUserId({ headers: headers() } as never);
  if (!adminId) redirect('/sign-in');
  const { orderId } = await params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, items: true, payments: { orderBy: { createdAt: 'desc' } }, shippingAddress: true, billingAddress: true },
  });
  if (!order) notFound();
  const latestPayment = order.payments[0] ?? null;
  const validStatuses = order.status === 'PENDING' ? ['PROCESSING', 'CANCELLED'] : order.status === 'PROCESSING' ? ['FULFILLED', 'CANCELLED'] : [];

  return (
    <main className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Order {order.id}</h1>
          <p className="text-sm text-slate-500">Updated {order.updatedAt.toLocaleString()}</p>
        </div>
        <Link href="/admin/orders" className="rounded-full border px-4 py-2 text-sm">Back</Link>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border bg-white p-6">
          <h2 className="font-semibold">Order summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div>Status: {order.status}</div>
            <div>Payment: {latestPayment?.status ?? 'PENDING'}</div>
            <div>Total: ₹{(order.total / 100).toFixed(2)}</div>
            <div>Created: {order.createdAt.toLocaleString()}</div>
            <div>Updated: {order.updatedAt.toLocaleString()}</div>
          </div>
        </div>
        <div className="rounded-3xl border bg-white p-6">
          <h2 className="font-semibold">Customer</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div>{order.user.name ?? 'Unnamed'}</div>
            <div>{order.user.email ?? '-'}</div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-6">
        <h2 className="font-semibold">Shipping address</h2>
        <div className="mt-4 text-sm">
          <div className="font-medium">{order.shippingAddress?.fullName}</div>
          <div>{order.shippingAddress?.line1}{order.shippingAddress?.line2 ? `, ${order.shippingAddress.line2}` : ''}</div>
          <div>{order.shippingAddress?.city}, {order.shippingAddress?.state ?? ''} {order.shippingAddress?.postalCode}</div>
          <div>{order.shippingAddress?.country}</div>
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-6">
        <h2 className="font-semibold">Items</h2>
        <div className="mt-4 space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="text-sm text-slate-500">SKU {item.sku ?? '-' } · Qty {item.quantity} · ₹{(item.unitPrice / 100).toFixed(2)}</div>
              </div>
              <div>₹{(item.totalPrice / 100).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-6">
        <h2 className="font-semibold">Actions</h2>
        <div className="mt-4">
          <AdminOrderActions orderId={order.id} currentStatus={order.status} />
          {validStatuses.length ? <div className="mt-2 text-xs text-slate-500">Valid next actions: {validStatuses.join(', ')}</div> : <div className="mt-2 text-xs text-slate-500">No further fulfillment actions available.</div>}
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-6">
        <h2 className="font-semibold">Payment identifiers</h2>
        <div className="mt-4 space-y-2 text-sm">
          {latestPayment ? (
            <>
              <div>Provider: {latestPayment.provider}</div>
              <div>Provider order id: {latestPayment.providerOrderId ?? '-'}</div>
              <div>Provider payment id: {latestPayment.providerId ?? '-'}</div>
            </>
          ) : <div>No payment record yet.</div>}
        </div>
      </section>
    </main>
  );
}

