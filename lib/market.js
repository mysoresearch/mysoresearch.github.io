import yahooFinance from 'yahoo-finance2';

export const SECTORS = {
  Energy: {
    tickers: ['CCJ', 'CEG', 'VST', 'SMR', 'OKLO', 'UEC', 'NLR', 'URA'],
    newsQuery: 'nuclear energy uranium reactor SMR Oklo',
    names: {
      CCJ: 'Cameco', CEG: 'Constellation Energy', VST: 'Vistra',
      SMR: 'NuScale Power', OKLO: 'Oklo', UEC: 'Uranium Energy',
      NLR: 'NLR ETF', URA: 'URA ETF',
    },
  },
  Biosciences: {
    tickers: ['LLY', 'VRTX', 'REGN', 'MRNA', 'NTLA', 'CRSP', 'BIIB', 'XBI'],
    newsQuery: 'biotech pharma CRISPR gene therapy GLP-1 FDA drug approval',
    names: {
      LLY: 'Eli Lilly', VRTX: 'Vertex Pharma', REGN: 'Regeneron',
      MRNA: 'Moderna', NTLA: 'Intellia', CRSP: 'CRISPR Therapeutics',
      BIIB: 'Biogen', XBI: 'XBI ETF',
    },
  },
  AI: {
    tickers: ['NVDA', 'MSFT', 'GOOGL', 'AMD', 'IONQ', 'RGTI', 'SMCI', 'SOXL'],
    newsQuery: 'artificial intelligence nvidia quantum computing semiconductor chips',
    names: {
      NVDA: 'Nvidia', MSFT: 'Microsoft', GOOGL: 'Alphabet', AMD: 'AMD',
      IONQ: 'IonQ', RGTI: 'Rigetti', SMCI: 'Super Micro', SOXL: 'SOXL ETF',
    },
  },
};

async function fetchQuotes(sector) {
  const { tickers, names } = SECTORS[sector];
  const results = await Promise.allSettled(tickers.map(t => yahooFinance.quote(t)));
  return results
    .map((r, i) => {
      if (r.status !== 'fulfilled' || !r.value) return null;
      const q = r.value;
      return {
        ticker: tickers[i],
        name: names[tickers[i]],
        close: q.regularMarketPrice ?? 0,
        change: q.regularMarketChangePercent ?? 0,
        volume: q.regularMarketVolume ?? 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.change - a.change);
}

async function fetchNews(sector) {
  const { newsQuery } = SECTORS[sector];
  try {
    const result = await yahooFinance.search(newsQuery, { newsCount: 9, quotesCount: 0 });
    return (result.news || []).map(a => ({
      title: a.title || '',
      url: a.link || '',
      publisher: a.publisher || '',
      published: a.providerPublishTime
        ? new Date(a.providerPublishTime).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })
        : '',
      thumbnail: a.thumbnail?.resolutions?.[0]?.url || '',
    }));
  } catch {
    return [];
  }
}

export async function getMarketData() {
  const sectors = Object.keys(SECTORS);
  const [quotesResults, newsResults] = await Promise.all([
    Promise.all(sectors.map(s => fetchQuotes(s).then(q => [s, q]).catch(() => [s, []]))),
    Promise.all(sectors.map(s => fetchNews(s).then(n => [s, n]).catch(() => [s, []]))),
  ]);
  return {
    updatedAt: new Date().toUTCString(),
    sectors: Object.fromEntries(quotesResults),
    news: Object.fromEntries(newsResults),
  };
}
