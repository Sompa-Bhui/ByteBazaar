import { getAuth } from '@clerk/nextjs/server';
import { headers, cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { upsertUserFromClerk } from '@/lib/clerk';
import { prisma } from '@/lib/prisma';

export default async function ProfilePage() {
  let userId: string | null = null;
  try {
    const auth = getAuth({ headers: headers(), cookies: cookies() } as unknown as Parameters<typeof getAuth>[0]);
    userId = auth.userId ?? null;
  } catch {
    return redirect('/sign-in');
  }
  if (!userId) redirect('/sign-in');

  const dbUser = await upsertUserFromClerk(userId);
  const orders = await prisma.order.findMany({ where: { userId: dbUser?.id ?? '' } });

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <div className="mt-6">
          <div className="flex items-center gap-4">
            <img src={dbUser?.avatarUrl ?? '/placeholder-avatar.png'} alt="avatar" className="h-20 w-20 rounded-full" />
            <div>
              <div className="text-lg font-medium">{dbUser?.name ?? dbUser?.email}</div>
              <div className="text-sm text-muted-foreground">{dbUser?.email}</div>
            </div>
          </div>
          <section className="mt-8">
            <h2 className="font-medium">Orders</h2>
            <div className="mt-4">
              {orders.length === 0 ? (
                <div className="text-sm text-muted-foreground">You have no orders yet.</div>
              ) : (
                <ul>
                  {orders.map((o) => (
                    <li key={o.id} className="border-b py-2">
                      Order {o.id} - Total: ₹{o.total}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
