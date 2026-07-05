import '../globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Admin — ByteBazaar'
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex bg-gray-50">
          <aside className="w-64 bg-white border-r">
            <div className="p-4 text-xl font-semibold">ByteBazaar</div>
            <nav className="p-4">
              <ul className="space-y-2">
                <li>
                  <Link href="/admin" className="block px-3 py-2 rounded hover:bg-gray-100">Dashboard</Link>
                </li>
                <li>
                  <Link href="/admin/products" className="block px-3 py-2 rounded hover:bg-gray-100">Products</Link>
                </li>
                <li>
                  <Link href="/admin/categories" className="block px-3 py-2 rounded hover:bg-gray-100">Categories</Link>
                </li>
                <li>
                  <Link href="/admin/brands" className="block px-3 py-2 rounded hover:bg-gray-100">Brands</Link>
                </li>
                <li>
                  <Link href="/admin/inventory" className="block px-3 py-2 rounded hover:bg-gray-100">Inventory</Link>
                </li>
                <li>
                  <Link href="/admin/coupons" className="block px-3 py-2 rounded hover:bg-gray-100">Coupons</Link>
                </li>
                <li>
                  <Link href="/admin/orders" className="block px-3 py-2 rounded hover:bg-gray-100">Orders</Link>
                </li>
              </ul>
            </nav>
          </aside>
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
