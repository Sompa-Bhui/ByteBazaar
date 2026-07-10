import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getAdminUserId } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminCouponsPage() {
  const adminId = await getAdminUserId({ headers: headers() } as never);
  if (!adminId) redirect('/sign-in');
  const coupons = (await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })) as Array<{
    id: string;
    code: string;
    discountType: string;
    amount: number;
    startsAt: Date | null;
    expiresAt: Date | null;
    usedCount: number;
    usageLimit: number | null;
    active: boolean;
  }>;
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Coupons</h1>
        <p className="text-sm text-slate-500">Create, edit, activate, and deactivate coupons.</p>
      </div>
      <div className="rounded-3xl border bg-white p-6">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input name="code" placeholder="Code" className="rounded-full border px-4 py-2" />
          <select name="discountType" className="rounded-full border px-4 py-2">
            <option value="PERCENT">Percent</option>
            <option value="AMOUNT">Amount</option>
          </select>
          <input name="amount" type="number" placeholder="Amount" className="rounded-full border px-4 py-2" />
          <button className="rounded-full bg-slate-950 px-4 py-2 text-white">Create coupon</button>
        </form>
      </div>
      <div className="overflow-hidden rounded-3xl border bg-white">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-sm text-slate-500">
            <tr>
              <th className="p-4">Code</th>
              <th className="p-4">Type</th>
              <th className="p-4">Value</th>
              <th className="p-4">Valid</th>
              <th className="p-4">Usage</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="border-t">
                <td className="p-4">{coupon.code}</td>
                <td className="p-4">{coupon.discountType}</td>
                <td className="p-4">{coupon.amount}</td>
                <td className="p-4">{coupon.startsAt ? coupon.startsAt.toLocaleDateString() : '-'} - {coupon.expiresAt ? coupon.expiresAt.toLocaleDateString() : '-'}</td>
                <td className="p-4">{coupon.usedCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}</td>
                <td className="p-4">{coupon.active ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
