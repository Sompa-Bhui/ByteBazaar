import '../globals.css';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Admin — ByteBazaar',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-white border-r">
        <div className="p-4 text-xl font-semibold">ByteBazaar</div>
        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <Link href="/admin" className="block rounded px-3 py-2 hover:bg-gray-100">
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/admin/products" className="block rounded px-3 py-2 hover:bg-gray-100">
                Products
              </Link>
            </li>
            <li>
              <Link href="/admin/categories" className="block rounded px-3 py-2 hover:bg-gray-100">
                Categories
              </Link>
            </li>
            <li>
              <Link href="/admin/brands" className="block rounded px-3 py-2 hover:bg-gray-100">
                Brands
              </Link>
            </li>
            <li>
              <Link href="/admin/inventory" className="block rounded px-3 py-2 hover:bg-gray-100">
                Inventory
              </Link>
            </li>
            <li>
              <Link href="/admin/coupons" className="block rounded px-3 py-2 hover:bg-gray-100">
                Coupons
              </Link>
            </li>
            <li>
              <Link href="/admin/orders" className="block rounded px-3 py-2 hover:bg-gray-100">
                Orders
              </Link>
            </li>
          </ul>
        </nav>
      </aside>
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
