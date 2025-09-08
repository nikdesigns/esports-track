// app/api/matches/[id]/route.ts
import { NextResponse } from 'next/server';

const STRATZ_API_URL =
  process.env.STRATZ_API_URL || 'https://api.stratz.com/graphql';
const STRATZ_API_KEY = process.env.STRATZ_API_KEY || '';
const OPENDOTA_MATCH = 'https://api.opendota.com/api/matches'; // append /{id}

async function timedFetch(
  url: string,
  opts: RequestInit = {},
  timeout = 10000
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

function normalizeStratzDetail(node: any) {
  const id = node?.id ?? node?.matchId ?? null;
  const leagueName = node?.league?.name ?? node?.tournament?.name ?? null;

  const getTeam = (t: any) =>
    t
      ? {
          id: t?.id ?? t?.teamId ?? null,
          name: t?.name ?? t?.acronym ?? t?.displayName ?? null,
          acronym: t?.acronym ?? null,
          image_url: t?.logoUrl ?? t?.imageUrl ?? null,
        }
      : { id: null, name: null, acronym: null, image_url: null };

  let opponents = [];
  if (node?.teams && Array.isArray(node.teams))
    opponents = node.teams
      .slice(0, 2)
      .map((t: any) => ({ opponent: getTeam(t) }));
  else if (node?.teamA || node?.teamB)
    opponents = [
      { opponent: getTeam(node.teamA) },
      { opponent: getTeam(node.teamB) },
    ];

  const score = [
    node?.scoreA ?? node?.radiantScore ?? null,
    node?.scoreB ?? node?.direScore ?? null,
  ];

  // picks/bans: try a couple possible shapes
  const picks =
    node?.draft?.picks ??
    node?.draft ??
    node?.picks ??
    node?.picksBans ??
    (node?.draft?.picksBans ? node.draft.picksBans : null) ??
    null;

  // maps: node.maps or node.games
  const maps = node?.maps ?? node?.games ?? node?.mapResults ?? null;

  return {
    id,
    name:
      node?.name ??
      `${opponents?.[0]?.opponent?.name ?? 'Team A'} vs ${
        opponents?.[1]?.opponent?.name ?? 'Team B'
      }`,
    scheduled_at: node?.scheduledAt ?? node?.startAt ?? node?.startUtc ?? null,
    begin_at: node?.beginAt ?? node?.startedAt ?? node?.startAt ?? null,
    status: node?.status ?? node?.state ?? null,
    opponents,
    score,
    picks,
    maps,
    videogame: { slug: 'dota2' },
    league: { name: leagueName, image_url: node?.league?.imageUrl ?? null },
    raw: node,
  };
}

export async function GET(
  req: Request,
  { params }: { params: { id?: string } }
) {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // Try Stratz GraphQL detail (request picks/maps)
  try {
    const graphQuery = `
      query MatchById($id: ID!) {
        match(id: $id) {
          id
          name
          startAt
          scheduledAt
          status
          league { id name imageUrl }
          teams { id name acronym logoUrl }
          scoreA
          scoreB
          draft { picks bans }
          maps { mapName results { teamAScore teamBScore } }
        }
      }
    `;
    const body = { query: graphQuery, variables: { id } };
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (STRATZ_API_KEY) headers['Authorization'] = `Bearer ${STRATZ_API_KEY}`;

    const res = await timedFetch(
      STRATZ_API_URL,
      { method: 'POST', headers, body: JSON.stringify(body) },
      12000
    );
    const text = await res.text().catch(() => '');
    if (!res.ok) {
      console.warn('[api/matches/id] Stratz non-OK', res.status, text);
      throw new Error('Stratz non-ok');
    }
    const json = JSON.parse(text);
    const node = json?.data?.match ?? json?.match ?? null;
    if (node) {
      return NextResponse.json(normalizeStratzDetail(node));
    }
    // else fallthrough
  } catch (err) {
    console.warn(
      '[api/matches/id] Stratz failed, falling back to OpenDota',
      err?.message ?? err
    );
  }

  // Fallback: OpenDota matches/{id}
  try {
    const odUrl = `${OPENDOTA_MATCH}/${id}`;
    const res = await timedFetch(odUrl, { method: 'GET' }, 10000);
    const text = await res.text().catch(() => '');
    if (!res.ok) {
      console.error('[api/matches/id] OpenDota non-OK', res.status, text);
      return NextResponse.json(
        { error: 'OpenDota upstream error', status: res.status, details: text },
        { status: 502 }
      );
    }
    const data = JSON.parse(text);

    const opponents =
      data?.radiant_name || data?.dire_name
        ? [
            {
              opponent: {
                id: data?.radiant_team_id ?? null,
                name: data?.radiant_name ?? 'Radiant',
                acronym: null,
                image_url: null,
              },
            },
            {
              opponent: {
                id: data?.dire_team_id ?? null,
                name: data?.dire_name ?? 'Dire',
                acronym: null,
                image_url: null,
              },
            },
          ]
        : [
            {
              opponent: {
                id: data?.radiant_team_id ?? null,
                name: 'Radiant',
                acronym: null,
                image_url: null,
              },
            },
            {
              opponent: {
                id: data?.dire_team_id ?? null,
                name: 'Dire',
                acronym: null,
                image_url: null,
              },
            },
          ];

    const score = [data?.radiant_score ?? null, data?.dire_score ?? null];
    const status = data?.duration
      ? 'finished'
      : data?.start_time
      ? 'running'
      : 'not_started';

    const normalized = {
      id: data?.match_id ?? data?.match_seq_num ?? id,
      name: data?.match_id
        ? data?.radiant_name && data?.dire_name
          ? `${data.radiant_name} vs ${data.dire_name}`
          : data?.name ?? ''
        : data?.name ?? '',
      scheduled_at: data?.start_time
        ? new Date(data.start_time * 1000).toISOString()
        : null,
      begin_at: data?.start_time
        ? new Date(data.start_time * 1000).toISOString()
        : null,
      status,
      opponents,
      score,
      picks: data?.drafts ?? data?.picks ?? null,
      maps: data?.games ?? null,
      videogame: { slug: 'dota2' },
      league: {
        name: data?.league?.name ?? null,
        image_url: data?.league?.image_url ?? null,
      },
      raw: data,
    };

    return NextResponse.json(normalized);
  } catch (err: any) {
    console.error('[api/matches/id] OpenDota fallback failed', err);
    return NextResponse.json(
      { error: 'Server error fetching match detail' },
      { status: 500 }
    );
  }
}
