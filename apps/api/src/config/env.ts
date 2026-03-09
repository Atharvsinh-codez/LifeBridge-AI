import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Load the root monorepo .env file so all env vars are available to the API.
// On Render (production), env vars are set via the Dashboard — this is safely skipped.
function loadRootEnv() {
    // Try multiple possible paths (depends on how the API is started)
    const candidates = [
        resolve(process.cwd(), '.env'),          // if run from monorepo root
        resolve(process.cwd(), '../../.env'),     // if run from apps/api
        resolve(__dirname, '../../../.env'),       // relative to compiled output
        resolve(__dirname, '../../../../.env'),    // another possible level
    ];

    for (const envPath of candidates) {
        if (existsSync(envPath)) {
            try {
                const content = readFileSync(envPath, 'utf-8');
                let loaded = 0;
                for (const line of content.split('\n')) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith('#')) continue;
                    const eqIndex = trimmed.indexOf('=');
                    if (eqIndex === -1) continue;
                    const key = trimmed.slice(0, eqIndex);
                    const value = trimmed.slice(eqIndex + 1);
                    if (!process.env[key]) {
                        process.env[key] = value;
                        loaded++;
                    }
                }
                console.log(`[env] Loaded ${loaded} vars from ${envPath}`);
                return;
            } catch {
                // Try next candidate
            }
        }
    }

    console.warn('[env] No .env file found — using process environment only');
}

loadRootEnv();

import { parseApiEnv } from '@lifebridge/config';

export const env = parseApiEnv(process.env);
