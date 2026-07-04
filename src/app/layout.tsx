import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Providers from '@/components/Providers';

export const metadata = {
  title: 'ByteBazaar',
  description: 'Developer Workspace Marketplace'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navbar />
          <main className="min-h-[60vh]">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
