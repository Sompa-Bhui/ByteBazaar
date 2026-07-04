import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, context: { params: Promise<Record<string, string>> }) {
  const { productId } = await context.params;
  const images = await prisma.productImage.findMany({ where: { productId }, orderBy: { position: 'asc' } });
  return NextResponse.json(images);
}

export async function POST(req: Request, context: { params: Promise<Record<string, string>> }) {
  try {
    const { productId } = await context.params;
    const body = await req.json();
    type IncomingImage = { url: string; publicId?: string; altText?: string; variantId?: string };
    const images: IncomingImage[] = body.images || [];

    // determine next position
    const maxPos = await prisma.productImage.findFirst({ where: { productId }, orderBy: { position: 'desc' } });
    let pos = (maxPos?.position ?? -1) + 1;

    const created: Array<Record<string, unknown>> = [];
    for (const img of images) {
      const rec = await prisma.productImage.create({ data: { productId, variantId: img.variantId ?? undefined, url: img.url, altText: img.altText ?? undefined, position: pos++, publicId: img.publicId ?? undefined } });
      created.push(rec as unknown as Record<string, unknown>);
    }

    return NextResponse.json(created);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg || 'failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  // used for reorder: body = { order: [id1, id2, ...] }
  try {
    const body = await req.json();
    const order: string[] = body.order || [];
    await Promise.all(order.map((id, idx) => prisma.productImage.update({ where: { id }, data: { position: idx } })));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg || 'failed' }, { status: 500 });
  }
}
