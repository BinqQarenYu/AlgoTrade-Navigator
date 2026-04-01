const duckdb = require('duckdb');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'algo_trades.duckdb');
const db = new duckdb.Database(dbPath);
const conn = db.connect();

conn.all('SELECT COUNT(*) as count FROM system_logs', (err, res) => {
    if (err) {
        console.error('Error counting logs:', err);
    } else {
        console.log('System Logs Count:', res[0].count);
    }
    
    conn.all('SELECT COUNT(*) as count FROM trades', (err, res) => {
        if (err) {
            console.error('Error counting trades:', err);
        } else {
            console.log('Trades Count:', res[0].count);
        }
        
        conn.all('SELECT COUNT(*) as count FROM microstructure_events', (err, res) => {
            if (err) {
                console.error('Error counting events:', err);
            } else {
                console.log('Microstructure Events Count:', res[0].count);
            }
            db.close();
        });
    });
});
