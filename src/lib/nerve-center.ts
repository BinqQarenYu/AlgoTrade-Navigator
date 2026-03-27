/**
 * nerve-center.ts
 * 
 * The system-wide broadcast nerve for cross-machine synchronization.
 * Uses Server-Sent Events (SSE) for server-to-client updates.
 */

type Listener = (data: any) => void;
const listeners = new Set<Listener>();

export function subscribeToNerve(callback: Listener) {
    listeners.add(callback);
    return () => listeners.delete(callback);
}

export function pulseNerve(message: { type: string; payload: any; machine_id: string }) {
    console.log(`[NerveCenter] Pulsing: ${message.type} from ${message.machine_id}`);
    listeners.forEach(listen => listen(message));
}
