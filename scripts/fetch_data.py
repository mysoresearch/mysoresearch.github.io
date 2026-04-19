"""
Fetches market data and analyst actions via yfinance, stores in SQLite.
Runs hourly via GitHub Actions.
"""

import sqlite3
import datetime
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
        "analyst_tickers": ["CCJ", "CEG", "VST", "SMR", "OKLO", "UEC"],
    },
    "Biosciences": {
        "tickers": ["LLY", "VRTX", "REGN", "MRNA", "CRSP", "BIIB", "XBI"],
        "names": {
            "LLY": "Eli Lilly", "VRTX": "Vertex Pharma", "REGN": "Regeneron",
            "MRNA": "Moderna", "CRSP": "CRISPR Therapeutics",
            "BIIB": "Biogen", "XBI": "XBI ETF",
        },
        "analyst_tickers": ["LLY", "VRTX", "REGN", "MRNA", "CRSP", "BIIB"],
    },
    "AI": {
        "tickers": ["NVDA", "MSFT", "GOOGL", "AMD", "IONQ", "RGTI", "SMCI"],
        "names": {
            "NVDA": "Nvidia", "MSFT": "Microsoft", "GOOGL": "Alphabet",
            "AMD": "AMD", "IONQ": "IonQ", "RGTI": "Rigetti", "SMCI": "Super Micro",
        },
        "analyst_tickers": ["NVDA", "MSFT", "GOOGL", "AMD", "IONQ", "SMCI"],
    },
}

ACTION_LABELS = {
    "up":   "Upgrade",
    "down": "Downgrade",
    "init": "Initiation",
    "reit": "Reiteration",
    "main": "Maintained",
}


def init_db(conn):
    # Drop old news table if present
    tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    if "news" in tables:
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
        CREATE TABLE IF NOT EXISTS analyst_actions (
            id          TEXT PRIMARY KEY,
            sector      TEXT,
            ticker      TEXT,
            firm        TEXT,
            action      TEXT,
            from_grade  TEXT,
            to_grade    TEXT,
            action_date TEXT,
            updated_at  TEXT
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


def fetch_analyst_actions(tickers, sector, updated_at, lookback_days=90):
    actions = []
    cutoff = datetime.date.today() - datetime.timedelta(days=lookback_days)
    for ticker in tickers:
        try:
            df = yf.Ticker(ticker).upgrades_downgrades
            if df is None or df.empty:
                continue
            # Keep only recent and meaningful actions
            df = df[df.index.date >= cutoff]
            df = df[df["Action"].isin(["up", "down", "init", "reit"])]
            df = df.sort_index(ascending=False).head(5)
            for date, row in df.iterrows():
                action_id = f"{ticker}_{date.date()}_{row['Firm']}".replace(" ", "_")
                actions.append((
                    action_id,
                    sector,
                    ticker,
                    row["Firm"],
                    row["Action"],
                    row.get("FromGrade", "") or "",
                    row.get("ToGrade", "") or "",
                    str(date.date()),
                    updated_at,
                ))
        except Exception as e:
            print(f"  analyst {ticker} error: {e}")
    # Sort newest first
    actions.sort(key=lambda x: x[7], reverse=True)
    return actions


def main():
    os.makedirs("data", exist_ok=True)
    conn       = sqlite3.connect(DB_PATH)
    updated_at = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    init_db(conn)
    conn.execute("DELETE FROM quotes")
    conn.execute("DELETE FROM analyst_actions")

    for sector, cfg in SECTORS.items():
        print(f"\n── {sector} ──")
        for ticker in cfg["tickers"]:
            row = fetch_quote(ticker, cfg["names"][ticker], sector, updated_at)
            if row:
                conn.execute("INSERT INTO quotes VALUES (?,?,?,?,?,?,?)", row)
                print(f"  {ticker}: {row[4]:+.2f}%")

        actions = fetch_analyst_actions(cfg["analyst_tickers"], sector, updated_at)
        for row in actions:
            try:
                conn.execute("INSERT OR IGNORE INTO analyst_actions VALUES (?,?,?,?,?,?,?,?,?)", row)
                label = ACTION_LABELS.get(row[4], row[4])
                print(f"  {row[3]} {label} {row[2]}: {row[5]} → {row[6]} ({row[7]})")
            except Exception:
                pass

    conn.commit()
    conn.close()
    print(f"\nSQLite updated at {updated_at}")


if __name__ == "__main__":
    main()
