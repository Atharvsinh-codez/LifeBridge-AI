import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load root .env for monorepo local development.
// On Render (production), env vars are set via Dashboard — this block is safely skipped.
try {
  const rootEnvPath = resolve(process.cwd(), '../../.env');
  if (existsSync(rootEnvPath)) {
    const content = readFileSync(rootEnvPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex);
      const value = trimmed.slice(eqIndex + 1);
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
} catch { }

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: [
    '@lifebridge/shared',
    '@lifebridge/config',
    '@lifebridge/ui',
    '@lifebridge/emergency-knowledge',
    '@lifebridge/prompts',
    '@lifebridge/validation',
  ],
};

export default nextConfig;
