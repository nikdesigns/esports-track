// components/HeroTrends.tsx
'use client';

import React, { useEffect, useState } from 'react';

type HeroStat = {
  id: number | null;
  name?: string | null;
  localized_name?: string | null;
  img_full?: string | null;
  icon_full?: string | null;
  pick?: number;
  win?: number;
  win_rate?: number; // percentage 0-100
  pro_pick?: number;
  pro_win?: number;
};

export default function HeroTrends({ limit = 20 }: { limit?: number }) {
  const [heroes, setHeroes] = useState<HeroStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/hero-stats', { cache: 'no-store' });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(`Server error: ${res.status} ${txt}`);
        }
        const data = await res.json();
        if (!mounted) return;
        setHeroes(Array.isArray(data) ? data.slice(0, limit) : []);
      } catch (err: any) {
        console.error('Failed to load hero trends', err);
        if (mounted) setError(err?.message ?? 'Failed to load hero trends');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [limit]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: limit }).map((_, i) => (
          <div
            key={i}
            className="p-3 bg-[#0f0f0f] border border-gray-800 rounded-xl animate-pulse h-28"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-400">{error}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Hero trends</h3>
        <div className="text-sm text-gray-400">Top {heroes.length}</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {heroes.map((h) => (
          <div
            key={String(h.id) + (h.name ?? '')}
            className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-800 flex items-center justify-center">
                {h.img_full ? (
                  <img
                    src={h.img_full}
                    alt={h.localized_name ?? h.name ?? 'hero'}
                    className="object-contain w-full h-full"
                  />
                ) : (
                  <div className="text-xs text-gray-300">No</div>
                )}
              </div>

              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">
                  {h.localized_name ?? h.name}
                </div>
                <div className="text-xs text-gray-400">Pick: {h.pick ?? 0}</div>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-gray-400">Win rate</div>
                <div className="text-xs font-semibold text-white">
                  {(h.win_rate ?? 0).toFixed(1)}%
                </div>
              </div>

              <div className="h-2 bg-[#111] rounded overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${Math.max(0, Math.min(100, h.win_rate ?? 0))}%`,
                    background: 'linear-gradient(90deg,#00b894,#00d084)',
                  }}
                />
              </div>

              {(h.pro_pick || h.pro_win) && (
                <div className="mt-2 text-xs text-gray-400 flex items-center justify-between">
                  <div>Pro: {h.pro_pick ?? 0} picks</div>
                  <div>{h.pro_win ?? 0} wins</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
