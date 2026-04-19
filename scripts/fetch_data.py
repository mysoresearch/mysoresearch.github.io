"""
Fetches previous trading day data for tracked stocks via yfinance.
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

def main():
    all_stocks = []
    sector_data = {}

    for sector, stocks in SECTORS.items():
        results = []
        for s in stocks:
            data = fetch_stock(s["ticker"])
            if data:
                data["name"] = s["name"]
                data["sector"] = sector
                results.append(data)
                all_stocks.append(data)
        results.sort(key=lambda x: x["change"], reverse=True)
        sector_data[sector] = results

    all_stocks.sort(key=lambda x: x["change"], reverse=True)
    top_winners = all_stocks[:5]
    top_losers  = list(reversed(all_stocks))[:5]

    output = {
        "updated_at": datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        "winners":    top_winners,
        "losers":     top_losers,
        "sectors":    sector_data,
    }

    with open("data/market_data.json", "w") as f:
        json.dump(output, f, indent=2)

    print(f"Done — {len(all_stocks)} stocks fetched.")
    print(f"Top winner: {top_winners[0]['ticker']} ({top_winners[0]['change']:+.2f}%)")
    print(f"Top loser:  {top_losers[0]['ticker']} ({top_losers[0]['change']:+.2f}%)")

if __name__ == "__main__":
    main()
