// app/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import MatchCard from '@/components/MatchCard';
import ImageWithFallback from '@/components/ImageWithFallback';
import useFollowedTeams from '@/hooks/useFollowedTeams';
import { Search } from 'lucide-react';
import HeroTrends from '@/components/HeroTrends';

/**
 * Home page (client) - Escharts-inspired layout
 * Uses API_ENDPOINT '/api/matches' — ensure that route exists (see app/api/matches/route.ts).
 */

const API_ENDPOINT = '/api/matches';

type MatchType = any;

export default function HomePage() {
  const [matches, setMatches] = useState<MatchType[]>([]);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [filter, setFilter] = useState<
    'all' | 'running' | 'not_started' | 'finished'
  >('all');
  const [query, setQuery] = useState('');
  const { allFollowedIds } = useFollowedTeams();
  const [featured, setFeatured] = useState<MatchType[]>([]);

  useEffect(() => {
    fetchMatches(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // --- hardened fetchMatches: surfaces upstream body when non-OK ---
  async function fetchMatches(p = 1, replace = false) {
    setLoading(true);
    setError(null);

    try {
      const url = new URL(API_ENDPOINT, window.location.origin);
      url.searchParams.set('per_page', '12');
      url.searchParams.set('page', String(p));
      if (filter !== 'all') url.searchParams.set('filter[status]', filter);

      console.log('[client] fetching matches from', url.toString());
      const res = await fetch(url.toString(), { cache: 'no-store' });

      if (!res.ok) {
        // read body (helps debugging 502/502 upstream)
        const bodyText = await res.text().catch(() => '[no body]');
        console.error('[client] /api/matches returned', res.status, bodyText);
        setError(`Server error ${res.status}: ${bodyText}`);
        setLoading(false);
        return;
      }

      const data = await res.json().catch((e) => {
        console.error('[client] failed to parse JSON from /api/matches', e);
        setError('Invalid JSON response from server');
        setLoading(false);
        return null;
      });
      if (data === null) return;

      const items = Array.isArray(data) ? data : data.matches ?? [];
      setHasMore(items.length >= 12);
      setMatches((prev) => (replace ? items : [...prev, ...items]));
      setPage(p);

      if (p === 1) {
        const f = items.filter((m: any) => m.status === 'running').slice(0, 4);
        setFeatured(f.length ? f : items.slice(0, 4));
      }
    } catch (err: any) {
      console.error('[client] fetchMatches error', err);
      setError(err?.message ?? 'Network error while fetching matches');
    } finally {
      setLoading(false);
    }
  }

  const filteredMatches = useMemo(() => {
    if (!query) return matches;
    const q = query.toLowerCase();
    return matches.filter((m: any) => {
      const name = (m.name ?? '') + ' ' + (m.league?.name ?? '');
      const opponents = (m.opponents ?? [])
        .map((o: any) => o.opponent?.name ?? o.opponent?.acronym ?? '')
        .join(' ');
      return (name + ' ' + opponents).toLowerCase().includes(q);
    });
  }, [matches, query]);

  const counts = useMemo(() => {
    const live = matches.filter((m) => m.status === 'running').length;
    const upcoming = matches.filter(
      (m) => m.status === 'not_started' || m.status === 'scheduled'
    ).length;
    const finished = matches.filter((m) => m.status === 'finished').length;
    return { live, upcoming, finished };
  }, [matches]);

  return (
    <div className="w-full">
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#071018] to-transparent rounded-xl p-6 mb-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
              Live esports scores, tournaments & rankings
            </h1>
            <p className="text-gray-400 mt-2 max-w-2xl">
              Real-time match updates, team rankings, and tournament coverage
              across Dota 2 and more.
            </p>

            <div className="mt-4 max-w-xl">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-[#0b0b0b] text-gray-200 placeholder:text-gray-500 rounded-lg pl-10 pr-4 py-3 border border-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  placeholder="Search matches, teams, tournaments..."
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => {
                  setFilter('running');
                  fetchMatches(1, true);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'running'
                    ? 'bg-red-600 text-white'
                    : 'bg-[#151515] text-gray-300'
                }`}
              >
                Live
              </button>
              <button
                onClick={() => {
                  setFilter('not_started');
                  fetchMatches(1, true);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'not_started'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#151515] text-gray-300'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => {
                  setFilter('all');
                  fetchMatches(1, true);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'all'
                    ? 'bg-gray-800 text-white'
                    : 'bg-[#151515] text-gray-300'
                }`}
              >
                All
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">Live matches</div>
                <div className="text-xl font-bold text-white">
                  {counts.live}
                </div>
              </div>
              <div className="w-12 h-12 rounded-md bg-gradient-to-br from-red-600 to-red-400 flex items-center justify-center text-white font-bold">
                LIVE
              </div>
            </div>

            <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">Upcoming</div>
                <div className="text-xl font-bold text-white">
                  {counts.upcoming}
                </div>
              </div>
              <div className="w-12 h-12 rounded-md bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-white font-bold">
                UP
              </div>
            </div>

            <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">Finished</div>
                <div className="text-xl font-bold text-white">
                  {counts.finished}
                </div>
              </div>
              <div className="w-12 h-12 rounded-md bg-gradient-to-br from-green-600 to-green-400 flex items-center justify-center text-white font-bold">
                END
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div>
          {/* Featured */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Featured</h2>
              <a
                href="/matches"
                className="text-sm text-blue-400 hover:underline"
              >
                View all
              </a>
            </div>

            <div className="overflow-x-auto">
              <div className="flex gap-4 pb-2">
                {featured.length === 0
                  ? [1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-[320px] h-36 bg-[#121212] border border-gray-800 rounded-xl animate-pulse"
                      />
                    ))
                  : featured.map((m: MatchType) => (
                      <div key={m.id} className="min-w-[320px]">
                        <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs text-gray-400">
                                {m.league?.name ?? m.name}
                              </div>
                              <div className="text-sm text-white font-semibold mt-1">
                                {m.name}
                              </div>
                              <div className="text-xs text-gray-400 mt-2">
                                {m.status === 'running'
                                  ? 'Live'
                                  : m.scheduled_at
                                  ? new Date(m.scheduled_at).toLocaleString(
                                      [],
                                      {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      }
                                    )
                                  : ''}
                              </div>
                            </div>

                            <div className="text-2xl font-bold text-white">
                              {m.status === 'running'
                                ? `${m.score?.[0] ?? 0} - ${m.score?.[1] ?? 0}`
                                : '--'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
              </div>
            </div>
          </div>

          <section className="mb-6">
            <HeroTrends limit={18} />
          </section>

          {/* Filters + results */}
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-300">Showing</div>
              <div className="text-sm font-semibold text-white">
                {filter === 'running'
                  ? 'Live'
                  : filter === 'not_started'
                  ? 'Upcoming'
                  : 'All'}
              </div>
              <div className="text-sm text-gray-500">
                • {matches.length} results
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={filter}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setFilter(val);
                  fetchMatches(1, true);
                }}
                className="bg-[#0b0b0b] text-gray-200 rounded-md px-3 py-2 border border-gray-800"
              >
                <option value="all">All</option>
                <option value="running">Live</option>
                <option value="not_started">Upcoming</option>
                <option value="finished">Finished</option>
              </select>
              <button
                onClick={() => {
                  setMatches([]);
                  setPage(1);
                  fetchMatches(1, true);
                }}
                className="px-3 py-2 rounded-md text-sm bg-[#151515] text-gray-300 hover:bg-[#1b1b1b]"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Matches list */}
          {loading && page === 1 ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="animate-pulse bg-[#1a1a1a] border border-gray-800 rounded-xl p-4 h-28"
                />
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-center">
              <p className="text-red-400">{error}</p>
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-8 text-center text-gray-400">
              No matches found.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMatches.map((m: MatchType) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          )}

          {hasMore && !loading && filteredMatches.length > 0 && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => fetchMatches(page + 1)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition"
              >
                Load More Matches
              </button>
            </div>
          )}
        </div>

        {/* Right column intentionally left empty (you removed RightSidebar) */}
        <aside className="hidden lg:block" />
      </div>
    </div>
  );
}
