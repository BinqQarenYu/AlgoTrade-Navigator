import { NextResponse } from 'next/server';
import { eventIngestor } from '@/lib/event-ingestor';
import { getBufferStatus } from '@/lib/db-service';

export async function GET() {
    try {
        return NextResponse.json({
            ingestorRunning: true, // If we reached here, the module loaded
            buffers: getBufferStatus()
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { action } = await req.json();
        
        if (action === 'start') {
            eventIngestor.start();
            return NextResponse.json({ success: true, message: 'ESH Ingestor Manual Start Triggered' });
        } else if (action === 'stop') {
            eventIngestor.stop();
            return NextResponse.json({ success: true, message: 'ESH Ingestor Manual Stop Triggered' });
        }
        
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
