import Link from 'next/link';
import { getAuth } from '@clerk/nextjs/server';
import { headers, cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { upsertUserFromClerk } from '@/lib/clerk';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const auth = getAuth({ headers: headers(), cookies: cookies() } as never);
  if (!auth.userId) redirect('/sign-in');
  const dbUser = await upsertUserFromClerk(auth.userId);
  const orders = await prisma.order.findMany({ where: { userId: dbUser?.id ?? '' }, orderBy: { createdAt: 'desc' } });
  return <main className="container mx-auto py-16">
    <h1 className="mb-8 text-3xl font-semibold">Orders</h1>
    <div className="space-y-4">
      {orders.length ? orders.map((o) => <div key={o.id} className="rounded-3xl border p-5 flex items-center justify-between">
        <div>
          <div className="font-medium">{o.id}</div>
          <div className="text-sm text-slate-500">{o.status} · ₹{(o.total/100).toFixed(2)}</div>
        </div>
        <Link href={`/orders/${o.id}`} className="rounded-full border px-4 py-2 text-sm">View details</Link>
      </div>) : <div className="rounded-3xl border border-dashed p-10 text-center text-slate-500">No orders yet.</div>}
    </div>
  </main>;
}

