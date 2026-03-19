const duckdb = require('duckdb');
const path = require('path');
const dbPath = path.join(process.cwd(), 'data', 'algo_trades.duckdb');
console.log('Connecting to:', dbPath);
const db = new duckdb.Database(dbPath, (err) => {
  if (err) {
    console.error('Database instantiation error:', err.message);
    process.exit(1);
  }
  const conn = db.connect();
  conn.all('SELECT * FROM trades LIMIT 5', (err, rows) => {
    if (err) {
      console.error('Error selecting from trades:', err.message);
      process.exit(1);
    } else {
      console.log('Trades result:', rows);
      process.exit(0);
    }
  });
});
