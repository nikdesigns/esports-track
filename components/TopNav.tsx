// components/TopNav.tsx
'use client';

import { Globe, Settings } from 'lucide-react';

export default function TopNav() {
  return (
    <header className="h-10 flex items-center justify-between px-4 bg-[#1a1a1a] border-b border-gray-800 text-sm">
      <div className="font-bold text-green-500">Esports Live</div>
      <div className="flex items-center space-x-4 text-gray-400">
        <button className="hover:text-white flex items-center space-x-1">
          <Globe size={16} />
          <span>EN</span>
        </button>
        <button className="hover:text-white">
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}
