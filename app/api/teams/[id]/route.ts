// app/api/teams/[id]/route.ts
import { NextResponse } from 'next/server';

const TEAM_URL = (id: string | number) =>
  `https://api.opendota.com/api/teams/${id}`;
const TEAM_MATCHES_URL = (id: string | number, limit = 5) =>
  `https://api.opendota.com/api/teams/${id}/matches?limit=${limit}`;

async function fetchJson(url: string, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch (e) {
    clearTimeout(timer);
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  const [team, recentMatches] = await Promise.all([
    fetchJson(TEAM_URL(id)),
    fetchJson(TEAM_MATCHES_URL(id, 5)),
  ]);

  const payload = {
    team: team ?? null,
    recentMatches: Array.isArray(recentMatches)
      ? recentMatches.slice(0, 5)
      : [],
    fetchedAt: Date.now(),
  };

  return NextResponse.json(payload);
}
