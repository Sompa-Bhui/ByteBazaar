"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SignedIn, SignedOut, UserButton, ClerkProvider } from '@clerk/nextjs';

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
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <header className="border-b bg-white dark:bg-black">
        <div className="container flex items-center justify-between py-4">
          <Link href="/" className="text-2xl font-semibold">
            ByteBazaar
          </Link>
          <nav className="flex items-center gap-4">
            <button onClick={toggleTheme} className="px-3 py-1 border rounded">
              Toggle Theme
            </button>
            <SignedOut>
              <Link href="/sign-in" className="px-3 py-1">
                Sign in
              </Link>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </nav>
        </div>
      </header>
    </ClerkProvider>
  );
}
