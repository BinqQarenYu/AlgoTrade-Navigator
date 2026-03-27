/**
 * use-nerve.ts
 * 
 * Reusable React hook for connecting to the Mother Node's NervePulse SSE stream.
 * Distributes real-time events across any Sentinel Machine page.
 */

import { useEffect, useState, useCallback } from 'react';

type NerveMessage = {
    type: string;
    payload: any;
    machine_id: string;
    timestamp?: number;
};

export function useNerve(onMessage?: (msg: NerveMessage) => void) {
    const [connected, setConnected] = useState(false);
    const [lastPulse, setLastPulse] = useState<NerveMessage | null>(null);

    useEffect(() => {
        console.log('[useNerve] Connecting to Mother Nerve Bridge...');
        const eventSource = new EventSource('/api/nerve');

        eventSource.onopen = () => {
            setConnected(true);
            console.log('[useNerve] Nerve Connection Established.');
        };

        eventSource.onmessage = (event) => {
            try {
                const data: NerveMessage = JSON.parse(event.data);
                setLastPulse(data);
                if (onMessage) onMessage(data);
            } catch (err) {
                console.error('[useNerve] Failed to parse NervePulse:', err);
            }
        };

        eventSource.onerror = (err) => {
            console.error('[useNerve] Nerve Connection Error:', err);
            setConnected(false);
            eventSource.close();
        };

        return () => {
            console.log('[useNerve] Disconnecting from Nerve Bridge.');
            eventSource.close();
        };
    }, [onMessage]);

    return { connected, lastPulse };
}
