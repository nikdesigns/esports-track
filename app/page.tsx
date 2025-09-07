// app/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import MatchCard, { Match } from '@/components/MatchCard';

type StatusFilter = 'all' | 'running' | 'finished' | 'not_started';

const DEFAULT_PAGE_SIZE = 20;
const MAX_DISPLAYED_MATCHES = 10;

export default function LiveMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all'); // default All
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // fetch pages until we have enough or pages exhausted
    let mounted = true;
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    async function runAutoFetch() {
      setLoading(true);
      setError(null);
      setMatches([]);
      setPage(1);
      setHasMore(true);

      let currentPage = 1;
      let collected: Match[] = [];
      let localHasMore = true;

      while (
        mounted &&
        collected.length < MAX_DISPLAYED_MATCHES &&
        localHasMore
      ) {
        try {
          const params = new URLSearchParams();
          params.set('page', String(currentPage));
          params.set('per_page', String(DEFAULT_PAGE_SIZE));
          if (statusFilter !== 'all') params.set('status', statusFilter);
          // server forces Dota 2; we don't pass game param from client

          const res = await fetch(`/api/matches?${params.toString()}`, {
            signal: abortRef.current?.signal,
          });
          if (!res.ok) {
            const txt = await res.text().catch(() => '');
            throw new Error(`API error ${res.status} ${txt}`);
          }

          const payload = await res.json();
          const items: Match[] = Array.isArray(payload)
            ? payload
            : payload.items ?? payload.data ?? [];

          if (!items || items.length === 0) {
            localHasMore = false;
            break;
          }

          collected = [...collected, ...items];
          setMatches([...collected]); // progressive update

          if (items.length < DEFAULT_PAGE_SIZE) {
            localHasMore = false;
            break;
          }
          currentPage += 1;
        } catch (err: any) {
          if (err.name === 'AbortError') return;
          console.error('Failed to fetch matches', err);
          setError(String(err.message ?? err));
          localHasMore = false;
          break;
        }
      }

      if (mounted) {
        setHasMore(localHasMore);
        setLoading(false);
      }
    }

    runAutoFetch();

    return () => {
      mounted = false;
      abortRef.current?.abort();
    };
  }, [statusFilter]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const params = new URLSearchParams();
      params.set('page', String(nextPage));
      params.set('per_page', String(DEFAULT_PAGE_SIZE));
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/matches?${params.toString()}`);
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`API error ${res.status} ${txt}`);
      }
      const payload = await res.json();
      const items: Match[] = Array.isArray(payload)
        ? payload
        : payload.items ?? payload.data ?? [];
      setMatches((prev) => [...prev, ...items]);
      setPage(nextPage);
      setHasMore(items.length === DEFAULT_PAGE_SIZE);
    } catch (err: any) {
      console.error('Load more failed', err);
      setError(String(err.message ?? err));
    } finally {
      setLoadingMore(false);
    }
  };

  // display at most MAX_DISPLAYED_MATCHES
  const displayedMatches = matches.slice(0, MAX_DISPLAYED_MATCHES);

  function pillClass(tab: StatusFilter) {
    const base =
      'px-4 py-2 rounded-lg transition-colors whitespace-nowrap inline-flex items-center gap-2';
    if (statusFilter === tab) {
      if (tab === 'running') return `${base} bg-red-600 text-white`;
      if (tab === 'finished') return `${base} bg-green-600 text-white`;
      if (tab === 'not_started') return `${base} bg-blue-600 text-white`;
      return `${base} bg-gray-800 text-white`;
    }
    return `${base} bg-[#1a1a1a] text-gray-300 hover:bg-[#262626]`;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 flex-1 max-w-6xl mx-auto w-full">
      <h1 className="text-2xl md:text-3xl font-bold text-white">
        Dota 2 — Live Matches
      </h1>

      <div className="overflow-x-auto pb-2">
        <div className="flex space-x-2 min-w-max">
          <button
            className={pillClass('all')}
            onClick={() => {
              setStatusFilter('all');
              setPage(1);
              setMatches([]);
            }}
          >
            <span className="text-sm font-medium">All</span>
          </button>

          <button
            className={pillClass('running')}
            onClick={() => {
              setStatusFilter('running');
              setPage(1);
              setMatches([]);
            }}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
            <span className="text-sm font-medium">Live</span>
          </button>

          <button
            className={pillClass('finished')}
            onClick={() => {
              setStatusFilter('finished');
              setPage(1);
              setMatches([]);
            }}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
            <span className="text-sm font-medium">Finished</span>
          </button>

          <button
            className={pillClass('not_started')}
            onClick={() => {
              setStatusFilter('not_started');
              setPage(1);
              setMatches([]);
            }}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-sm font-medium">Scheduled</span>
          </button>
        </div>
      </div>

      {loading && matches.length === 0 ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400">
          <p>{error}</p>
        </div>
      ) : displayedMatches.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400 text-lg">No Dota 2 matches found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedMatches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}

      {/* Load More */}
      <div className="flex justify-center mt-6">
        {loadingMore ? (
          <button
            disabled
            className="bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center"
          >
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Loading...
          </button>
        ) : hasMore && !loading ? (
          <button
            onClick={loadMore}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Load More Matches
          </button>
        ) : null}
      </div>

      {statusFilter === 'running' && matches.length > 0 && (
        <div className="text-center text-gray-500 text-sm">
          Live matches automatically refresh every 30 seconds
        </div>
      )}
    </div>
  );
}
