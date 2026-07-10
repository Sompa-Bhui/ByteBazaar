import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { generateSKU } from '@/lib/sku';

const bodySchema = z.object({
  title: z.string().min(1),
  price: z.number().int().nonnegative(),
  sku: z.string().optional(),
  attributes: z.record(z.unknown()).optional(),
  images: z.array(z.object({ url: z.string(), altText: z.string().optional() })).optional(),
  inventory: z.object({ quantityOnHand: z.number().int().nonnegative().optional(), safetyStock: z.number().int().nonnegative().optional(), location: z.string().optional() }).optional(),
});

export async function POST(req: Request, context: { params: Promise<Record<string, string>> }) {
  try {
    const { id: productId } = await context.params;
    const parsed = bodySchema.parse(await req.json());
    const { title, price, sku, attributes, images, inventory } = parsed;

    let finalSku = sku;
    if (!finalSku) {
      // attempt to generate a unique SKU
      for (let i = 0; i < 5; i++) {
        const candidate = generateSKU(title, productId.slice(0, 4));
        const exists = await prisma.productVariant.findUnique({ where: { sku: candidate } });
        if (!exists) { finalSku = candidate; break; }
      }
      if (!finalSku) finalSku = generateSKU(title);
    } else {
      // ensure uniqueness
      const exists = await prisma.productVariant.findUnique({ where: { sku: finalSku } });
      if (exists) return NextResponse.json({ error: 'SKU already exists' }, { status: 400 });
    }

    const created = await prisma.productVariant.create({
      data: {
        productId,
        title,
        price,
        sku: finalSku,
        attributes: attributes ? (attributes as never) : undefined,
        inventory: inventory ? { create: { quantityOnHand: inventory.quantityOnHand ?? 0, safetyStock: inventory.safetyStock ?? 0, location: inventory.location } } : undefined,
        images: images ? { create: images.map((img, idx: number) => ({ url: img.url, altText: img.altText, position: idx, productId })) } : undefined,
      },
      include: { inventory: true },
    });

    // If images were provided, link them to the variant by updating variantId
    if (images && images.length) {
      await prisma.productImage.updateMany({ where: { productId, url: { in: images.map((i) => i.url) } }, data: { variantId: created.id } });
    }

    return NextResponse.json(created);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg || 'failed' }, { status: 500 });
  }
}
