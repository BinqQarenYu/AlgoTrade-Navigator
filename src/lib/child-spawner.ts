/**
 * child-spawner.ts
 * 
 * Shared module for spawning/killing the local Child Node process.
 * Used by both the /api/child/control route AND the HeadlessSentry failover logic
 * so the Mother can auto-resurrect the Child when it goes silent.
 * 
 * Uses globalThis to persist the child process reference across Next.js HMR reloads.
 */

import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const globalForChild = globalThis as unknown as {
    childProcess: ReturnType<typeof spawn> | null;
    lastAutoSpawnAttempt: number;
};

if (!globalForChild.childProcess) globalForChild.childProcess = null;
if (!globalForChild.lastAutoSpawnAttempt) globalForChild.lastAutoSpawnAttempt = 0;

const CHILD_DIR = path.join(process.cwd(), 'child-node');

/** Minimum time between auto-respawn attempts (60s cooldown to prevent thrashing) */
const AUTO_RESPAWN_COOLDOWN_MS = 60_000;

/**
 * Returns true if the child process is currently tracked as running.
 */
export function isChildProcessAlive(): boolean {
    return globalForChild.childProcess !== null;
}

/**
 * Kill the running child process.
 */
export function killChildProcess(): void {
    if (globalForChild.childProcess) {
        try {
            globalForChild.childProcess.kill();
        } catch (e) {
            console.warn('[ChildSpawner] Could not kill child process:', e);
        }
        globalForChild.childProcess = null;
    } else {
        // Fallback: kill any node process running child-node/index.js (Windows compatible)
        exec(`wmic process where "commandline like '%child-node\\\\index.js%'" call terminate`, (err) => {
            if (err) console.warn('[ChildSpawner] Fallback terminate failed (may be normal):', err.message);
        });
    }
}

/**
 * Spawn the child node process.
 * Returns true if spawned, false if child-node dir doesn't exist.
 */
export function spawnChildProcess(): boolean {
    if (!fs.existsSync(CHILD_DIR)) {
        console.warn('[ChildSpawner] child-node/ directory not found. Cannot spawn.');
        return false;
    }

    // Kill existing first to avoid duplicates
    killChildProcess();

    console.log('[ChildSpawner] 🔄 Spawning Sentry Child Node...');

    globalForChild.childProcess = spawn('node', ['index.js'], {
        cwd: CHILD_DIR,
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
    });

    // Listen for unexpected exits so we clear the reference
    globalForChild.childProcess.on('exit', (code) => {
        console.log(`[ChildSpawner] Child process exited with code ${code}`);
        globalForChild.childProcess = null;
    });

    globalForChild.childProcess.on('error', (err) => {
        console.error('[ChildSpawner] Child process error:', err.message);
        globalForChild.childProcess = null;
    });

    // Unref so the Mother's process isn't locked
    globalForChild.childProcess.unref();

    return true;
}

/**
 * Auto-respawn: called by the failover watcher.
 * Has a 60s cooldown to prevent rapid-fire respawn loops.
 * Returns true if a spawn was attempted.
 */
export function autoRespawnChild(): boolean {
    const now = Date.now();
    const elapsed = now - globalForChild.lastAutoSpawnAttempt;

    if (elapsed < AUTO_RESPAWN_COOLDOWN_MS) {
        const remaining = Math.round((AUTO_RESPAWN_COOLDOWN_MS - elapsed) / 1000);
        console.log(`[ChildSpawner] Auto-respawn on cooldown (${remaining}s remaining). Skipping.`);
        return false;
    }

    globalForChild.lastAutoSpawnAttempt = now;
    console.log('[ChildSpawner] 🚨 Auto-respawning Child Node (triggered by failover watch)...');
    return spawnChildProcess();
}
