import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, context: { params: Promise<Record<string, string>> }) {
  const { id } = await context.params;
  const product = await prisma.product.findUnique({ where: { id }, include: { variants: true, images: true, categories: true } });
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(req: Request, context: { params: Promise<Record<string, string>> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { title, slug, shortDesc, description, price, brandId, isPublished } = body as { title?: string; slug?: string; shortDesc?: string; description?: string; price?: number; brandId?: string; isPublished?: boolean };
    const updated = await prisma.product.update({ where: { id }, data: { title, slug, shortDesc, description, price, brandId, isPublished } });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg || 'failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<Record<string, string>> }) {
  try {
    const { id } = await context.params;
    await prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg || 'failed' }, { status: 500 });
  }
}
