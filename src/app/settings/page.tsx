import { getAuth } from '@clerk/nextjs/server';
import { headers, cookies } from 'next/headers';
import { upsertUserFromClerk } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import SettingsClient from '@/components/SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  let userId: string | null = null;
  try {
    const auth = getAuth({ headers: headers(), cookies: cookies() } as unknown as Parameters<typeof getAuth>[0]);
    userId = auth.userId ?? null;
  } catch {
    return redirect('/sign-in');
  }
  if (!userId) redirect('/sign-in');

  const dbUser = await upsertUserFromClerk(userId);
  if (!dbUser) redirect('/sign-in');

  return <SettingsClient user={dbUser} />;
}
