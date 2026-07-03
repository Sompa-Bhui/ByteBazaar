import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const ProductCreateSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2),
  shortDesc: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  price: z.number().min(0),
  brandId: z.string().nullable().optional(),
  isPublished: z.boolean().optional(),
  categoryIds: z.array(z.string()).optional(),
  variants: z.array(z.object({ title: z.string(), sku: z.string().optional(), price: z.number().optional() })).optional(),
  images: z.array(z.object({ url: z.string(), altText: z.string().optional() })).optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = ProductCreateSchema.parse(body);

    const product = await prisma.product.create({
      data: {
        title: parsed.title,
        slug: parsed.slug,
        shortDesc: parsed.shortDesc ?? undefined,
        description: parsed.description ?? undefined,
        price: parsed.price,
        brandId: parsed.brandId ?? undefined,
        isPublished: parsed.isPublished ?? false
      }
    });

    if (parsed.variants && parsed.variants.length > 0) {
      for (const v of parsed.variants) {
        await prisma.productVariant.create({ data: { productId: product.id, title: v.title, sku: v.sku, price: v.price ?? parsed.price } });
      }
    }

    if (parsed.images && parsed.images.length > 0) {
      for (const img of parsed.images) {
        await prisma.productImage.create({ data: { productId: product.id, url: img.url, altText: img.altText } });
      }
    }

    if (parsed.categoryIds && parsed.categoryIds.length > 0) {
      for (const cid of parsed.categoryIds) {
        await prisma.productCategory.create({ data: { productId: product.id, categoryId: cid } });
      }
    }

    return NextResponse.json({ ok: true, id: product.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg || 'Invalid request' }, { status: 400 });
  }
}
