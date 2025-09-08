// components/TopNav.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Bell, Menu, X, ChevronDown } from 'lucide-react';

export default function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        document.activeElement instanceof HTMLElement &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const notifications = [
    { id: 1, text: 'Team Spirit VS PSG.LGD — Live now', time: '2m' },
    { id: 2, text: 'New ranking update for Dota 2', time: '1h' },
  ];

  return (
    <header className="w-full sticky top-0 z-50 backdrop-blur-sm bg-gradient-to-b from-black/60 to-transparent border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* left: logo + title */}
          <div className="flex items-center gap-4 min-w-0">
            <button
              className="md:hidden p-2 rounded-md text-gray-300 hover:bg-gray-800"
              onClick={() => setMobileOpen((s) => !s)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            <Link href="/" className="flex items-center gap-3 no-underline">
              <div className="relative w-9 h-9 rounded-md overflow-hidden bg-gradient-to-br from-[#0ea5a4] to-[#7c3aed] flex items-center justify-center">
                <span className="text-white font-bold">EL</span>
              </div>
              <div className="hidden sm:flex flex-col leading-tight">
                <span className="text-sm font-semibold text-white">
                  Esports Live
                </span>
                <span className="text-xs text-gray-400">
                  Live scores & rankings
                </span>
              </div>
            </Link>
          </div>

          {/* center: search */}
          <div className="flex-1 px-4">
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search matches, teams, tournaments... (press / to focus)"
                  className="w-full bg-[#0b0b0b] text-gray-200 placeholder:text-gray-500 rounded-lg pl-10 pr-28 py-2 border border-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* right: nav links + notifications + user menu */}
          <div className="flex items-center gap-3">
            <nav className="hidden sm:flex items-center gap-2">
              <Link
                href="/rankings"
                className="text-sm text-gray-300 px-3 py-1 rounded hover:bg-[#171717]"
              >
                Rankings
              </Link>
              <Link
                href="/tournaments"
                className="text-sm text-gray-300 px-3 py-1 rounded hover:bg-[#171717]"
              >
                Tournaments
              </Link>
              <Link
                href="/news"
                className="text-sm text-gray-300 px-3 py-1 rounded hover:bg-[#171717]"
              >
                News
              </Link>
            </nav>

            {/* notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((s) => !s)}
                className="p-2 rounded-md text-gray-300 hover:bg-gray-800"
                aria-haspopup="true"
                aria-expanded={notifOpen}
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#0b0b0b] border border-gray-800 rounded-lg shadow-lg overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-800 text-sm text-gray-400">
                    Notifications
                  </div>
                  <div className="max-h-64 overflow-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className="px-3 py-2 hover:bg-[#111111] flex items-start gap-2"
                      >
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#06b6d4] to-[#7c3aed] flex items-center justify-center text-xs font-bold text-white">
                            N
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm text-gray-200">{n.text}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {n.time}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-3 py-2 border-t border-gray-800 text-center">
                    <Link
                      href="/notifications"
                      className="text-xs text-blue-400"
                    >
                      View all
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* user menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((s) => !s)}
                className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-800"
                aria-haspopup="true"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                  <span className="text-xs text-white">U</span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-300" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-[#0b0b0b] border border-gray-800 rounded-lg shadow-lg overflow-hidden">
                  <Link
                    href="/profile"
                    className="block px-3 py-2 hover:bg-[#111111] text-sm text-gray-200"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="block px-3 py-2 hover:bg-[#111111] text-sm text-gray-200"
                  >
                    Settings
                  </Link>
                  <div className="border-t border-gray-800" />
                  <Link
                    href="/logout"
                    className="block px-3 py-2 hover:bg-[#111111] text-sm text-red-400"
                  >
                    Sign out
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* mobile nav */}
        {mobileOpen && (
          <div className="md:hidden mt-2 pb-4">
            <div className="flex flex-col gap-2">
              <Link
                href="/"
                className="px-3 py-2 text-gray-300 hover:bg-[#121212] rounded"
              >
                Live Matches
              </Link>
              <Link
                href="/rankings"
                className="px-3 py-2 text-gray-300 hover:bg-[#121212] rounded"
              >
                Rankings
              </Link>
              <Link
                href="/tournaments"
                className="px-3 py-2 text-gray-300 hover:bg-[#121212] rounded"
              >
                Tournaments
              </Link>
              <Link
                href="/news"
                className="px-3 py-2 text-gray-300 hover:bg-[#121212] rounded"
              >
                News
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
