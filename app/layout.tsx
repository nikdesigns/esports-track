// app/layout.tsx
import './globals.css';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
  title: 'Esports Live',
  description: 'Live scores, rankings, and tournaments for all esports',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0f0f0f] text-gray-200">
        {/* Global Navbar */}
        <header className="flex justify-between items-center px-6 py-4 border-b border-gray-800 bg-[#121212] shadow-md">
          <h1 className="text-2xl font-bold text-white">Esports Live</h1>
          <nav className="flex space-x-2 bg-[#1a1a1a] p-2 rounded-xl border border-gray-800">
            <Button
              variant="ghost"
              asChild
              className="text-gray-300 hover:text-white hover:bg-gray-800 rounded-md"
            >
              <Link href="/">Live Matches</Link>
            </Button>

            <Button
              variant="ghost"
              asChild
              className="text-gray-300 hover:text-white hover:bg-gray-800 rounded-md"
            >
              <Link href="/rankings">Rankings</Link>
            </Button>

            <Button
              variant="ghost"
              asChild
              className="text-gray-300 hover:text-white hover:bg-gray-800 rounded-md"
            >
              <Link href="/tournaments">Tournaments</Link>
            </Button>

            <Button
              variant="ghost"
              asChild
              className="text-gray-300 hover:text-white hover:bg-gray-800 rounded-md"
            >
              <Link href="/news">News</Link>
            </Button>
          </nav>
        </header>

        {/* Page content */}
        <main className="p-6 min-h-screen bg-[#0f0f0f]">{children}</main>
      </body>
    </html>
  );
}
