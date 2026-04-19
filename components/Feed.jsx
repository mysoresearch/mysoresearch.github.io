'use client';

import { useState, useEffect } from 'react';

const SECTORS = ['Energy', 'Biosciences', 'AI'];

const STORY_CONFIG = {
  All:         { icon: '🌍' },
  Energy:      { icon: '⚛️' },
  Biosciences: { icon: '🧬' },
  AI:          { icon: '🧠' },
};

const GRADIENTS = {
  Energy:      'linear-gradient(135deg, #f0a500, #c47d00)',
  Biosciences: 'linear-gradient(135deg, #1a7f37, #2da44e)',
  AI:          'linear-gradient(135deg, #6e40c9, #9a6dd7)',
};

export default function Feed() {
  const [active, setActive]   = useState('All');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    fetch('/api/market')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const visibleSectors = active === 'All' ? SECTORS : [active];

  return (
    <>
      {/* Top bar */}
      <header className="topbar">
        <h1 className="logo">mysoresearch</h1>
        <span className="topbar-sub">
          {data
            ? `Updated ${new Date(data.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
            : 'US Emerging Trends'}
        </span>
      </header>

      {/* Stories / sector filter */}
      <div className="stories-wrap">
        <div className="stories">
          {Object.entries(STORY_CONFIG).map(([sector, cfg]) => (
            <button
              key={sector}
              className="story-btn"
              onClick={() => setActive(sector)}
            >
              <div className={`story-ring ${active === sector ? 'ring-active' : ''}`}>
                <div className="story-inner">{cfg.icon}</div>
              </div>
              <span>{sector}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <main className="feed">
        {loading && (
          <p style={{ textAlign: 'center', color: '#8e8e8e', padding: '3rem' }}>
            Loading market data…
          </p>
        )}

        {error && (
          <p style={{ textAlign: 'center', color: '#d93025', padding: '3rem' }}>
            Failed to load data: {error}
          </p>
        )}

        {data && visibleSectors.map(sector => (
          <SectorSection
            key={sector}
            sector={sector}
            stocks={data.sectors?.[sector] ?? []}
            articles={data.news?.[sector] ?? []}
          />
        ))}
      </main>

      <p className="disclaimer">
        For educational and informational purposes only. Not financial advice.
        Investing involves risk. Consult a licensed financial advisor before making investment decisions.
      </p>

      <footer>&copy; {new Date().getFullYear()} Mysoresearch</footer>
    </>
  );
}

function SectorSection({ sector, stocks, articles }) {
  return (
    <section className="sector-section">
      <p className="section-label">{sector}</p>

      {stocks.length > 0 && (
        <div className="stocks-strip">
          {stocks.map(s => <StockPill key={s.ticker} stock={s} />)}
        </div>
      )}

      {articles.length > 0 && (
        <div className="news-grid">
          {articles.map((a, i) => (
            <NewsCard key={i} article={a} sector={sector} />
          ))}
        </div>
      )}

      {stocks.length === 0 && articles.length === 0 && (
        <p style={{ color: '#8e8e8e', fontSize: '0.85rem', padding: '1rem 0' }}>
          No data available.
        </p>
      )}
    </section>
  );
}

function StockPill({ stock }) {
  const up = stock.change >= 0;
  return (
    <div className="stock-pill">
      <div>
        <div className="sp-ticker">{stock.ticker}</div>
        <div className="sp-name">{stock.name}</div>
      </div>
      <div className="sp-right">
        <div className="sp-price">${stock.close.toFixed(2)}</div>
        <div className={`sp-chg ${up ? 'up' : 'down'}`}>
          {up ? '+' : ''}{stock.change.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

function NewsCard({ article, sector }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <a className="news-card" href={article.url} target="_blank" rel="noopener noreferrer">
      <div className="nc-image-wrap">
        {article.thumbnail && !imgFailed ? (
          <img
            src={article.thumbnail}
            alt=""
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="nc-placeholder" style={{ background: GRADIENTS[sector] }}>
            <p>{article.title.slice(0, 70)}{article.title.length > 70 ? '…' : ''}</p>
          </div>
        )}
        <div className="nc-overlay">
          <div className="nc-overlay-text">
            <div className="nc-overlay-title">{article.title}</div>
            <div className="nc-overlay-meta">
              {article.publisher}{article.published ? ` · ${article.published}` : ''}
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}
