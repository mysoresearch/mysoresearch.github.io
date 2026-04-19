import Database from 'better-sqlite3';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'market.db');
    const db     = new Database(dbPath, { readonly: true });

    const quotes = db.prepare(
      'SELECT * FROM quotes ORDER BY sector, change_pct DESC'
    ).all();

    const articles = db.prepare(
      'SELECT * FROM news ORDER BY published_ts DESC'
    ).all();

    const updatedAt = db.prepare(
      'SELECT updated_at FROM quotes LIMIT 1'
    ).get()?.updated_at ?? '';

    db.close();

    const sectors = {};
    for (const q of quotes) {
      if (!sectors[q.sector]) sectors[q.sector] = [];
      sectors[q.sector].push({
        ticker: q.ticker,
        name:   q.name,
        close:  q.close,
        change: q.change_pct,
        volume: q.volume,
      });
    }

    const news = {};
    for (const a of articles) {
      if (!news[a.sector]) news[a.sector] = [];
      news[a.sector].push({
        title:     a.title,
        url:       a.url,
        publisher: a.publisher,
        published: a.published,
        thumbnail: a.thumbnail,
        ticker:    a.ticker,
      });
    }

    return Response.json({ updatedAt, sectors, news });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
