import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { variantId, quantityOnHand, safetyStock, location } = body as { variantId?: string; quantityOnHand?: number; safetyStock?: number; location?: string };
    if (!variantId) return NextResponse.json({ error: 'Missing' }, { status: 400 });

    const existing = await prisma.inventory.findUnique({ where: { variantId } });
    if (existing) {
      const updated = await prisma.inventory.update({ where: { variantId }, data: { quantityOnHand, safetyStock, location } });
      return NextResponse.json(updated);
    } else {
      const created = await prisma.inventory.create({ data: { variantId, sku: null, quantityOnHand: quantityOnHand ?? 0, safetyStock: safetyStock ?? 0, location } });
      return NextResponse.json(created);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg || 'failed' }, { status: 500 });
  }
}
