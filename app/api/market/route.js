import { NextResponse } from 'next/server';
import { getMarketData } from '@/lib/market';

export const revalidate = 1800; // cache for 30 min

export async function GET() {
  try {
    const data = await getMarketData();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
