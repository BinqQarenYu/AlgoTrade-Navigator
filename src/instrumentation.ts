export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        try {
            const { headlessSentry } = await import('./lib/headless-sentry');
            // Start the failover watch — HeadlessSentry will only activate
            // its own WebSocket scanning if no Child node heartbeat is detected.
            headlessSentry.startFailoverWatch();
        } catch (e) {
            console.error('[Instrumentation] Failed to start failover watch', e);
        }
    }
}
