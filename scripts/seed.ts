// Seed the local D1 with demo data: pnpm seed:local (idempotent). Pass --remote to seed production. Don't.
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { seedStatements } from '../src/lib/server/seed.ts';

const remote = process.argv.includes('--remote');
const dir = await mkdtemp(path.join(tmpdir(), 'skillswap-seed-'));
const file = path.join(dir, 'seed.sql');
await writeFile(file, seedStatements().join('\n') + '\n');
const r = spawnSync(
	'pnpm',
	[
		'exec',
		'wrangler',
		'd1',
		'execute',
		'skillswap-db',
		remote ? '--remote' : '--local',
		'--file',
		file
	],
	{ stdio: 'inherit' }
);
await rm(dir, { recursive: true, force: true });
process.exit(r.status ?? 1);
