import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import cloudinary from '@/lib/cloudinary';

export async function DELETE(req: Request, context: { params: Promise<Record<string, string>> }) {
  try {
    const { imageId } = await context.params;
    const img = await prisma.productImage.findUnique({ where: { id: imageId } });
    if (!img) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (img.publicId) {
      try { await cloudinary.uploader.destroy(img.publicId); } catch { /* ignore */ }
    }

    await prisma.productImage.delete({ where: { id: imageId } });
    // if product or variant referenced this as cover, clear it
    await prisma.product.updateMany({ where: { coverImageId: imageId }, data: { coverImageId: null } });
    await prisma.productVariant.updateMany({ where: { coverImageId: imageId }, data: { coverImageId: null } });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg || 'failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: { params: Promise<Record<string, string>> }) {
  // update altText or set as cover: { altText?, setCover?: boolean, variantCover?: boolean }
  try {
    const { productId, imageId } = await context.params;
    const body = await req.json();
    const { altText, setCover, variantId } = body as { altText?: string; setCover?: boolean; variantId?: string };

    if (altText !== undefined) {
      await prisma.productImage.update({ where: { id: imageId }, data: { altText } });
    }

    if (setCover) {
      // if variantId provided, set variant cover, else product cover
      if (variantId) {
        await prisma.productVariant.update({ where: { id: variantId }, data: { coverImageId: imageId } });
      } else {
        await prisma.product.update({ where: { id: productId }, data: { coverImageId: imageId } });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg || 'failed' }, { status: 500 });
  }
}
