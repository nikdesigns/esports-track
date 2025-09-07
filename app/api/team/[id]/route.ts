// app/api/team/[id]/route.ts
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id)
    return NextResponse.json({ error: 'Missing team id' }, { status: 400 });

  try {
    // Team info
    const teamRes = await fetch(
      `https://api.opendota.com/api/teams/${encodeURIComponent(id)}`
    );
    if (!teamRes.ok) {
      const txt = await teamRes.text().catch(() => '');
      return NextResponse.json(
        { error: `OpenDota /teams responded ${teamRes.status}`, details: txt },
        { status: 502 }
      );
    }
    const team = await teamRes.json();

    // Recent matches for the team (OpenDota supports /teams/{team_id}/matches)
    const matchesRes = await fetch(
      `https://api.opendota.com/api/teams/${encodeURIComponent(
        id
      )}/matches?limit=10`
    );
    const matches = matchesRes.ok ? await matchesRes.json() : [];

    // Normalize and return
    return NextResponse.json(
      {
        team: {
          id: team.team_id ?? team.teamId ?? null,
          name: team.name ?? team.tag ?? null,
          tag: team.tag ?? null,
          logo_url: team.logo_url ?? team.logo ?? null,
          rating: team.rating ?? null,
          wins: team.wins ?? null,
          losses: team.losses ?? null,
          tracked_until: team.tracked_until ?? null,
        },
        recent_matches: matches.map((m: any) => ({
          match_id: m.match_id ?? m.match_id,
          start_time: m.start_time ?? m.start_time ?? null,
          radiant_win: m.radiant_win ?? null,
          radiant: m.radiant ?? null,
          opposing_team_id: m.opposing_team_id ?? m.opposing_team_id ?? null,
          opposing_team_name:
            m.opposing_team_name ?? m.opposing_team_name ?? null,
          score: m.score ?? null,
          // OpenDota sometimes returns other fields — include raw for debugging
          raw: m,
        })),
      },
      {
        status: 200,
        headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
      }
    );
  } catch (err: any) {
    console.error('Team route error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
