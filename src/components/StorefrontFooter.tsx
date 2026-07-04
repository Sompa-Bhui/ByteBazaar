import Link from 'next/link';

const sections = [
  { title: 'Explore', links: ['Products', 'Collections', 'Brands', 'About'] },
  { title: 'Support', links: ['Help Center', 'Contact', 'Privacy', 'Terms'] },
  { title: 'Company', links: ['About Us', 'Careers', 'Press', 'Blog'] },
];

export default function StorefrontFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-16 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
      <div className="container mx-auto grid gap-10 md:grid-cols-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">ByteBazaar</p>
          <p className="mt-6 max-w-xs text-sm leading-6 text-slate-600 dark:text-slate-400">Discover premium workspace products, curated for developers, creators, and entrepreneurs.</p>
        </div>
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{section.title}</p>
            <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              {section.links.map((link) => (
                <Link key={link} href="#" className="block hover:text-slate-900 dark:hover:text-white">
                  {link}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-16 border-t border-slate-200 pt-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">© {new Date().getFullYear()} ByteBazaar. Crafted for modern workspace experiences.</div>
    </footer>
  );
}
