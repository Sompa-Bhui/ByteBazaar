"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';

type ImageRecord = { id: string; url: string; altText?: string; position: number; publicId?: string };

export default function ImageUploader({ productId, variantId, onChange, initial }: { productId: string; variantId?: string; onChange?: (images: ImageRecord[]) => void; initial?: ImageRecord[] }) {
  const [images, setImages] = useState<ImageRecord[]>(initial ?? []);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const dropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { onChange?.(images); }, [images, onChange]);

  // load existing images for product if not provided via `initial`
  useEffect(() => {
    let mounted = true;
    if ((initial == null || initial.length === 0) && productId) {
      fetch(`/api/admin/products/${productId}/images`).then(async (res) => {
        if (!mounted) return;
        if (res.ok) {
          const imgs: ImageRecord[] = await res.json();
          setImages(imgs);
        }
      }).catch(() => {});
    }
    return () => { mounted = false; };
  }, [productId, initial]);

  const uploadFile = useCallback(async (file: File) => {
    if (!/image\/(jpeg|jpg|png|webp|gif)/.test(file.type)) { alert('Invalid file type'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('File too large (max 5MB)'); return; }

    setUploading(true);
    const form = new FormData();
    form.append('file', file);

    // Use XHR for progress
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.round((e.loaded / e.total) * 100);
        setProgress((p) => ({ ...p, [file.name]: pct }));
      };
      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const json = JSON.parse(xhr.responseText);
          // create DB record immediately; server will return new records
          const createRes = await fetch(`/api/admin/products/${productId}/images`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ images: [{ url: json.imageUrl || json.url, publicId: json.publicId, altText: '', variantId }] }) });
          const created = await createRes.json();
          if (createRes.ok) {
            setImages((s) => [...s, ...created]);
          } else {
            alert('Failed to save image record');
          }
          resolve();
        } else {
          reject(new Error('Upload failed'));
        }
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.send(form);
    });

    setProgress((p) => { const copy = { ...p }; delete copy[file.name]; return copy; });
    setUploading(false);
  }, [productId, variantId]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (!dt) return;
    const files = Array.from(dt.files);
    files.forEach((f) => uploadFile(f));
  }, [uploadFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((f) => uploadFile(f));
  }, [uploadFile]);

  function onDelete(id: string) {
    if (!confirm('Delete image?')) return;
    fetch(`/api/admin/products/${productId}/images/${id}`, { method: 'DELETE' }).then(async (res) => {
      if (res.ok) setImages((s) => s.filter((i) => i.id !== id));
      else alert('Delete failed');
    });
  }

  function onSetCover(id: string) {
    fetch(`/api/admin/products/${productId}/images/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ setCover: true, variantId }) }).then(async (res) => {
      if (res.ok) alert('Cover set');
      else alert('Failed');
    });
  }

  // drag reorder
  const dragIndex = useRef<number | null>(null);

  function onDragStart(e: React.DragEvent, idx: number) { dragIndex.current = idx; }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); }
  function onDropReorder(e: React.DragEvent, idx: number) {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null) return;
    const copy = [...images];
    const [m] = copy.splice(from, 1);
    copy.splice(idx, 0, m);
    setImages(copy.map((img, i) => ({ ...img, position: i })));
    // persist order
    fetch(`/api/admin/products/${productId}/images`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: copy.map((c) => c.id) }) });
    dragIndex.current = null;
  }

  return (
    <div>
      <div ref={dropRef} onDrop={onDrop} onDragOver={(e) => e.preventDefault()} className="p-4 border-dashed border-2 rounded">
        <div className="flex items-center justify-between">
          <div>Drag & drop images here, or <label className="text-blue-600 underline cursor-pointer"><input type="file" multiple accept="image/*" onChange={onFileChange} className="hidden" />select files</label></div>
          {uploading && <div>Uploading...</div>}
        </div>

        <div className="mt-4 grid grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <div key={img.id} draggable onDragStart={(e) => onDragStart(e, idx)} onDragOver={onDragOver} onDrop={(e) => onDropReorder(e, idx)} className="border p-2">
              <img src={img.url} alt={img.altText ?? ''} className="w-full h-32 object-cover" loading="lazy" />
              <div className="flex items-center justify-between mt-2 gap-2">
                <button type="button" onClick={() => onSetCover(img.id)} className="px-2 py-1 border rounded">Cover</button>
                <button type="button" onClick={() => onDelete(img.id)} className="px-2 py-1 text-red-600">Delete</button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2">
          {Object.entries(progress).map(([name, pct]) => (
            <div key={name}>{name}: {pct}%</div>
          ))}
        </div>
      </div>
    </div>
  );
}
