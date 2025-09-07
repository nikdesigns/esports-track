// app/layout.tsx
import './globals.css';
import TopNav from '@/components/TopNav';
import GameTabs from '@/components/GameTabs';
import Link from 'next/link';

export const metadata = {
  title: 'Esports Live',
  description: 'Flashscore-style live esports tracker',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0f0f0f] text-gray-200">
        <div className="flex flex-col min-h-screen">
          {/* Top Navigation */}
          <TopNav />

          {/* Game Tabs (Flashscore style) */}
          <GameTabs />

          <div className="flex flex-1">
            {/* Sidebar */}
            <aside className="w-60 bg-[#121212] border-r border-gray-800 min-h-screen sticky top-0">
              <div className="p-4 text-xl font-bold text-white">
                Esports Live
              </div>
              <nav className="flex flex-col space-y-1 p-2">
                <Link
                  href="/"
                  className="px-3 py-2 rounded-md hover:bg-[#1f1f1f] text-gray-300 hover:text-white"
                >
                  Live Matches
                </Link>
                <Link
                  href="/rankings"
                  className="px-3 py-2 rounded-md hover:bg-[#1f1f1f] text-gray-300 hover:text-white"
                >
                  Rankings
                </Link>
                <Link
                  href="/tournaments"
                  className="px-3 py-2 rounded-md hover:bg-[#1f1f1f] text-gray-300 hover:text-white"
                >
                  Tournaments
                </Link>
                <Link
                  href="/news"
                  className="px-3 py-2 rounded-md hover:bg-[#1f1f1f] text-gray-300 hover:text-white"
                >
                  News
                </Link>
              </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
