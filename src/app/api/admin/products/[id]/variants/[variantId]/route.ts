import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  price: z.number().int().nonnegative().optional(),
  sku: z.string().optional(),
  attributes: z.record(z.unknown()).optional(),
  images: z.array(z.object({ url: z.string(), altText: z.string().optional() })).optional(),
  inventory: z.object({ quantityOnHand: z.number().int().nonnegative().optional(), safetyStock: z.number().int().nonnegative().optional(), location: z.string().optional() }).optional(),
});

export async function GET(req: Request, context: { params: Promise<Record<string, string>> }) {
  const params = await context.params;
  const v = await prisma.productVariant.findUnique({ where: { id: params.variantId }, include: { inventory: true, product: true, images: true } });
  if (!v) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(v);
}

export async function PATCH(req: Request, context: { params: Promise<Record<string, string>> }) {
  try {
    const parsed = patchSchema.parse(await req.json());
    const { title, price, sku, attributes, images, inventory } = parsed;
    const { variantId: id } = await context.params;

    // If SKU provided, ensure unique
    if (sku) {
      const exists = await prisma.productVariant.findUnique({ where: { sku } });
      if (exists && exists.id !== id) return NextResponse.json({ error: 'SKU already exists' }, { status: 400 });
    }

    const updated = await prisma.productVariant.update({ where: { id }, data: { title, price, sku, attributes: attributes as never } });

    if (inventory) {
      const inv = await prisma.inventory.findUnique({ where: { variantId: id } });
      if (inv) {
        await prisma.inventory.update({ where: { variantId: id }, data: { quantityOnHand: inventory.quantityOnHand ?? inv.quantityOnHand, safetyStock: inventory.safetyStock ?? inv.safetyStock, location: inventory.location ?? inv.location } });
      } else {
        await prisma.inventory.create({ data: { variantId: id, sku: sku ?? undefined, quantityOnHand: inventory.quantityOnHand ?? 0, safetyStock: inventory.safetyStock ?? 0, location: inventory.location } });
      }
    }

    if (images) {
      // attach provided images to variant
      await prisma.productImage.updateMany({ where: { url: { in: images.map((i) => i.url) } }, data: { variantId: id } });
    }

    return NextResponse.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg || 'failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<Record<string, string>> }) {
  try {
    const { variantId: id } = await context.params;
    // delete inventory
    await prisma.inventory.deleteMany({ where: { variantId: id } });
    // detach images
    await prisma.productImage.updateMany({ where: { variantId: id }, data: { variantId: null } });
    // delete variant
    await prisma.productVariant.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg || 'failed' }, { status: 500 });
  }
}
