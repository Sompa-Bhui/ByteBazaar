"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AddressManager } from './AddressManager';

type Preview = {
  requiresAuth: boolean;
  cartId: string | null;
  items: Array<{ id: string; quantity: number; product: { title: string; image: string | null }; variant: { title: string; price: number } }>;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  couponCode: string | null;
  couponError: string | null;
  itemCount: number;
  addresses: Array<{ id: string; isDefault: boolean }>;
  selectedAddressId: string | null;
};

export function CheckoutClient({ initialOrderId }: { initialOrderId: string | null }) {
  const [data, setData] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [paymentState, setPaymentState] = useState<'idle' | 'preparing' | 'opening' | 'failed'>('idle');
  const [orderId, setOrderId] = useState<string | null>(initialOrderId);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/checkout/preview${appliedCoupon ? `?couponCode=${encodeURIComponent(appliedCoupon)}` : ''}`);
    const json = await res.json();
    if (!res.ok) setError(json.error ?? 'Unable to load checkout');
    else {
      setData(json.data);
      setAddressId(json.data.selectedAddressId);
    }
    setLoading(false);
  }, [appliedCoupon]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadRazorpayScript = useCallback(async () => {
    if (window.Razorpay) return true;
    return new Promise<boolean>((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  const openPayment = useCallback(async (targetOrderId: string) => {
    setPaymentState('preparing');
    const paymentRes = await fetch('/api/payments/razorpay/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: targetOrderId }),
    });
    const paymentJson = await paymentRes.json();
    if (!paymentRes.ok) {
      setPaymentState('failed');
      setError(paymentJson.error ?? 'Unable to start payment');
      return;
    }

    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      setPaymentState('failed');
      setError('Unable to load payment checkout');
      return;
    }

    setPaymentState('opening');
    const razorpay = new window.Razorpay({
      key: paymentJson.data.keyId,
      order_id: paymentJson.data.providerOrderId,
      amount: paymentJson.data.amount,
      currency: paymentJson.data.currency,
      name: 'ByteBazaar',
      description: `Order ${paymentJson.data.orderId}`,
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const verifyRes = await fetch('/api/payments/razorpay/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: paymentJson.data.orderId, ...response }),
        });
        const verifyJson = await verifyRes.json();
        if (verifyRes.ok) {
          window.location.href = `/orders/${paymentJson.data.orderId}`;
        } else {
          setPaymentState('failed');
          setError(verifyJson.error ?? 'Payment verification failed');
        }
      },
      modal: {
        ondismiss: () => {
          setPaymentState('failed');
          setError('Payment cancelled');
        },
      },
      theme: { color: '#020617' },
    });
    razorpay.open();
  }, [loadRazorpayScript]);

  useEffect(() => {
    if (initialOrderId) void openPayment(initialOrderId);
  }, [initialOrderId, openPayment]);

  async function placeOrder() {
    if (!addressId) return;
    setPlacing(true);
    setPaymentState('preparing');
    const orderRes = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shippingAddressId: addressId, idempotencyKey: crypto.randomUUID(), couponCode: appliedCoupon || null }),
    });
    const orderJson = await orderRes.json();
    if (!orderRes.ok) {
      setPlacing(false);
      setPaymentState('failed');
      setError(orderJson.error ?? 'Unable to place order');
      return;
    }
    setOrderId(orderJson.data.id);
    await openPayment(orderJson.data.id);
    setPlacing(false);
  }

  async function applyCoupon() {
    setAppliedCoupon(couponCode.trim() || null);
    setError(null);
  }

  async function removeCoupon() {
    setCouponCode('');
    setAppliedCoupon(null);
    setError(null);
  }

  if (loading) return <div className="rounded-3xl border p-8">Loading checkout...</div>;
  if (error) return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700">{error}</div>;
  if (!data || !data.items.length) {
    return (
      <div className="rounded-3xl border border-dashed p-10 text-center">
        <p>Your cart is empty.</p>
        <Link href="/products" className="mt-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-white">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="space-y-8">
        <section className="rounded-3xl border p-6">
          <h2 className="mb-4 text-xl font-semibold">Shipping address</h2>
          <AddressManager selectedAddressId={addressId} onSelect={setAddressId} onChanged={load} />
        </section>
        <section className="rounded-3xl border p-6">
          <h2 className="mb-4 text-xl font-semibold">Coupon</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Enter coupon code" className="flex-1 rounded-full border px-4 py-3" />
            <button onClick={applyCoupon} className="rounded-full bg-slate-950 px-4 py-3 text-white">Apply</button>
            <button onClick={removeCoupon} className="rounded-full border px-4 py-3">Remove</button>
          </div>
          {appliedCoupon ? <div className="mt-3 text-sm text-emerald-700">Applied: {appliedCoupon}</div> : null}
          {data.couponError ? <div className="mt-3 text-sm text-rose-700">{data.couponError}</div> : null}
        </section>
        <section className="rounded-3xl border p-6">
          <h2 className="mb-4 text-xl font-semibold">Items</h2>
          <div className="space-y-3">
            {data.items.map((item) => (
              <div key={item.id} className="flex gap-4">
                {item.product.image ? (
                  <img src={item.product.image} alt={item.product.title} className="h-16 w-16 rounded-2xl object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-slate-100" aria-hidden="true" />
                )}
                <div className="flex-1">
                  <div className="font-medium">{item.product.title}</div>
                  <div className="text-sm text-slate-500">
                    {item.variant.title} x {item.quantity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <aside className="rounded-3xl border p-6">
        <h2 className="text-xl font-semibold">Summary</h2>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{(data.subtotal / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-₹{(data.discount / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>₹{(data.shipping / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>₹{(data.tax / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>Total</span>
            <span>₹{(data.total / 100).toFixed(2)}</span>
          </div>
        </div>
        {orderId ? <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">Order {orderId}</div> : null}
        <button onClick={placeOrder} disabled={!addressId || placing} className="mt-6 w-full rounded-full bg-slate-950 px-4 py-3 text-white disabled:opacity-50">
          {placing ? (paymentState === 'opening' ? 'Opening payment...' : 'Preparing payment...') : 'Place order & pay'}
        </button>
      </aside>
    </div>
  );
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}
