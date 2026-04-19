"""
Fetches previous trading day data and Yahoo Finance news via yfinance.
Outputs data/market_data.json consumed by index.html.
"""

import json
import datetime
import yfinance as yf

SECTORS = {
    "Energy": [
        {"ticker": "CCJ",  "name": "Cameco"},
        {"ticker": "CEG",  "name": "Constellation Energy"},
        {"ticker": "VST",  "name": "Vistra"},
        {"ticker": "SMR",  "name": "NuScale Power"},
        {"ticker": "OKLO", "name": "Oklo"},
        {"ticker": "UEC",  "name": "Uranium Energy"},
        {"ticker": "NLR",  "name": "NLR ETF (Nuclear)"},
        {"ticker": "URA",  "name": "URA ETF (Uranium)"},
    ],
    "Biosciences": [
        {"ticker": "LLY",  "name": "Eli Lilly"},
        {"ticker": "VRTX", "name": "Vertex Pharma"},
        {"ticker": "REGN", "name": "Regeneron"},
        {"ticker": "MRNA", "name": "Moderna"},
        {"ticker": "NTLA", "name": "Intellia Therapeutics"},
        {"ticker": "CRSP", "name": "CRISPR Therapeutics"},
        {"ticker": "BIIB", "name": "Biogen"},
        {"ticker": "XBI",  "name": "XBI ETF (Biotech)"},
    ],
    "AI": [
        {"ticker": "NVDA", "name": "Nvidia"},
        {"ticker": "MSFT", "name": "Microsoft"},
        {"ticker": "GOOGL","name": "Alphabet"},
        {"ticker": "AMD",  "name": "AMD"},
        {"ticker": "IONQ", "name": "IonQ (Quantum)"},
        {"ticker": "RGTI", "name": "Rigetti (Quantum)"},
        {"ticker": "SMCI", "name": "Super Micro"},
        {"ticker": "SOXL", "name": "SOXL ETF (Semis)"},
    ],
}

# One representative ticker per sector for news fetching
NEWS_TICKERS = {
    "Energy":      ["CCJ", "CEG", "SMR", "OKLO"],
    "Biosciences": ["LLY", "VRTX", "MRNA", "CRSP"],
    "AI":          ["NVDA", "MSFT", "IONQ", "AMD"],
}

# Max news articles per sector
NEWS_PER_SECTOR = 5


def fetch_stock(ticker):
    try:
        hist = yf.Ticker(ticker).history(period="5d")
        if len(hist) < 2:
            return None
        prev  = hist.iloc[-2]
        close = hist.iloc[-1]
        pct   = ((close["Close"] - prev["Close"]) / prev["Close"]) * 100
        return {
            "ticker": ticker,
            "close":  round(close["Close"], 2),
            "change": round(pct, 2),
            "volume": int(close["Volume"]),
        }
    except Exception:
        return None


def fetch_news(sector, tickers):
    seen_urls = set()
    articles  = []

    for ticker in tickers:
        try:
            raw = yf.Ticker(ticker).news or []
            for item in raw:
                # yfinance >=0.2.38 nests content inside a 'content' key
                content = item.get("content", item)
                url     = (content.get("canonicalUrl") or {}).get("url") or content.get("url", "")
                title   = content.get("title", "")
                pub     = (content.get("provider") or {}).get("displayName") or content.get("publisher", "")
                ts      = content.get("pubDate") or content.get("providerPublishTime")

                if not url or not title or url in seen_urls:
                    continue
                seen_urls.add(url)

                # Format timestamp
                if isinstance(ts, (int, float)):
                    published = datetime.datetime.utcfromtimestamp(ts).strftime("%b %d, %Y")
                elif isinstance(ts, str):
                    try:
                        published = datetime.datetime.fromisoformat(ts.replace("Z", "+00:00")).strftime("%b %d, %Y")
                    except Exception:
                        published = ts[:10]
                else:
                    published = ""

                articles.append({
                    "title":     title,
                    "url":       url,
                    "publisher": pub,
                    "published": published,
                    "ticker":    ticker,
                    "sector":    sector,
                })

                if len(articles) >= NEWS_PER_SECTOR:
                    return articles
        except Exception:
            continue

    return articles


def main():
    all_stocks  = []
    sector_data = {}

    for sector, stocks in SECTORS.items():
        results = []
        for s in stocks:
            data = fetch_stock(s["ticker"])
            if data:
                data["name"]   = s["name"]
                data["sector"] = sector
                results.append(data)
                all_stocks.append(data)
        results.sort(key=lambda x: x["change"], reverse=True)
        sector_data[sector] = results

    all_stocks.sort(key=lambda x: x["change"], reverse=True)
    top_winners = all_stocks[:5]
    top_losers  = list(reversed(all_stocks))[:5]

    # Fetch news per sector
    sector_news = {}
    for sector, tickers in NEWS_TICKERS.items():
        sector_news[sector] = fetch_news(sector, tickers)
        print(f"News [{sector}]: {len(sector_news[sector])} articles")

    output = {
        "updated_at":  datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        "winners":     top_winners,
        "losers":      top_losers,
        "sectors":     sector_data,
        "news":        sector_news,
    }

    with open("data/market_data.json", "w") as f:
        json.dump(output, f, indent=2)

    print(f"Done — {len(all_stocks)} stocks fetched.")
    if top_winners:
        print(f"Top winner: {top_winners[0]['ticker']} ({top_winners[0]['change']:+.2f}%)")
    if top_losers:
        print(f"Top loser:  {top_losers[0]['ticker']} ({top_losers[0]['change']:+.2f}%)")


if __name__ == "__main__":
    main()
