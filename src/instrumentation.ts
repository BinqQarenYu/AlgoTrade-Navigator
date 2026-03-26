export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        try {
            const { headlessSentry } = await import('./lib/headless-sentry');
            headlessSentry.autoBoot();
        } catch (e) {
            console.error('[Instrumentation] Failed to auto-boot Sentry', e);
        }
    }
}
