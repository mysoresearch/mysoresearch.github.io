const KEY  = process.env.FINNHUB_API_KEY;
const BASE = 'https://finnhub.io/api/v1';

const SECTORS = {
  Energy: {
    tickers: ['CCJ', 'CEG', 'VST', 'SMR', 'OKLO', 'UEC', 'URA'],
    names: {
      CCJ: 'Cameco', CEG: 'Constellation Energy', VST: 'Vistra',
      SMR: 'NuScale Power', OKLO: 'Oklo', UEC: 'Uranium Energy', URA: 'URA ETF',
    },
  },
  Biosciences: {
    tickers: ['LLY', 'VRTX', 'REGN', 'MRNA', 'CRSP', 'BIIB', 'XBI'],
    names: {
      LLY: 'Eli Lilly', VRTX: 'Vertex Pharma', REGN: 'Regeneron',
      MRNA: 'Moderna', CRSP: 'CRISPR Therapeutics', BIIB: 'Biogen', XBI: 'XBI ETF',
    },
  },
  AI: {
    tickers: ['NVDA', 'MSFT', 'GOOGL', 'AMD', 'IONQ', 'RGTI', 'SMCI'],
    names: {
      NVDA: 'Nvidia', MSFT: 'Microsoft', GOOGL: 'Alphabet', AMD: 'AMD',
      IONQ: 'IonQ', RGTI: 'Rigetti', SMCI: 'Super Micro',
    },
  },
};

async function get(path) {
  const res = await fetch(`${BASE}${path}&token=${KEY}`, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`Finnhub ${res.status}: ${path}`);
  return res.json();
}

async function fetchQuotes(sector) {
  const { tickers, names } = SECTORS[sector];
  const results = await Promise.allSettled(
    tickers.map(t => get(`/quote?symbol=${t}`).then(q => ({
      ticker: t,
      name: names[t],
      close: q.c ?? 0,
      change: q.dp ?? 0,
      volume: q.v ?? 0,
    })))
  );
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
    .sort((a, b) => b.change - a.change);
}

async function fetchNews(sector) {
  const { tickers } = SECTORS[sector];
  const seen = new Set();
  const articles = [];

  const today = new Date();
  const from  = new Date(today - 7 * 86400000).toISOString().slice(0, 10);
  const to    = today.toISOString().slice(0, 10);

  for (const ticker of tickers) {
    if (articles.length >= 9) break;
    try {
      const news = await get(`/company-news?symbol=${ticker}&from=${from}&to=${to}`);
      for (const a of news) {
        if (articles.length >= 9) break;
        if (!a.url || !a.headline || seen.has(a.url)) continue;
        seen.add(a.url);
        articles.push({
          title:     a.headline,
          url:       a.url,
          publisher: a.source,
          published: new Date(a.datetime * 1000).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          }),
          thumbnail: a.image || '',
          ticker,
        });
      }
    } catch { continue; }
  }
  return articles;
}

export async function getMarketData() {
  const sectors = Object.keys(SECTORS);
  const [quotesArr, newsArr] = await Promise.all([
    Promise.all(sectors.map(s => fetchQuotes(s).then(q => [s, q]).catch(() => [s, []]))),
    Promise.all(sectors.map(s => fetchNews(s).then(n => [s, n]).catch(() => [s, []]))),
  ]);
  return {
    updatedAt: new Date().toUTCString(),
    sectors:   Object.fromEntries(quotesArr),
    news:      Object.fromEntries(newsArr),
  };
}
