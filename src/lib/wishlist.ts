import { prisma } from './prisma';

export async function resolveWishlistUserId(clerkId?: string | null) {
  if (!clerkId) return null;
  const existing = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.user.create({ data: { clerkId }, select: { id: true } });
  return created.id;
}

export async function getOrCreateWishlist(userId: string) {
  const include = {
    items: {
      include: {
        variant: { include: { product: { include: { images: { orderBy: { position: 'asc' } } } } } },
      },
      orderBy: { createdAt: 'asc' },
    },
  } as const;
  const existing = await prisma.wishlist.findFirst({ where: { userId }, include });
  if (existing) return existing;
  return prisma.wishlist.create({ data: { userId }, include });
}
