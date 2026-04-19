'use client';

import { useState, useEffect } from 'react';

const SECTORS = ['Energy', 'Biosciences', 'AI'];
const SECTOR_CLASS = { Energy: 'energy', Biosciences: 'bio', AI: 'ai' };

const GRADIENTS = {
  Energy:      'linear-gradient(160deg, #1a0e00 0%, #3d2200 50%, #1a0e00 100%)',
  Biosciences: 'linear-gradient(160deg, #001a0e 0%, #003d22 50%, #001a0e 100%)',
  AI:          'linear-gradient(160deg, #0e0022 0%, #22003d 50%, #0e0022 100%)',
};

const ACTION_LABEL = {
  up:   'UPGRADE',
  down: 'DOWNGRADE',
  init: 'INITIATION',
  reit: 'REITERATION',
  main: 'MAINTAINED',
};

const ACTION_COLOR = {
  up:   '#3fb950',
  down: '#f85149',
  init: '#38bdf8',
  reit: '#a78bfa',
  main: '#8e8e8e',
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
        (data.actions?.[sector] ?? []).map(a => ({ ...a, sector }))
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

      {/* Analyst actions reels */}
      {tab === 'news' && (
        loading ? (
          <div className="full-center">Loading analyst data…</div>
        ) : error ? (
          <div className="full-center" style={{ color: '#f85149' }}>Failed: {error}</div>
        ) : reels.length === 0 ? (
          <div className="full-center">No analyst actions available.</div>
        ) : (
          <div className="reels-wrap">
            {reels.map((action, i) => (
              <ActionCard key={i} action={action} />
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
          <span className="tab-icon">📊</span>
          Analyst
        </button>
        <button className={`tab-btn${tab === 'stocks' ? ' active' : ''}`} onClick={() => setTab('stocks')}>
          <span className="tab-icon">📈</span>
          Stocks
        </button>
      </nav>
    </div>
  );
}

function ActionCard({ action }) {
  const { sector, ticker, firm, action: act, from_grade, to_grade, date } = action;
  const sectorClass = SECTOR_CLASS[sector] ?? '';
  const label = ACTION_LABEL[act] ?? act.toUpperCase();
  const color = ACTION_COLOR[act] ?? '#fff';

  return (
    <div className="reel">
      <div className="reel-bg-color" style={{ background: GRADIENTS[sector] }} />
      <div className="reel-gradient" />

      <div className="reel-content">
        <span className={`reel-sector ${sectorClass}`}>{sector}</span>

        <p className="reel-action-label" style={{ color }}>{label}</p>

        <p className="reel-title">{firm}</p>

        <p className="reel-ticker">
          <span className="reel-ticker-sym">{ticker}</span>
          {from_grade && to_grade && (
            <span className="reel-grade-change"> · {from_grade} → {to_grade}</span>
          )}
          {!from_grade && to_grade && (
            <span className="reel-grade-change"> · {to_grade}</span>
          )}
        </p>

        <p className="reel-meta">{date}</p>
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
