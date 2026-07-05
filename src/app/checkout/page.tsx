import { CheckoutClient } from '@/components/CheckoutClient';

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const params = await searchParams;
  return (
    <main className="container mx-auto py-16">
      <h1 className="mb-8 text-3xl font-semibold text-slate-950 dark:text-white">Checkout</h1>
      <CheckoutClient initialOrderId={params.orderId ?? null} />
    </main>
  );
}
