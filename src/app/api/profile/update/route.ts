import { NextResponse } from 'next/server';
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    let userId: string | null = null;
    try {
      const auth = getAuth(req as Parameters<typeof getAuth>[0]);
      userId = auth.userId ?? null;
    } catch {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json();
    const { bio, avatarUrl } = body;

    // Update Prisma
    await prisma.user.updateMany({ where: { clerkId: userId }, data: { bio, avatarUrl } });

    // Update Clerk public profile (profileImageUrl cannot be set here in all plans)
    try {
      const updates: Record<string, unknown> = {};
      if (avatarUrl) updates.profileImageUrl = avatarUrl;
      if (Object.keys(updates).length > 0) {
        const client = await clerkClient();
        await client.users.updateUser(userId, updates as unknown as Record<string, unknown>);
      }
    } catch {
      // ignore clerk update failures
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg || 'Update failed' }, { status: 500 });
  }
}
