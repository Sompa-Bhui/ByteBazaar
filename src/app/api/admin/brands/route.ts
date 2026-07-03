import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(brands);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, slug, website } = body as { name?: string; slug?: string; website?: string };
    if (!name || !slug) return NextResponse.json({ error: 'Missing' }, { status: 400 });
    const brand = await prisma.brand.create({ data: { name, slug, website } });
    return NextResponse.json(brand);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg || 'failed' }, { status: 500 });
  }
}
