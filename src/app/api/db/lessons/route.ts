import { NextResponse } from 'next/server';
import { runQuery, connectToDB } from '@/lib/db-service';

/**
 * /api/db/lessons
 * 
 * Fetches the 'Master Lessons' from the Sentinel Cluster's 
 * Retrospective AI Teacher for the Research Lab.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const minRelevance = parseFloat(searchParams.get('minScale') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');

    try {
        await connectToDB();

        // Fetch events that have a 'lesson' in their metadata (graded by AI Teacher)
        const lessons = await runQuery(`
            SELECT * FROM external_events 
            WHERE metadata LIKE '%lesson%'
            AND relevance_score >= ?
            ORDER BY timestamp DESC
            LIMIT ?
        `, [minRelevance, limit]);

        // Clean up BigInts for JSON serialization
        const safeData = JSON.parse(JSON.stringify(lessons, (key, value) => 
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json({
            success: true,
            data: safeData
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
