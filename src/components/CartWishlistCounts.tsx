"use client";

import { useCartWishlist } from './cart-wishlist-context';

export function CartWishlistCounts() {
  const { cartCount, wishlistCount } = useCartWishlist();

  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
        Cart <strong>{cartCount}</strong>
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
        Wishlist <strong>{wishlistCount}</strong>
      </span>
    </div>
  );
}
