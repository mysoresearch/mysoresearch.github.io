import { NextResponse } from 'next/server';

export const revalidate = 1800;

export async function GET() {
  try {
    const url   = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      return NextResponse.json({ error: 'Upstash not configured' }, { status: 500 });
    }

    const res = await fetch(`${url}/get/market_data`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 1800 },
    });

    const { result } = await res.json();

    if (!result) {
      return NextResponse.json({ error: 'No data yet — run the GitHub Actions workflow first' }, { status: 404 });
    }

    const data = JSON.parse(result);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
