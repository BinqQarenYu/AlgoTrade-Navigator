const duckdb = require('duckdb');
const path = require('path');
const dbPath = path.join(process.cwd(), 'data', 'algo_trades.duckdb');
const db = new duckdb.Database(dbPath, (err) => {
  if (err) throw err;
  db.all("SELECT * FROM system_logs WHERE alert_source = 'ORANGE_PI_NODE' ORDER BY timestamp DESC LIMIT 5", (err, res) => {
    if (err) console.error(err);
    console.log(JSON.stringify(res, null, 2));
    db.close();
  });
});
