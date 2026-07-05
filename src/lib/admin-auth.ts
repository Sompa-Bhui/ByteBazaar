import { clerkClient, getAuth } from '@clerk/nextjs/server';

export async function getAdminUserId(req: Request) {
  const auth = getAuth(req as Parameters<typeof getAuth>[0]);
  if (!auth.userId || !process.env.CLERK_SECRET_KEY) return null;
  const client = await clerkClient();
  const user = await client.users.getUser(auth.userId).catch(() => null);
  const role = user && typeof user.publicMetadata === 'object' && user.publicMetadata ? (user.publicMetadata as Record<string, unknown>).role : null;
  return role === 'ADMIN' ? auth.userId : null;
}

