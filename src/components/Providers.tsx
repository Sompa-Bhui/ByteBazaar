"use client";

import { ReactNode, useEffect } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { CartWishlistProvider } from './cart-wishlist-context';

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
  }, []);

  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const content = <CartWishlistProvider>{children}</CartWishlistProvider>;

  if (!publishableKey) return content;

  return <ClerkProvider publishableKey={publishableKey}>{content}</ClerkProvider>;
}
