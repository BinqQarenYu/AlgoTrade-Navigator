export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        try {
            const { headlessSentry } = await import('./lib/headless-sentry');
            const { eventIngestor } = await import('./lib/event-ingestor');

            // Start the failover watch — HeadlessSentry will only activate
            // its own WebSocket scanning if no Child node heartbeat is detected.
            headlessSentry.startFailoverWatch();
            
            // Start the Event Sentiment Hub (ESH) — Polls news/trends
            eventIngestor.start();

            // Start the Retrospective AI Teacher (Every 30 Minutes) — Reviews performance
            const { retrospectiveTeacher } = await import('./lib/agents/retrospective-teacher');
            setInterval(() => {
                retrospectiveTeacher.startCycle();
            }, 30 * 60 * 1000); // 30m review cycle
            
        } catch (e) {
            console.error('[Instrumentation] Failed to start Sentinel clusters', e);
        }
    }
}
