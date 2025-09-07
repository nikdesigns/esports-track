// app/api/videogames/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const token =
    process.env.PANDASCORE_API_KEY ||
    process.env.NEXT_PUBLIC_PANDASCORE_API_KEY;
  if (!token) {
    return NextResponse.json(
      { error: 'PandaScore API key not configured on server.' },
      { status: 500 }
    );
  }

  const url = `https://api.pandascore.co/videogames?sort=name&per_page=200`; // fetch many to cover all
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      // optional: set a reasonable timeout by using AbortController if you want
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `PandaScore returned ${res.status}`, details: body },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Normalize: return only fields we need (id, name, slug)
    const games = Array.isArray(data)
      ? data.map((g: any) => ({
          id: g.id,
          name: g.name,
          slug: (g.slug ?? g.name ?? '').toString(),
        }))
      : [];

    // Optionally sort by name
    games.sort((a: any, b: any) =>
      String(a.name).localeCompare(String(b.name))
    );

    // Cache for 60s (so we don't spam PandaScore from serverless)
    return NextResponse.json(
      { games },
      {
        status: 200,
        headers: {
          'Cache-Control': 's-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (err: any) {
    console.error('Failed to fetch videogames from pandascore:', err);
    return NextResponse.json(
      { error: 'Failed to fetch videogames', details: String(err) },
      { status: 500 }
    );
  }
}
