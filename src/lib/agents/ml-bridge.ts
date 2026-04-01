import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { runQuery } from '../db-service';

/**
 * 🧠 Cognitive ML Bridge
 * 
 * Invokes the Unsupervised (K-Means) Python ML script as a background child process.
 * This guarantees the Node.js event loop isn't blocked by math-heavy matrices.
 * We parse the atomic output from Python and persist the findings natively to DuckDB.
 */
export class MLBridge {
    private enginePath: string;
    private pythonPath: string;
    private isTraining: boolean = false;
    private dbPath: string;

    constructor() {
        // Resolve absolute paths for the execution context
        const rootDir = process.cwd();
        this.enginePath = path.join(rootDir, 'src', 'scripts', 'ml', 'engine.py');
        
        // Use the virtual environment Python executable for exact dependency matching
        this.pythonPath = path.join(rootDir, '.venv', 'Scripts', 'python.exe');
        this.dbPath = path.join(rootDir, 'data', 'algo_trades.duckdb');
    }

    /**
     * Executes the heavy K-Means clustering algorithm.
     */
    public async trainUnsupervisedModel(): Promise<any> {
        if (this.isTraining) {
            console.log('[ML-Bridge] ⚠️ Model is already training. Skipping overlapping heartbeat.');
            return null;
        }

        this.isTraining = true;
        console.log('[ML-Bridge] 🤖 Triggering Unsupervised ML Engine (Python)...');
        
        return new Promise(async (resolve, reject) => {
            try {
                // To bypass Windows File Locks on DuckDB, we must snapshot data to Parquet
                // We MUST force forward slashes because paths like "F:\012" are parsed as octal \0 by DuckDB C++ parser!
                let parquetPath = path.join(process.cwd(), 'data', 'ml_export.parquet');
                parquetPath = parquetPath.replace(/\\/g, '/');

                if (fs.existsSync(parquetPath)) {
                    fs.unlinkSync(parquetPath);
                }

                await runQuery(`COPY (
                    SELECT event_id, timestamp, symbol, event_type, price, severity_score, metadata 
                    FROM microstructure_events 
                    ORDER BY timestamp DESC LIMIT 10000
                ) TO '${parquetPath}' (FORMAT 'parquet')`);

                // Give Python the parquet snapshot path instead of the live Vault
                const command = `"${this.pythonPath}" "${this.enginePath}" "${parquetPath}"`;
                
                exec(command, { maxBuffer: 1024 * 1024 * 10 }, async (error, stdout, stderr) => {
                    this.isTraining = false;
                
                if (error) {
                    console.error('[ML-Bridge] Python Engine Error:', error);
                    console.error('[ML-Bridge] Stderr:', stderr);
                    return reject(error);
                }

                // Parse the precise ML Output from the standard log stream
                try {
                    const startMarker = '--- ML_OUTPUT_START ---';
                    const endMarker = '--- ML_OUTPUT_END ---';
                    
                    const startIndex = stdout.indexOf(startMarker) + startMarker.length;
                    const endIndex = stdout.indexOf(endMarker);
                    
                    if (startIndex === -1 || endIndex === -1) {
                         console.log('[ML-Bridge] Raw Output:\n', stdout);
                         throw new Error("Could not find structured ML output blocks in stdout.");
                    }

                    const jsonStr = stdout.substring(startIndex, endIndex).trim();
                    const result = JSON.parse(jsonStr);

                    if (result.error) {
                        console.error('[ML-Bridge] ML Engine Failed internally:', result.error);
                        return reject(new Error(result.error));
                    }

                    if (result.status === "insufficient_data") {
                        console.log(`[ML-Bridge] 🛑 Not enough data points to train (Found: ${result.rows}). Skipping.`);
                        return resolve(result);
                    }

                    console.log(`[ML-Bridge] ✅ ML Engine Success. Categorized ${result.rows_analyzed} events.`);
                    
                    // Persist findings to DuckDB system log
                    const lessonText = `Unsupervised ML discovered ${result.clusters.length} primary market states. Signatures: ` + 
                                       result.clusters.map((c:any) => c.signature).join(', ');
                                       
                    await runQuery(
                        `INSERT INTO system_logs (timestamp, alert_severity, alert_source, message) VALUES (?, ?, ?, ?)`,
                        [Date.now(), 'INFO', 'ML_ENGINE', `[COGNITIVE] ${lessonText} | Stats: ${JSON.stringify({rows: result.rows_analyzed})}`]
                    );

                    resolve(result);

                } catch (parseError) {
                    console.error('[ML-Bridge] Failed to map ML atomic truth:', parseError);
                    reject(parseError);
                }
            });
            } catch (err) {
                this.isTraining = false;
                console.error('[ML-Bridge] Failed to generate snapshot for Python:', err);
                reject(err);
            }
        });
    }
}

export const cognitiveEngine = new MLBridge();
