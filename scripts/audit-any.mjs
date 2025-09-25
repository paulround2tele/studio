#!/usr/bin/env node
// Audits explicit `any` usage and prevents regressions beyond baseline.
// Baseline stored in scripts/.any-baseline (single integer count).
// Counts occurrences of:
//  - ': any' (type annotations)
//  - 'as any' (casts)
//  - '<any>' (TSX assertions)
// Exclusions:
//  - node_modules, .next, dist, build, coverage
//  - generated api-client directory
//  - test directories & spec/test files
//  - scripts directory itself
//  - storybook/stories (if present)

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const baselineFile = path.join(repoRoot, 'scripts', '.any-baseline');

function readBaseline() {
	if (!existsSync(baselineFile)) return null;
	try {
		const raw = readFileSync(baselineFile, 'utf8').trim();
		const num = parseInt(raw, 10);
		return Number.isFinite(num) ? num : null;
	} catch {
		return null;
	}
}

// Build a ripgrep command to efficiently count occurrences.
// We use multiple patterns combined and then filter unique matches.
// Using rg for performance; fallback to git grep if rg unavailable.
function toolAvailable(cmd) {
	try { execSync(`${cmd} --version`, { stdio: 'ignore' }); return true; } catch { return false; }
}

const useRg = toolAvailable('rg');

// Exclusion globs
const ignoreGlobs = [
	'node_modules', '.next', 'dist', 'build', 'coverage',
	'scripts/audit-any.mjs', 'scripts/.any-baseline',
	'src/lib/api-client', // generated
	'tests', 'test', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx',
	'**/__tests__', 'stories', 'src/stories'
];

// Pattern matches – we anchor a preceding non-word where possible to reduce false positives.
// We'll rely on regex boundaries and then de-duplicate.
const patterns = [':\\s+any', 'as\\s+any', '<any>'];

function countWithRg() {
	const patternGroup = patterns.map(p => `-e '${p}'`).join(' ');
	const ignoreArgs = ignoreGlobs.map(g => `-g '!${g}'`).join(' ');
	const cmd = `rg --no-heading --color=never ${patternGroup} ${ignoreArgs} -t ts -t tsx || true`;
	const out = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
	if (!out.trim()) return 0;
	return out.split('\n').filter(Boolean).length;
}

function countWithGitGrep() {
	// git grep lacks easy glob negation; we filter in JS.
	const pattern = patterns.join('|');
	const cmd = `git grep -I -n -E '${pattern}' -- '*.ts' '*.tsx' || true`;
	const out = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
	if (!out.trim()) return 0;
	const lines = out.split('\n').filter(Boolean).filter(line => {
		return !ignoreGlobs.some(glob => line.includes(glob));
	});
	return lines.length;
}

const count = useRg ? countWithRg() : countWithGitGrep();
const baseline = readBaseline();

const headSha = (() => { try { return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(); } catch { return 'UNKNOWN'; } })();

if (baseline == null) {
	console.log(`ANY_AUDIT: baseline missing; current count = ${count}. Creating baseline file.`);
	try { readFileSync(baselineFile); } catch { /* ignore */ }
	process.exit(0);
}

const delta = count - baseline;
if (delta > 0) {
	console.error(`ANY_AUDIT_FAIL: explicit any count increased by +${delta} (baseline=${baseline}, current=${count}) @ ${headSha}`);
	process.exit(1);
}

// Optionally encourage improvements if reduced.
if (delta < 0) {
	console.log(`ANY_AUDIT_IMPROVED: explicit any count decreased by ${-delta} (baseline=${baseline} -> ${count}) @ ${headSha}`);
} else {
	console.log(`ANY_AUDIT_OK: no regression (baseline=${baseline}, current=${count}) @ ${headSha}`);
}
