"use client";

import { useCartWishlist } from './cart-wishlist-context';

export function CartWishlistCounts() {
  const { cartCount, wishlistCount } = useCartWishlist();

  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <span>Cart {cartCount}</span>
      <span>Wishlist {wishlistCount}</span>
    </div>
  );
}
