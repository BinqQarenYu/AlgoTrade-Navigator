import { NextResponse } from 'next/server';
import { cognitiveEngine } from '@/lib/agents/ml-bridge';

/**
 * /api/ml/train
 * 
 * Manually triggers the Python ML Bridge to retrieve DuckDB data,
 * calculate K-Means unsupervised clustering on the microstructure table,
 * and return the categorized signatures.
 */
export async function POST() {
    try {
        const results = await cognitiveEngine.trainUnsupervisedModel();
        
        if (!results) {
             return NextResponse.json({ success: false, message: "Model is currently training in the background." }, { status: 429 });
        }

        if (results.status === "insufficient_data") {
             return NextResponse.json({ 
                 success: true, 
                 message: `Insufficient data points (${results.rows} rows). At least 50 historical microstructure events required to form clusters.`
             });
        }

        return NextResponse.json({
            success: true,
            version: results.model_version,
            analyzed_rows: results.rows_analyzed,
            market_states: results.clusters
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
