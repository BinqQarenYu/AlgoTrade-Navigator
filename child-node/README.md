# AlgoTrade Navigator - Orange Pi Sentry (Child Node)

This script acts as a robust failover sentry designed to run continuously on low-power, "Always-On" hardware such as an Orange Pi or Raspberry Pi.

## Architecture

In the "Mother/Child Distributed Architecture", the mother application (Next.js server) handles complex AI evaluation and serves the front end. However, if the mother application goes offline or restarts for updates, valuable market tick data is lost.

This "Child" Node ensures 100% data ingestion uptime by:
1. Connecting directly to the Binance `aggTrade` WebSocket stream.
2. Collecting and buffering market trades.
3. Continuously pinging the Mother Node at `POST /api/ingest`.
4. If Mother goes offline, it simply queues the data locally in RAM.
5. As soon as connectivity is restored, it bursts the accumulated buffer into the Mother's DuckDB vault.

## Setup Instructions

1. Ensure the child hardware has Node.js `v18+` installed (for native `fetch` support).
2. Clone or copy this directory (`child-node`) to your Orange Pi.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up environment variables mapping to your Mother node. You can run it via:
   ```bash
   export MOTHER_NODE_URL="http://<YOUR_MOTHER_IP>:3000/api/ingest"
   export ORANGE_PI_SECRET="dev-secret-key"
   export SYMBOL="btcusdt"
   npm start
   ```

## Recommended Production Deployment (PM2)

To keep the sentry running 24/7 across reboots on the Orange Pi, use `pm2`.

```bash
sudo npm install -g pm2
pm2 start index.js --name "orange-pi-sentry" --env MOTHER_NODE_URL="http://IP:3000/api/ingest",ORANGE_PI_SECRET="your_secret"
pm2 save
pm2 startup
```
