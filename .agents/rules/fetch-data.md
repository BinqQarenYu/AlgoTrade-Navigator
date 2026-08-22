# Fetch Data & Market Data Rules

## 1. Absolute Prohibition on Mock Data
- **Never use mock data, synthetic trades, or hardcoded placeholder datasets.**
- All quantitative charts, indicators, simulations, order books, and algorithmic logic must use the **live and latest market data**.
- Do not construct "dummy" candles or "random" walk order flows. If data is unavailable, display a loading state, connection error, or graceful failure rather than silently degrading to mocked states.

## 2. Live Connectivity Standard
- All data must be fetched from the designated live exchange sources (e.g., Binance API, CCXT REST/WebSocket).
- Ensure real-time streams (like order book delta streams and recent trades) are prioritized over delayed batch endpoints where possible.
- If an endpoint requires an interval, default to fetching up to the literal current time (`Date.now()`) to ensure no lag.
