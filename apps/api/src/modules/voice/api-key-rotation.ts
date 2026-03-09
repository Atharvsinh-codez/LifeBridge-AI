// ─── Smart Google API Key Rotation (from LangoWorld) ───
// Tracks per-key health, cooldown timers, and failure counts.
// Skips rate-limited/broken keys and retries with healthy ones.

interface KeyHealth {
    key: string;
    failures: number;
    lastFailure: number;
    cooldownUntil: number;
    totalRequests: number;
    totalSuccesses: number;
}

const COOLDOWN_MS = 60_000;       // 60s cooldown after rate-limit
const MAX_FAILURES = 3;           // Mark key unhealthy after 3 consecutive failures
const FAILURE_RESET_MS = 300_000; // Reset failure count after 5min of no failures

const keyHealthMap: Map<string, KeyHealth> = new Map();
let keyIndex = 0;
let initialized = false;

function getKeys(): string[] {
    // Support comma-separated GOOGLE_API_KEYS for rotation
    const rotationKeys = process.env.GOOGLE_API_KEYS;
    if (rotationKeys) {
        const keys = rotationKeys.split(',').map((k) => k.trim()).filter(Boolean);
        if (keys.length > 0) return keys;
    }

    const singleKey = process.env.GEMINI_API_KEY;
    if (singleKey) return [singleKey];

    throw new Error('No Google API keys configured. Set GOOGLE_API_KEYS or GEMINI_API_KEY in .env');
}

function initKeys() {
    if (initialized) return;
    const keys = getKeys();
    for (const key of keys) {
        if (!keyHealthMap.has(key)) {
            keyHealthMap.set(key, {
                key,
                failures: 0,
                lastFailure: 0,
                cooldownUntil: 0,
                totalRequests: 0,
                totalSuccesses: 0,
            });
        }
    }
    initialized = true;
    console.log(`[API Key] Initialized ${keys.length} key(s)`);
}

function isKeyHealthy(health: KeyHealth): boolean {
    const now = Date.now();
    if (now < health.cooldownUntil) return false;
    if (health.failures >= MAX_FAILURES) {
        if (now - health.lastFailure > FAILURE_RESET_MS) {
            health.failures = 0;
            return true;
        }
        return false;
    }
    return true;
}

/** Returns the next healthy API key using round-robin */
export function getNextApiKey(): string {
    initKeys();
    const keys = getKeys();

    for (let attempt = 0; attempt < keys.length; attempt++) {
        const idx = (keyIndex + attempt) % keys.length;
        const key = keys[idx];
        const health = keyHealthMap.get(key);

        if (health && isKeyHealthy(health)) {
            keyIndex = (idx + 1) % keys.length;
            health.totalRequests++;
            console.log(`[API Key] Using key #${idx + 1}/${keys.length} (${health.totalSuccesses} successes, ${health.failures} recent failures)`);
            return key;
        }
    }

    // All keys unhealthy — force-use the least-recently-failed one
    console.warn(`[API Key] ⚠ All ${keys.length} keys unhealthy! Using least-recently-failed key.`);
    let bestKey = keys[0];
    let oldestFailure = Infinity;

    for (const key of keys) {
        const health = keyHealthMap.get(key);
        if (health && health.lastFailure < oldestFailure) {
            oldestFailure = health.lastFailure;
            bestKey = key;
        }
    }

    const health = keyHealthMap.get(bestKey);
    if (health) {
        health.cooldownUntil = 0;
        health.failures = 0;
        health.totalRequests++;
    }

    keyIndex = (keys.indexOf(bestKey) + 1) % keys.length;
    return bestKey;
}

/** Mark a key as failed */
export function markKeyFailed(key: string, statusCode?: number) {
    const health = keyHealthMap.get(key);
    if (!health) return;

    health.failures++;
    health.lastFailure = Date.now();

    if (statusCode === 429) {
        health.cooldownUntil = Date.now() + COOLDOWN_MS;
        console.warn(`[API Key] 🔴 Key rate-limited (429). Cooldown for ${COOLDOWN_MS / 1000}s.`);
    } else {
        console.warn(`[API Key] ⚠ Key failed (${statusCode || 'unknown'}). Failures: ${health.failures}/${MAX_FAILURES}`);
    }
}

/** Mark a key as successful */
export function markKeySuccess(key: string) {
    const health = keyHealthMap.get(key);
    if (!health) return;
    health.failures = 0;
    health.totalSuccesses++;
}
