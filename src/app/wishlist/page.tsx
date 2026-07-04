import { WishlistPageClient } from '@/components/WishlistPageClient';

export default function WishlistPage() {
  return (
    <main className="container mx-auto py-16">
      <h1 className="mb-8 text-3xl font-semibold text-slate-950 dark:text-white">Wishlist</h1>
      <WishlistPageClient />
    </main>
  );
}
