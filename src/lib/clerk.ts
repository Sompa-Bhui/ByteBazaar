import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from './prisma';

export async function upsertUserFromClerk(userId: string) {
  const client = await clerkClient();
  const user = await client.users.getUser(userId).catch(() => null);
  if (!user) return null;

  const email = user.emailAddresses?.[0]?.emailAddress ?? '';
  const name = user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.fullName || undefined;
  const u = user as unknown as Record<string, unknown>;
  const avatarUrl = (u['profileImageUrl'] as string | undefined) ?? (u['imageUrl'] as string | undefined) ?? (u['profile_image_url'] as string | undefined) ?? undefined;

  const dbUser = await prisma.user.upsert({
    where: { clerkId: user.id },
    create: {
      clerkId: user.id,
      email: email,
      name: name,
      avatarUrl: avatarUrl
    },
    update: {
      email: email,
      name: name,
      avatarUrl: avatarUrl
    }
  });

  // Sync role from Clerk public metadata if available
  try {
    const publicMetadata = (u['publicMetadata'] as Record<string, unknown> | undefined) ?? undefined;
    const role = publicMetadata?.role as string | undefined;
    if (role && (role === 'ADMIN' || role === 'CUSTOMER')) {
      await prisma.user.update({ where: { id: dbUser.id }, data: { role } }).catch(() => null);
    }
  } catch {
    // ignore
  }

  return dbUser;
}
