// app/api/rankings/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://api.opendota.com/api/teams');
    if (!res.ok)
      return NextResponse.json(
        { error: `OpenDota API responded with ${res.status}` },
        { status: 502 }
      );
    const teams = await res.json();

    // `teams` contains objects with: team_id, name, wins, losses, rating, last_match_time, tag
    return NextResponse.json(
      { rankings: teams },
      { status: 200, headers: { 'Cache-Control': 's-maxage=300' } }
    );
  } catch (err: any) {
    console.error('Error fetching OpenDota teams', err);
    return NextResponse.json(
      { error: err.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
