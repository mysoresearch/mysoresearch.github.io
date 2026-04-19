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

    const actions = db.prepare(
      'SELECT * FROM analyst_actions ORDER BY action_date DESC'
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

    const analystBySector = {};
    for (const a of actions) {
      if (!analystBySector[a.sector]) analystBySector[a.sector] = [];
      analystBySector[a.sector].push({
        ticker:     a.ticker,
        firm:       a.firm,
        action:     a.action,
        from_grade: a.from_grade,
        to_grade:   a.to_grade,
        date:       a.action_date,
      });
    }

    return Response.json({ updatedAt, sectors, actions: analystBySector });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
