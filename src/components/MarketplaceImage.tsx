'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

const FALLBACK_IMAGE =
  'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns%3D%22http://www.w3.org/2000/svg%22 viewBox%3D%220 0 1200 800%22%3E%3Cdefs%3E%3ClinearGradient id%3D%22g%22 x1%3D%220%25%22 y1%3D%220%25%22 x2%3D%22100%25%22 y2%3D%22100%25%22%3E%3Cstop stop-color%3D%22%23111827%22/%3E%3Cstop offset%3D%22100%25%22 stop-color%3D%22%23374151%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width%3D%221200%22 height%3D%22800%22 fill%3D%22url(%23g)%22/%3E%3Ccircle cx%3D%22950%22 cy%3D%22250%22 r%3D%22180%22 fill%3D%22%232563eb%22 fill-opacity%3D%220.35%22/%3E%3Ccircle cx%3D%22300%22 cy%3D%22550%22 r%3D%22220%22 fill%3D%22%23ec4899%22 fill-opacity%3D%220.20%22/%3E%3Cpath d%3D%22M210 560l170-180 120 120 110-90 260 250H210z%22 fill%3D%22%23e5e7eb%22 fill-opacity%3D%220.14%22/%3E%3C/svg%3E';

type MarketplaceImageProps = {
  src?: string | null;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export function MarketplaceImage({
  src,
  alt,
  fill = false,
  width,
  height,
  className,
  sizes,
  priority,
}: MarketplaceImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src || FALLBACK_IMAGE);

  useEffect(() => {
    setCurrentSrc(src || FALLBACK_IMAGE);
  }, [src]);

  const imageProps = useMemo(
    () => ({
      src: currentSrc || FALLBACK_IMAGE,
      alt,
      className,
      sizes,
      priority,
      onError: () => setCurrentSrc(FALLBACK_IMAGE),
    }),
    [alt, className, currentSrc, priority, sizes],
  );

  if (fill) {
    return <Image fill {...imageProps} alt={alt} />;
  }

  return <Image width={width ?? 1200} height={height ?? 800} {...imageProps} alt={alt} />;
}
