import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __esm_dirname = dirname(__filename);

// Load the root monorepo .env file so all env vars are available to the API.
// On Render (production), env vars are set via the Dashboard — this is safely skipped.
function loadRootEnv() {
    const candidates = [
        resolve(process.cwd(), '.env'),
        resolve(process.cwd(), '../../.env'),
        resolve(__esm_dirname, '../../../.env'),
        resolve(__esm_dirname, '../../../../.env'),
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

    console.log('[env] No .env file found — using process environment only (expected on Render)');
}

loadRootEnv();

import { parseApiEnv } from '@lifebridge/config';

export const env = parseApiEnv(process.env);
