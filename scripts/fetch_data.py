"""
Fetches market data via yfinance and stores it in SQLite.
Runs daily via GitHub Actions before US market open.
"""

import sqlite3
import json
import datetime
import time
import os
import yfinance as yf

DB_PATH = "data/market.db"

SECTORS = {
    "Energy": {
        "tickers": ["CCJ", "CEG", "VST", "SMR", "OKLO", "UEC", "NLR", "URA"],
        "names": {
            "CCJ": "Cameco", "CEG": "Constellation Energy", "VST": "Vistra",
            "SMR": "NuScale Power", "OKLO": "Oklo", "UEC": "Uranium Energy",
            "NLR": "NLR ETF", "URA": "URA ETF",
        },
        "news_tickers": ["CCJ", "CEG", "SMR", "OKLO"],
    },
    "Biosciences": {
        "tickers": ["LLY", "VRTX", "REGN", "MRNA", "CRSP", "BIIB", "XBI"],
        "names": {
            "LLY": "Eli Lilly", "VRTX": "Vertex Pharma", "REGN": "Regeneron",
            "MRNA": "Moderna", "CRSP": "CRISPR Therapeutics",
            "BIIB": "Biogen", "XBI": "XBI ETF",
        },
        "news_tickers": ["LLY", "VRTX", "MRNA", "CRSP"],
    },
    "AI": {
        "tickers": ["NVDA", "MSFT", "GOOGL", "AMD", "IONQ", "RGTI", "SMCI"],
        "names": {
            "NVDA": "Nvidia", "MSFT": "Microsoft", "GOOGL": "Alphabet",
            "AMD": "AMD", "IONQ": "IonQ", "RGTI": "Rigetti", "SMCI": "Super Micro",
        },
        "news_tickers": ["NVDA", "MSFT", "IONQ", "AMD"],
    },
}


def init_db(conn):
    # Recreate news table if published_ts column is missing
    cols = {r[1] for r in conn.execute("PRAGMA table_info(news)").fetchall()}
    if cols and "published_ts" not in cols:
        conn.execute("DROP TABLE news")
        conn.commit()

    conn.executescript("""
        CREATE TABLE IF NOT EXISTS quotes (
            ticker      TEXT NOT NULL,
            name        TEXT,
            sector      TEXT,
            close       REAL,
            change_pct  REAL,
            volume      INTEGER,
            updated_at  TEXT
        );
        CREATE TABLE IF NOT EXISTS news (
            sector       TEXT,
            ticker       TEXT,
            title        TEXT,
            url          TEXT UNIQUE,
            publisher    TEXT,
            published    TEXT,
            published_ts INTEGER,
            thumbnail    TEXT,
            updated_at   TEXT
        );
    """)
    conn.commit()


def fetch_quote(ticker, name, sector, updated_at):
    try:
        hist = yf.Ticker(ticker).history(period="5d")
        if len(hist) < 2:
            return None
        prev  = hist.iloc[-2]
        close = hist.iloc[-1]
        pct   = ((close["Close"] - prev["Close"]) / prev["Close"]) * 100
        return (ticker, name, sector,
                round(float(close["Close"]), 2),
                round(float(pct), 2),
                int(close["Volume"]),
                updated_at)
    except Exception:
        return None


def fetch_news(tickers, sector, updated_at, max_articles=9):
    seen, articles = set(), []
    cutoff_ts = time.time() - 7 * 24 * 3600  # skip articles older than 7 days
    for ticker in tickers:
        if len(articles) >= max_articles:
            break
        try:
            for item in (yf.Ticker(ticker).news or []):
                if len(articles) >= max_articles:
                    break
                c     = item.get("content", item)
                url   = (c.get("canonicalUrl") or {}).get("url") or c.get("url", "")
                title = c.get("title", "")
                pub   = (c.get("provider") or {}).get("displayName") or c.get("publisher", "")
                ts    = c.get("pubDate") or c.get("providerPublishTime")
                thumb = ""
                try:
                    thumb = (c.get("thumbnail") or {}).get("resolutions", [{}])[0].get("url", "")
                except Exception:
                    pass
                if not url or not title or url in seen:
                    continue
                # parse timestamp
                ts_int = None
                if isinstance(ts, (int, float)):
                    ts_int = int(ts)
                elif isinstance(ts, str):
                    try:
                        ts_int = int(datetime.datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp())
                    except Exception:
                        pass
                # skip articles older than 7 days
                if ts_int and ts_int < cutoff_ts:
                    continue
                seen.add(url)
                if ts_int:
                    published = datetime.datetime.utcfromtimestamp(ts_int).strftime("%b %d, %Y")
                else:
                    published = ""
                articles.append((sector, ticker, title, url, pub, published, ts_int, thumb, updated_at))
        except Exception:
            continue
    return articles


def main():
    os.makedirs("data", exist_ok=True)
    conn       = sqlite3.connect(DB_PATH)
    updated_at = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    init_db(conn)
    conn.execute("DELETE FROM quotes")
    conn.execute("DELETE FROM news")

    for sector, cfg in SECTORS.items():
        for ticker in cfg["tickers"]:
            row = fetch_quote(ticker, cfg["names"][ticker], sector, updated_at)
            if row:
                conn.execute("INSERT INTO quotes VALUES (?,?,?,?,?,?,?)", row)
                print(f"  {ticker}: {row[4]:+.2f}%")

        for row in fetch_news(cfg["news_tickers"], sector, updated_at):
            try:
                conn.execute("INSERT OR IGNORE INTO news VALUES (?,?,?,?,?,?,?,?,?)", row)
            except Exception:
                pass
        print(f"{sector}: done")

    conn.commit()
    conn.close()
    print(f"SQLite updated at {updated_at}")


if __name__ == "__main__":
    main()
