import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const revalidate = 0;

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <Link href="/admin/categories/create" className="px-3 py-2 bg-primary text-white rounded">Create Category</Link>
      </div>

      <div className="mt-6 bg-white border rounded">
        <table className="w-full">
          <thead>
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Slug</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.name}</td>
                <td className="p-3">{c.slug}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
