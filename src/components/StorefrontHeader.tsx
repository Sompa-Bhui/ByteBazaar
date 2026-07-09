'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from './ui/Button';
import { CartWishlistCounts } from './CartWishlistCounts';

const menuItems = [
  { label: 'Products', href: '/products' },
  { label: 'Collections', href: '/collections' },
  { label: 'Brands', href: '/brands' },
  { label: 'About', href: '/about' },
];

const categories = [
  { label: 'Workstations', href: '/products?category=workstations' },
  { label: 'Gaming', href: '/products?category=gaming' },
  { label: 'Streaming', href: '/products?category=streaming' },
  { label: 'Student', href: '/products?category=student' },
];

export default function StorefrontHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
      <div className="container mx-auto flex items-center justify-between gap-6 py-4">
        <Link href="/" className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          ByteBazaar
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {menuItems.map((item) => (
            <Link key={item.label} href={item.href} className="text-sm font-medium text-slate-700 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              {item.label}
            </Link>
          ))}
          <div className="relative group">
            <button className="text-sm font-medium text-slate-700 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              Categories
            </button>
            <div className="absolute left-0 top-full z-20 mt-3 hidden w-[360px] rounded-3xl border border-slate-200 bg-white p-6 shadow-xl transition group-hover:block dark:border-slate-800 dark:bg-slate-950">
              <div className="grid gap-4 sm:grid-cols-2">
                {categories.map((item) => (
                  <Link key={item.label} href={item.href} className="rounded-2xl px-4 py-3 transition hover:bg-slate-100 dark:hover:bg-slate-900">
                    <p className="font-semibold text-slate-900 dark:text-white">{item.label}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Premium setups curated for every workflow.</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>

        <div className="flex items-center gap-3">
          <CartWishlistCounts />
          <Link href="/cart" className="text-sm font-medium text-slate-700 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Cart</Link>
          <Link href="/wishlist" className="text-sm font-medium text-slate-700 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Wishlist</Link>
          <Button as="a" href="/products" variant="secondary" size="sm">
            Shop
          </Button>
          <Button as="a" href="/sign-in" size="sm">
            Sign in
          </Button>
          <button className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:text-white md:hidden" onClick={() => setMobileOpen((state) => !state)}>
            <span className="sr-only">Toggle menu</span>
            ☰
          </button>
        </div>
      </div>
      {mobileOpen ? (
        <div className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:hidden">
          <div className="container mx-auto space-y-3 p-4">
            {menuItems.map((item) => (
              <Link key={item.label} href={item.href} className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">
                {item.label}
              </Link>
            ))}
            {categories.map((item) => (
              <Link key={item.label} href={item.href} className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
