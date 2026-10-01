import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The workflow supplies the actual Pages path, including custom-domain support.
// The default also lets `npm run build:pages` reproduce this repository locally.
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '/zombie').replace(/\/$/, '');
const result = spawnSync(
  process.execPath,
  [fileURLToPath(import.meta.resolve('next/dist/bin/next')), 'build', '--webpack'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      GITHUB_PAGES: 'true',
      NEXT_PUBLIC_BASE_PATH: basePath,
    },
  },
);

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

// Keep Next.js's _next directory accessible even when serving without Actions.
writeFileSync('out/.nojekyll', '');
