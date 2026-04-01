import { NextResponse } from 'next/server';
import { correlateEventWithMarket } from '@/lib/event-correlator';

/**
 * /api/db/trace
 * 
 * Retrieves the high-fidelity microstructure trace (Whales/Liquidations)
 * correlated to a specific news event for visual research.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
        return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });
    }

    try {
        // Use our existing correlator utility to fetch the news + ±5m anomalies
        const context = await correlateEventWithMarket(eventId);
        
        if (!context) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Clean up BigInts for JSON
        const safeData = JSON.parse(JSON.stringify(context, (key, value) => 
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
