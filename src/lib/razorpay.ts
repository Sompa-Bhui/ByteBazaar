import 'server-only';
import crypto from 'crypto';
import Razorpay from 'razorpay';

export class RazorpayConfigError extends Error {
  constructor(message = 'Razorpay is not configured') {
    super(message);
    this.name = 'RazorpayConfigError';
  }
}

export function hasRazorpayConfig() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function getRazorpayClient() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new RazorpayConfigError();
  return new Razorpay({ key_id, key_secret });
}

export function verifyRazorpaySignature(params: { orderId: string; paymentId: string; signature: string }) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new RazorpayConfigError();
  const expected = crypto.createHmac('sha256', secret).update(`${params.orderId}|${params.paymentId}`).digest('hex');
  const actual = Buffer.from(params.signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}

