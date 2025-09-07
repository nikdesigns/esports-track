// app/api/teams/[id]/route.ts
import { NextResponse } from 'next/server';

const TEAM_URL = (id: string | number) =>
  `https://api.opendota.com/api/teams/${id}`;
const TEAM_MATCHES_URL = (id: string | number, limit = 5) =>
  `https://api.opendota.com/api/teams/${id}/matches?limit=${limit}`;

const teamApiCache = new Map<string, { ts: number; data: any }>();
const TTL = 30 * 1000;

async function fetchJson(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

/** GET /api/teams/:id */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const cached = teamApiCache.get(id);
  const now = Date.now();
  if (cached && now - cached.ts < TTL) {
    return NextResponse.json(cached.data);
  }

  const [team, matches] = await Promise.all([
    fetchJson(TEAM_URL(id)),
    fetchJson(TEAM_MATCHES_URL(id)),
  ]);

  const payload = {
    team: team ?? null,
    recentMatches: Array.isArray(matches) ? matches.slice(0, 5) : [],
  };
  teamApiCache.set(id, { ts: Date.now(), data: payload });
  return NextResponse.json(payload);
}
