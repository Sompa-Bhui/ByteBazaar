import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export async function POST(req: Request) {
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 501 });
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    const res = await cloudinary.uploader.upload(dataUri, { folder: 'bytebazaar/uploads', resource_type: 'image', quality: 'auto', fetch_format: 'auto' });
    return NextResponse.json({
      imageUrl: res.secure_url,
      publicId: res.public_id,
      width: res.width,
      height: res.height,
      format: res.format,
      bytes: res.bytes,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg || 'Upload failed' }, { status: 500 });
  }
}
