// components/TeamHoverCard.tsx
'use client';
import React, { useState, useEffect } from 'react';
import ImageWithFallback from './ImageWithFallback';

interface Props {
  teamId: number | string;
  logo?: string | null;
  name?: string;
}

export default function TeamHoverCard({ teamId, logo, name }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<any>(null);

  useEffect(() => {
    if (!open || payload) return;
    setLoading(true);
    fetch(`/api/teams/${teamId}`)
      .then((r) => r.json())
      .then((data) => setPayload(data))
      .catch(() => setPayload(null))
      .finally(() => setLoading(false));
  }, [open, payload, teamId]);

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="flex items-center gap-2"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800">
          {logo ? (
            <ImageWithFallback
              src={logo}
              alt={name ?? 'team'}
              width={32}
              height={32}
            />
          ) : (
            <div className="w-8 h-8 bg-gray-700" />
          )}
        </div>
      </button>

      {open && (
        <div
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="absolute z-40 mt-2 right-0 w-64 bg-[#0f0f0f] border border-gray-800 rounded-xl shadow-lg p-3 text-sm"
        >
          {loading ? (
            <div className="text-gray-400">Loading…</div>
          ) : payload?.team ? (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800">
                  {payload.team.logo_url ? (
                    <ImageWithFallback
                      src={payload.team.logo_url}
                      alt={payload.team.name}
                      width={40}
                      height={40}
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-700" />
                  )}
                </div>
                <div>
                  <div className="text-white font-semibold">
                    {payload.team.name ?? payload.team.tag ?? 'Team'}
                  </div>
                  <div className="text-xs text-gray-400">
                    Team ID: {payload.team.team_id ?? payload.team.id}
                  </div>
                </div>
              </div>

              <div className="mb-2">
                <div className="text-xs text-gray-400 mb-1">Recent results</div>
                {payload.recentMatches && payload.recentMatches.length ? (
                  <ul className="space-y-1">
                    {payload.recentMatches.map((m: any, i: number) => (
                      <li
                        key={i}
                        className="text-gray-300 text-xs flex justify-between"
                      >
                        <span className="truncate">
                          {m.name ??
                            `${m.radiant_name ?? ''} vs ${m.dire_name ?? ''}`}
                        </span>
                        <span className="ml-2 text-gray-400">
                          {typeof m.radiant_score === 'number' &&
                          typeof m.dire_score === 'number'
                            ? `${m.radiant_score}-${m.dire_score}`
                            : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-gray-500">No recent matches</div>
                )}
              </div>

              <div className="flex justify-end">
                <a
                  href={`/teams/${teamId}`}
                  className="text-xs text-blue-400 hover:underline"
                >
                  View team page →
                </a>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">No data</div>
          )}
        </div>
      )}
    </div>
  );
}
