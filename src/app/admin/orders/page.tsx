import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminUserId } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const adminId = await getAdminUserId({ headers: headers() } as never);
  if (!adminId) redirect('/sign-in');
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const where: Record<string, unknown> = {};
  if (params.orderStatus) where.status = params.orderStatus;
  if (params.paymentStatus) where.payments = { some: { status: params.paymentStatus } };
  if (params.q) where.OR = [{ id: { contains: params.q, mode: 'insensitive' } }, { user: { email: { contains: params.q, mode: 'insensitive' } } }];
  const orders = await prisma.order.findMany({
    where,
    include: { user: true, items: true, payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { createdAt: params.sort === 'oldest' ? 'asc' : 'desc' },
    skip: (page - 1) * 20,
    take: 20,
  });
  const total = await prisma.order.count({ where });
  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-slate-500">{total} orders</p>
        </div>
        <form className="flex gap-2">
          <input name="q" placeholder="Search orders or customer" defaultValue={params.q} className="rounded-full border px-4 py-2" />
          <button className="rounded-full bg-slate-950 px-4 py-2 text-white">Search</button>
        </form>
      </div>
      <div className="overflow-hidden rounded-3xl border bg-white">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-sm text-slate-500">
            <tr>
              <th className="p-4">Order</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Date</th>
              <th className="p-4">Items</th>
              <th className="p-4">Total</th>
              <th className="p-4">Order Status</th>
              <th className="p-4">Payment Status</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t">
                <td className="p-4">{order.id}</td>
                <td className="p-4">{order.user.name ?? order.user.email ?? order.userId}</td>
                <td className="p-4">{order.createdAt.toLocaleDateString()}</td>
                <td className="p-4">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                <td className="p-4">₹{(order.total / 100).toFixed(2)}</td>
                <td className="p-4">{order.status}</td>
                <td className="p-4">{order.payments[0]?.status ?? 'PENDING'}</td>
                <td className="p-4"><Link href={`/admin/orders/${order.id}`} className="text-blue-600">View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!orders.length ? <div className="p-8 text-center text-slate-500">No orders found.</div> : null}
      </div>
    </main>
  );
}

