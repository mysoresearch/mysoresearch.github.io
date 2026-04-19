"""
Fetches market data via yfinance and stores it in Upstash Redis.
Runs daily via GitHub Actions before US market open.
"""

import json
import os
import datetime
import requests
import yfinance as yf

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


def fetch_quote(ticker, name):
    try:
        hist = yf.Ticker(ticker).history(period="5d")
        if len(hist) < 2:
            return None
        prev  = hist.iloc[-2]
        close = hist.iloc[-1]
        pct   = ((close["Close"] - prev["Close"]) / prev["Close"]) * 100
        return {
            "ticker": ticker,
            "name":   name,
            "close":  round(float(close["Close"]), 2),
            "change": round(float(pct), 2),
            "volume": int(close["Volume"]),
        }
    except Exception:
        return None


def fetch_news(tickers, max_articles=9):
    seen = set()
    articles = []
    for ticker in tickers:
        if len(articles) >= max_articles:
            break
        try:
            raw = yf.Ticker(ticker).news or []
            for item in raw:
                if len(articles) >= max_articles:
                    break
                content = item.get("content", item)
                url   = (content.get("canonicalUrl") or {}).get("url") or content.get("url", "")
                title = content.get("title", "")
                pub   = (content.get("provider") or {}).get("displayName") or content.get("publisher", "")
                ts    = content.get("pubDate") or content.get("providerPublishTime")
                thumb = ""
                try:
                    resolutions = content.get("thumbnail", {}).get("resolutions", [])
                    if resolutions:
                        thumb = resolutions[0].get("url", "")
                except Exception:
                    pass

                if not url or not title or url in seen:
                    continue
                seen.add(url)

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
                    "title": title, "url": url, "publisher": pub,
                    "published": published, "ticker": ticker, "thumbnail": thumb,
                })
        except Exception:
            continue
    return articles


def push_to_upstash(data):
    url   = os.environ["UPSTASH_REDIS_REST_URL"]
    token = os.environ["UPSTASH_REDIS_REST_TOKEN"]
    payload = json.dumps(data)
    # SET with 28-hour expiry (covers weekends)
    res = requests.post(
        f"{url}/set/market_data/ex/100800",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        data=json.dumps(payload),
    )
    res.raise_for_status()
    print(f"Upstash write: {res.json()}")


def main():
    sector_data = {}
    news_data   = {}

    for sector, cfg in SECTORS.items():
        quotes = []
        for ticker in cfg["tickers"]:
            q = fetch_quote(ticker, cfg["names"][ticker])
            if q:
                quotes.append(q)
        quotes.sort(key=lambda x: x["change"], reverse=True)
        sector_data[sector] = quotes
        news_data[sector]   = fetch_news(cfg["news_tickers"])
        print(f"{sector}: {len(quotes)} quotes, {len(news_data[sector])} articles")

    output = {
        "updatedAt": datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        "sectors":   sector_data,
        "news":      news_data,
    }

    push_to_upstash(output)
    print("Done.")


if __name__ == "__main__":
    main()
