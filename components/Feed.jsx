'use client';

import { useState, useEffect } from 'react';

const SECTORS = ['Energy', 'Biosciences', 'AI'];
const SECTOR_CLASS = { Energy: 'energy', Biosciences: 'bio', AI: 'ai' };

const GRADIENTS = {
  Energy:      'linear-gradient(135deg, #f0a500 0%, #c47d00 100%)',
  Biosciences: 'linear-gradient(135deg, #1a7f37 0%, #2da44e 100%)',
  AI:          'linear-gradient(135deg, #6e40c9 0%, #9a6dd7 100%)',
};

export default function Feed() {
  const [tab, setTab]         = useState('news');
  const [active, setActive]   = useState('All');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    fetch('/api/market')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const visibleSectors = active === 'All' ? SECTORS : [active];

  const reels = data
    ? visibleSectors.flatMap(sector =>
        (data.news?.[sector] ?? []).map(a => ({ ...a, sector }))
      )
    : [];

  return (
    <div className="app">
      {/* Top bar */}
      <header className="topbar">
        <h1 className="logo">mysoresearch</h1>
        <div className="sector-pills">
          {['All', ...SECTORS].map(s => (
            <button
              key={s}
              className={`sector-pill${active === s ? ' active' : ''}${active === s && SECTOR_CLASS[s] ? ' ' + SECTOR_CLASS[s] : ''}`}
              onClick={() => setActive(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      {/* News reels */}
      {tab === 'news' && (
        loading ? (
          <div className="full-center">Loading market data…</div>
        ) : error ? (
          <div className="full-center" style={{ color: '#f85149' }}>
            Failed to load: {error}
          </div>
        ) : reels.length === 0 ? (
          <div className="full-center">No articles available.</div>
        ) : (
          <div className="reels-wrap">
            {reels.map((article, i) => (
              <ReelCard key={i} article={article} />
            ))}
          </div>
        )
      )}

      {/* Stocks list */}
      {tab === 'stocks' && (
        <div className="stocks-wrap">
          {loading && <div className="full-center">Loading…</div>}
          {error   && <div className="full-center" style={{ color: '#f85149' }}>Failed: {error}</div>}
          {data && visibleSectors.map(sector => (
            <StockGroup key={sector} sector={sector} stocks={data.sectors?.[sector] ?? []} />
          ))}
          <p className="disclaimer">
            For educational purposes only. Not financial advice. Consult a licensed financial advisor.
          </p>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="tabbar">
        <button className={`tab-btn${tab === 'news' ? ' active' : ''}`} onClick={() => setTab('news')}>
          <span className="tab-icon">📰</span>
          News
        </button>
        <button className={`tab-btn${tab === 'stocks' ? ' active' : ''}`} onClick={() => setTab('stocks')}>
          <span className="tab-icon">📈</span>
          Stocks
        </button>
      </nav>
    </div>
  );
}

function ReelCard({ article }) {
  const [imgFailed, setImgFailed] = useState(false);
  const sectorClass = SECTOR_CLASS[article.sector] ?? '';

  return (
    <div className="reel">
      {article.thumbnail && !imgFailed ? (
        <img
          className="reel-bg"
          src={article.thumbnail}
          alt=""
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="reel-placeholder" style={{ background: GRADIENTS[article.sector] }}>
          {article.title}
        </div>
      )}

      <div className="reel-gradient" />

      <div className="reel-content">
        <span className={`reel-sector ${sectorClass}`}>{article.sector}</span>
        <p className="reel-title">{article.title}</p>
        <p className="reel-meta">
          {article.publisher}{article.published ? ` · ${article.published}` : ''}
        </p>
        {article.url && (
          <a className="reel-link" href={article.url} target="_blank" rel="noopener noreferrer">
            Read article ↗
          </a>
        )}
      </div>

      <div className="reel-actions">
        <div className="reel-action">
          <span className="icon">🔖</span>
          <span>Save</span>
        </div>
        <div className="reel-action">
          <span className="icon">↗</span>
          <span>Share</span>
        </div>
      </div>
    </div>
  );
}

function StockGroup({ sector, stocks }) {
  if (stocks.length === 0) return null;
  return (
    <div className="sector-group">
      <p className="sector-heading">{sector}</p>
      {stocks.map(s => <StockRow key={s.ticker} stock={s} />)}
    </div>
  );
}

function StockRow({ stock }) {
  const up = stock.change >= 0;
  return (
    <div className="stock-row">
      <div className="sr-left">
        <div className="sr-ticker">{stock.ticker}</div>
        <div className="sr-name">{stock.name}</div>
      </div>
      <div className="sr-right">
        <div className="sr-price">${stock.close.toFixed(2)}</div>
        <div className={`sr-chg ${up ? 'up' : 'down'}`}>
          {up ? '+' : ''}{stock.change.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}
