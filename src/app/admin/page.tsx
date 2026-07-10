import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [totalOrders, paidOrders, activeOrders, recentOrders, revenue] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { payments: { some: { status: 'SUCCEEDED' } } } }),
    prisma.order.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } }),
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { user: true, payments: { orderBy: { createdAt: 'desc' }, take: 1 } } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { payments: { some: { status: 'SUCCEEDED' } } } }),
  ]);
  const typedRecentOrders = recentOrders as Array<{
    id: string;
    userId: string;
    total: number;
    status: string;
    user: { name: string | null; email: string | null };
  }>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="mt-4 text-sm text-muted-foreground">Overview and quick actions</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Total orders" value={totalOrders} />
        <Stat label="Pending / processing" value={activeOrders} />
        <Stat label="Paid orders" value={paidOrders} />
        <Stat label="Revenue" value={`₹${((revenue._sum.total ?? 0) / 100).toFixed(2)}`} />
      </div>
      <section className="rounded-3xl border bg-white p-6">
        <h2 className="text-lg font-semibold">Recent orders</h2>
        <div className="mt-4 space-y-3">
          {typedRecentOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between rounded-2xl border p-4">
              <div>
                <div className="font-medium">{order.id}</div>
                <div className="text-sm text-slate-500">{order.user.name ?? order.user.email ?? order.userId}</div>
              </div>
              <div className="text-sm text-slate-500">{order.status} · ₹{(order.total / 100).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border bg-white p-6">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
