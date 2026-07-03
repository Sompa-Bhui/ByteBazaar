import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, slug, description } = body as { name?: string; slug?: string; description?: string };
    if (!name || !slug) return NextResponse.json({ error: 'Missing' }, { status: 400 });
    const cat = await prisma.category.create({ data: { name, slug, description } });
    return NextResponse.json(cat);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg || 'failed' }, { status: 500 });
  }
}
