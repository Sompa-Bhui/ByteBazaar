'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { CartWishlistCounts } from './CartWishlistCounts';

export default function Navbar() {
  // menu open state removed (unused)

  useEffect(() => {
    const theme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
  }, []);

  function toggleTheme() {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  }

  return (
    <header className="border-b bg-white dark:bg-black">
        <div className="container flex items-center justify-between py-4">
          <Link href="/" className="text-2xl font-semibold">
            ByteBazaar
          </Link>
          <nav className="flex items-center gap-4">
            <CartWishlistCounts />
            <Link href="/cart" className="px-3 py-1">
              Cart
            </Link>
            <Link href="/wishlist" className="px-3 py-1">
              Wishlist
            </Link>
            <button onClick={toggleTheme} className="px-3 py-1 border rounded">
              Toggle Theme
            </button>
            <Link href="/sign-in" className="px-3 py-1">
              Sign in
            </Link>
          </nav>
        </div>
      </header>
  );
}
