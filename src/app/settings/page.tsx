import { getAuth } from '@clerk/nextjs/server';
import { headers, cookies } from 'next/headers';
import { upsertUserFromClerk } from '@/lib/clerk';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SettingsClient from '@/components/SettingsClient';

export default async function SettingsPage() {
  let userId: string | null = null;
  try {
    const auth = getAuth({ headers: headers(), cookies: cookies() } as unknown as Request);
    userId = auth.userId ?? null;
  } catch (e) {
    return redirect('/sign-in');
  }
  if (!userId) redirect('/sign-in');

  const dbUser = await upsertUserFromClerk(userId);

  return <SettingsClient user={dbUser} />;
}
