import { NextResponse } from 'next/server';
import { subscribeToNerve } from '@/lib/nerve-center';

/**
 * api/nerve/route.ts
 * 
 * Server-Sent Events (SSE) bridge for real-time NervePulse delivery.
 * Allows the 8 Sentinel Machines (Pages) to receive live updates 
 * from the Mother Ingestor.
 */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            // Send initial connection confirm
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'NERVE_CONNECTED', timestamp: Date.now() })}\n\n`));

            // Subscribe to the internal nerve bus
            const unsubscribe = subscribeToNerve((message) => {
                const payload = `data: ${JSON.stringify(message)}\n\n`;
                controller.enqueue(encoder.encode(payload));
            });

            // Clean up on connection close
            request.signal.addEventListener('abort', () => {
                console.log('[NerveAPI] Client disconnected from Nerve Stream.');
                unsubscribe();
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
}
