import { CartPageClient } from '@/components/CartPageClient';

export default function CartPage() {
  return (
    <main className="container mx-auto py-16">
      <h1 className="mb-8 text-3xl font-semibold text-slate-950 dark:text-white">Cart</h1>
      <CartPageClient />
    </main>
  );
}
