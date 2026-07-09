'use client';

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { useCartWishlist } from './cart-wishlist-context';

const categories = [
  { label: 'Workstations', href: '/products?category=workstations' },
  { label: 'Displays', href: '/products?category=displays' },
  { label: 'Inputs', href: '/products?category=inputs' },
  { label: 'Build Lab', href: '/build-lab' },
];

export default function Navbar() {
  const [isDark, setIsDark] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { cartCount, wishlistCount } = useCartWishlist();
  const activeCategory = searchParams.get('category');

  useEffect(() => {
    const theme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const root = document.documentElement;
    const nextIsDark = theme === 'dark';
    if (nextIsDark) root.classList.add('dark');
    setIsDark(nextIsDark);
  }, []);

  function toggleTheme() {
    const root = document.documentElement;
    const nextTheme = root.classList.contains('dark') ? 'light' : 'dark';
    root.classList.toggle('dark');
    setIsDark(nextTheme === 'dark');
    localStorage.setItem('theme', nextTheme);
  }

  function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = search.trim();
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85">
      <div className="container mx-auto flex min-h-[68px] items-center gap-4 py-3">
        <Link href="/" className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          ByteBazaar
        </Link>

        <form onSubmit={onSearchSubmit} className="hidden min-w-0 flex-1 max-w-[460px] lg:block">
          <label className="sr-only" htmlFor="site-search">
            Search products
          </label>
          <div className="flex h-11 items-center rounded-full border border-slate-200 bg-slate-50 px-4 shadow-sm transition focus-within:border-slate-300 focus-within:bg-white dark:border-slate-800 dark:bg-slate-900 dark:focus-within:bg-slate-950">
            <SearchIcon />
            <input
              id="site-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search desks, monitors, keyboards..."
              className="ml-3 h-full w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            />
          </div>
        </form>

        <nav className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 xl:flex">
            {categories.map((category) => (
              <Link
                key={category.label}
                href={category.href}
                className={category.label === 'Build Lab'
                  ? `whitespace-nowrap rounded-full border px-3 py-2 text-sm font-semibold transition ${
                      pathname === '/build-lab'
                        ? 'border-slate-950 bg-slate-950 text-white hover:bg-slate-800 dark:border-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`
                  : `whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition ${
                      activeCategory === category.href.split('=')[1]
                        ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white'
                    }`}
              >
                {category.label}
              </Link>
            ))}
          </div>

          <Link href="/cart" className="relative inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white">
            <span>Cart</span>
            <CountBadge count={cartCount} />
          </Link>

          <Link href="/wishlist" className="relative inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white">
            <span>Wishlist</span>
            <CountBadge count={wishlistCount} />
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800"
          >
            <ThemeIcon dark={isDark} />
          </button>

          <SignedOut>
            <div className="hidden items-center gap-2 sm:flex">
              <SignInButton mode="modal">
                <button className="rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
                  Sign up
                </button>
              </SignUpButton>
            </div>
          </SignedOut>

          <SignedIn>
            <UserButton
              userProfileMode="navigation"
              userProfileUrl="/profile"
              afterSignOutUrl="/"
              customMenuItems={[
                {
                  label: 'Profile & Security',
                  href: '/profile',
                },
              ]}
            />
          </SignedIn>
        </nav>
      </div>

      <div className="border-t border-slate-200/70 bg-white/70 px-4 py-3 dark:border-slate-800/70 dark:bg-slate-950/70 lg:hidden">
        <form onSubmit={onSearchSubmit} className="container mx-auto">
          <label className="sr-only" htmlFor="site-search-mobile">
            Search products
          </label>
          <div className="flex h-11 items-center rounded-full border border-slate-200 bg-slate-50 px-4 dark:border-slate-800 dark:bg-slate-900">
            <SearchIcon />
            <input
              id="site-search-mobile"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products"
              className="ml-3 h-full w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            />
          </div>
        </form>
        <div className="container mx-auto mt-3 flex flex-wrap gap-2">
          <Link href="/build-lab" className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 dark:border-slate-800 dark:text-slate-300">
            Build Lab
          </Link>
          {categories.map((category) => (
            <Link
              key={`${category.label}-mobile`}
              href={category.href}
              className={
                activeCategory === category.href.split('=')[1]
                  ? 'rounded-full border border-slate-950 bg-slate-950 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white dark:border-white dark:bg-white dark:text-slate-950'
                  : 'rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 dark:border-slate-800 dark:text-slate-300'
              }
            >
              {category.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0 text-slate-400">
      <path fill="currentColor" d="M10.5 4a6.5 6.5 0 1 0 4.06 11.58l4.43 4.43 1.41-1.41-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
    </svg>
  );
}

function ThemeIcon({ dark }: { dark: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      {dark ? (
        <path fill="currentColor" d="M21 13.2A8.2 8.2 0 1 1 10.8 3a7 7 0 1 0 10.2 10.2Z" />
      ) : (
        <path
          fill="currentColor"
          d="M12 3a1 1 0 0 1 1 1v1.1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm0 14.9a1 1 0 0 1 1 1V20a1 1 0 1 1-2 0v-1.1a1 1 0 0 1 1-1ZM4 12a1 1 0 0 1 1-1h1.1a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Zm14.9 0a1 1 0 0 1 1-1H21a1 1 0 1 1 0 2h-1.1a1 1 0 0 1-1-1ZM6.34 6.34a1 1 0 0 1 1.41 0l.78.78a1 1 0 1 1-1.41 1.41l-.78-.78a1 1 0 0 1 0-1.41Zm8.44 8.44a1 1 0 0 1 1.41 0l.78.78a1 1 0 1 1-1.41 1.41l-.78-.78a1 1 0 0 1 0-1.41Z"
        />
      )}
    </svg>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-slate-900 px-1.5 py-0.5 text-[0.7rem] font-semibold leading-none text-white dark:bg-white dark:text-slate-950">
      {count}
    </span>
  );
}
