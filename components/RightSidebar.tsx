// components/RightSidebar.tsx
'use client';

import React, { useEffect, useState } from 'react';
import LiveMiniCard from './LiveMiniCard';
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

type MatchType = any;

const STORAGE_KEY_COLLAPSE = 'esports:livepanel:collapsed';
const STORAGE_KEY_COMPACT = 'esports:livepanel:compact';

export default function RightSidebar() {
  const [matches, setMatches] = useState<MatchType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_COLLAPSE) === '1';
    } catch {
      return false;
    }
  });
  const [compact, setCompact] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_COMPACT) === '1';
    } catch {
      return false;
    }
  });

  const FETCH_URL = '/api/matches?per_page=8&filter[status]=running'; // adjust for your API

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(FETCH_URL);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data.matches ?? [];
        if (mounted) setMatches(arr.slice(0, 8));
      } catch (e: any) {
        if (mounted) setError('Unable to load live matches');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    const id = setInterval(() => load(), 30000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  // persist preferences
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COLLAPSE, collapsed ? '1' : '0');
    } catch {}
  }, [collapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COMPACT, compact ? '1' : '0');
    } catch {}
  }, [compact]);

  return (
    <div className="w-full">
      <div
        className={`bg-[#0f0f0f] border border-gray-800 rounded-xl p-3 mb-4 transition-all ${
          collapsed ? 'opacity-80' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Live Now</h3>
            <div className="text-xs text-gray-400">{matches.length} live</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              title="Refresh"
              onClick={() => {
                // quick manual refresh
                (async () => {
                  try {
                    const res = await fetch(FETCH_URL);
                    if (!res.ok) throw new Error('Failed');
                    const data = await res.json();
                    const arr = Array.isArray(data) ? data : data.matches ?? [];
                    setMatches(arr.slice(0, 8));
                  } catch {
                    setError('Refresh failed');
                  }
                })();
              }}
              className="p-2 rounded-md text-gray-300 hover:bg-gray-800"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              title={compact ? 'Switch to expanded' : 'Switch to compact'}
              onClick={() => setCompact((s) => !s)}
              className="px-2 py-1 text-xs rounded bg-[#111111] text-gray-300 hover:bg-[#171717]"
            >
              {compact ? 'Compact' : 'Expanded'}
            </button>

            <button
              title={collapsed ? 'Expand panel' : 'Collapse panel'}
              onClick={() => setCollapsed((s) => !s)}
              className="p-2 rounded-md text-gray-300 hover:bg-gray-800"
            >
              {collapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Quick view of ongoing matches — click to open the detailed page.
        </p>
      </div>

      {!collapsed ? (
        <div className="space-y-3">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className={`animate-pulse bg-[#1a1a1a] border border-gray-800 rounded-xl p-3 ${
                  compact ? 'h-16' : 'h-20'
                }`}
              />
            ))
          ) : error ? (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-3 text-sm text-red-300">
              {error}
            </div>
          ) : matches.length === 0 ? (
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-4 text-sm text-gray-400">
              No live matches right now.
            </div>
          ) : (
            matches.map((m: MatchType) => (
              <LiveMiniCard key={m.id} match={m} compact={compact} />
            ))
          )}
        </div>
      ) : (
        <div className="text-xs text-gray-500 italic">Panel collapsed</div>
      )}

      <div className="mt-4 text-center">
        <a href="/matches" className="text-sm text-blue-400 hover:underline">
          View all matches
        </a>
      </div>
    </div>
  );
}
