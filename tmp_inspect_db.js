const duckdb = require('duckdb');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'algo_trades.duckdb');
// Open in READ_ONLY mode to bypass locking (Next.js has it open for reading/writing)
const db = new duckdb.Database(dbPath, duckdb.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Failed to open database (even in read-only mode):', err);
        return;
    }
    
    const conn = db.connect();
    
    function query(sql) {
        return new Promise((resolve, reject) => {
            conn.all(sql, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async function run() {
        try {
            console.log('--- Database Header (DuckDB) ---');
            console.log(`Path: ${dbPath}\n`);

            const tables = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'");
            
            for (const { table_name: tableName } of tables) {
                console.log(`\n\x1b[36m[Table: ${tableName}]\x1b[0m`);
                
                // Get Schema
                const columns = await query(`PRAGMA table_info('${tableName}')`);
                console.log('Columns:');
                columns.forEach(c => {
                    console.log(`  - ${c.name.padEnd(20)} | ${c.type.padEnd(10)} ${c.pk ? '[PK]' : ''}`);
                });

                // Get First 5 Rows
                const rows = await query(`SELECT * FROM ${tableName} LIMIT 5`);
                console.log('\nSample Rows (First 5):');
                if (rows.length === 0) {
                    console.log('  (Empty Table)');
                } else {
                    console.table(rows);
                }
                console.log('-'.repeat(50));
            }
        } catch (e) {
            console.error('Error during database inspection:', e);
        } finally {
            db.close();
        }
    }

    run();
});
