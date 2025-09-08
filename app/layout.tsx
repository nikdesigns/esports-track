// app/layout.tsx
import './globals.css';
import TopNav from '@/components/TopNav';

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
      <body className="bg-[#0f0f0f] text-gray-200 min-h-screen">
        <TopNav />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative pt-6 md:pt-8">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
              {/* Main content column */}
              <main className="min-h-[80vh]">{children}</main>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
