// components/GameTabs.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const games = [
  { name: 'All', slug: '' },
  { name: 'Dota 2', slug: 'dota2' },
  { name: 'CS:GO', slug: 'csgo' },
  { name: 'Valorant', slug: 'valorant' },
  { name: 'LoL', slug: 'lol' },
  { name: 'Overwatch', slug: 'overwatch' },
];

export default function GameTabs() {
  const pathname = usePathname();

  return (
    <div className="h-10 flex items-center space-x-6 px-4 bg-[#1a1a1a] border-b border-gray-800 text-sm">
      {games.map((game) => {
        // Check if active
        const isActive =
          game.slug === ''
            ? pathname === '/'
            : pathname.startsWith(`/${game.slug}`);

        return (
          <Link
            key={game.slug}
            href={game.slug ? `/${game.slug}` : '/'}
            className={`relative pb-1 ${
              isActive
                ? 'text-white font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {game.name}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-full"></span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
