# Golden Signal — Live Crypto + Stock Intelligence Prototype

## Run locally

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

Open:
- http://localhost:4173
- http://127.0.0.1:4173

## What this version adds

- Influencer Signal Router cards (auto-refreshed) with redirect flow through your website.
- 120 live crypto mini analysis charts from CoinGecko sparkline data.
- 24 live stock mini charts from Yahoo chart API.
- Live news cards (CoinDesk, The Block, Cointelegraph).
- Macro charts from live DeFiLlama + coin/stocks snapshots.
- Scheduled refresh loop for 24/7 operation style (every 3-5 minutes).

## Important notes

- IntoTheCryptoverse and Token Terminal do not provide open unauthenticated APIs for all data. For full production ingestion, add API keys/partnership access and backend workers.
- CoinMarketCap public pages are linked; official API usage requires a key.
