"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type CartWishlistContextValue = {
  cartCount: number;
  wishlistCount: number;
  wishlistProductIds: string[];
  wishlistVariantIds: string[];
  refreshCart: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
  refreshAll: () => Promise<void>;
  setCountsFromCart: (count: number) => void;
  setCountsFromWishlist: (count: number) => void;
  setWishlistState: (input: { productIds: string[]; variantIds: string[]; count: number }) => void;
  isWishlistedProduct: (productId: string) => boolean;
  isWishlistedVariant: (variantId: string) => boolean;
};

const CartWishlistContext = createContext<CartWishlistContextValue | null>(null);

export function CartWishlistProvider({ children }: { children: ReactNode }) {
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [wishlistProductIds, setWishlistProductIds] = useState<string[]>([]);
  const [wishlistVariantIds, setWishlistVariantIds] = useState<string[]>([]);

  const refreshCart = useCallback(async () => {
    try {
      const response = await fetch('/api/cart');
      const data = await response.json();
      setCartCount(data?.data?.itemCount ?? 0);
    } catch {
      setCartCount(0);
    }
  }, []);

  const refreshWishlist = useCallback(async () => {
    try {
      const response = await fetch('/api/wishlist');
      const data = await response.json();
      const items = data?.data?.items ?? [];
      setWishlistCount(items.length);
      setWishlistProductIds(items.map((item: { variant?: { product?: { id?: string } } }) => item.variant?.product?.id).filter(Boolean));
      setWishlistVariantIds(items.map((item: { variant?: { id?: string } }) => item.variant?.id).filter(Boolean));
    } catch {
      setWishlistCount(0);
      setWishlistProductIds([]);
      setWishlistVariantIds([]);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshCart(), refreshWishlist()]);
  }, [refreshCart, refreshWishlist]);

  const setWishlistState = useCallback((input: { productIds: string[]; variantIds: string[]; count: number }) => {
    setWishlistProductIds(input.productIds);
    setWishlistVariantIds(input.variantIds);
    setWishlistCount(input.count);
  }, []);

  const isWishlistedProduct = useCallback((productId: string) => wishlistProductIds.includes(productId), [wishlistProductIds]);
  const isWishlistedVariant = useCallback((variantId: string) => wishlistVariantIds.includes(variantId), [wishlistVariantIds]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const value = useMemo<CartWishlistContextValue>(
    () => ({
      cartCount,
      wishlistCount,
      wishlistProductIds,
      wishlistVariantIds,
      refreshCart,
      refreshWishlist,
      refreshAll,
      setCountsFromCart: setCartCount,
      setCountsFromWishlist: setWishlistCount,
      setWishlistState,
      isWishlistedProduct,
      isWishlistedVariant,
    }),
    [cartCount, wishlistCount, wishlistProductIds, wishlistVariantIds, refreshAll, refreshCart, refreshWishlist, setWishlistState, isWishlistedProduct, isWishlistedVariant],
  );

  return <CartWishlistContext.Provider value={value}>{children}</CartWishlistContext.Provider>;
}

export function useCartWishlist() {
  const context = useContext(CartWishlistContext);
  if (!context) throw new Error('useCartWishlist must be used within CartWishlistProvider');
  return context;
}
