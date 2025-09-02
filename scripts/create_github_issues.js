#!/usr/bin/env node
/**
 * Create GitHub issues from .github/issues/backlog.json using the GitHub CLI (gh).
 * Requirements:
 * - gh CLI installed and authenticated: https://cli.github.com/
 * - Run from repo root or pass --repo owner/name
 *
 * Usage:
 *   node scripts/create_github_issues.js [--repo owner/name] [--dry-run]
 */
import { execSync, execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function shell(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts });
}

function execGh(args, opts = {}) {
  return execFileSync('gh', args, { stdio: 'pipe', encoding: 'utf8', ...opts });
}

function detectRepo() {
  try {
    const out = execGh(['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner']);
    return out.trim();
  } catch (e) {
    return undefined;
  }
}

const LABEL_COLORS = new Map([
  ['backend', '0366d6'],
  ['frontend', '0e8a16'],
  ['domain-services', '1f6feb'],
  ['http-validation', '1f6feb'],
  ['analysis', '1f6feb'],
  ['orchestrator', 'a371f7'],
  ['store', 'fbca04'],
  ['monitoring', 'f9d0c4'],
  ['config', 'c2e0c6'],
  ['session', 'c5def5'],
  ['sse', 'bfdadc'],
  ['keyword-sets', 'bfd4f2'],
  ['type-safety', 'fef2c0'],
  ['state', 'bfe5bf'],
  ['cleanup', 'f9d0c4'],
  ['ux', 'c5def5'],
  ['api', 'd4c5f9'],
  ['important', 'd93f0b'],
  ['critical', 'b60205'],
  ['nice-to-have', 'cfd3d7'],
  ['tech-debt', '7057ff'],
  ['blocked', '000000'],
  ['defer', 'ededed']
]);

function ensureLabels(allLabels, repo) {
  const unique = Array.from(new Set(allLabels));
  if (unique.length === 0) return;
  let existing = [];
  try {
    const out = execGh(['label', 'list', '--json', 'name', '-q', '.[].name', ...(repo ? ['--repo', repo] : [])]);
    existing = out.split('\n').map(s => s.trim()).filter(Boolean);
  } catch (e) {
    // Fallback: try plain list and parse names from first column
    try {
      const out2 = execGh(['label', 'list', ...(repo ? ['--repo', repo] : [])]);
      existing = out2.split('\n').map(line => line.split(/\s+/)[0]).filter(Boolean);
    } catch (_) {
      existing = [];
    }
  }
  const toCreate = unique.filter(l => !existing.includes(l));
  for (const name of toCreate) {
    const color = LABEL_COLORS.get(name) || 'ededed';
    try {
      execGh(['label', 'create', name, '--color', color, ...(repo ? ['--repo', repo] : [])]);
      // ignore description for brevity
    } catch (e) {
      // If race or permissions, continue
      // console.warn(`Label create failed for ${name}: ${e.message}`);
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  const repoArgIdx = args.indexOf('--repo');
  const dryRun = args.includes('--dry-run');
  let repo = repoArgIdx >= 0 ? args[repoArgIdx + 1] : undefined;
  if (!repo) repo = detectRepo();

  const backlogPath = join(process.cwd(), '.github', 'issues', 'backlog.json');
  if (!existsSync(backlogPath)) {
    console.error(`Backlog not found at ${backlogPath}`);
    process.exit(1);
  }
  const issues = JSON.parse(readFileSync(backlogPath, 'utf8'));
  if (!Array.isArray(issues) || issues.length === 0) {
    console.error('No issues found in backlog.json');
    process.exit(1);
  }

  // Verify gh installed (only when not dry-run)
  if (!dryRun) {
    try {
    shell('gh --version');
    } catch (e) {
      console.error('GitHub CLI (gh) not found. Install from https://cli.github.com/');
      process.exit(1);
    }
  }

  console.log(`Creating ${issues.length} issue(s)${dryRun ? ' [dry-run]' : ''}${repo ? ` in ${repo}` : ''}...`);

  // Ensure labels exist ahead of time to avoid failures
  const allLabels = issues.flatMap(i => Array.isArray(i.labels) ? i.labels : []);
  if (!dryRun) ensureLabels(allLabels, repo);

  for (const [idx, issue] of issues.entries()) {
    const title = issue.title?.trim();
    const body = issue.body?.trim() ?? '';
    const labels = Array.isArray(issue.labels) ? issue.labels.join(',') : '';
    if (!title) {
      console.warn(`Skipping issue #${idx + 1}: missing title`);
      continue;
    }

    const args = ['issue', 'create', '--title', title];
    if (body) args.push('--body', body);
    if (Array.isArray(issue.labels)) {
      for (const l of issue.labels) args.push('--label', l);
    }
    if (repo) args.push('--repo', repo);

    if (dryRun) {
      console.log(`[dry-run] gh ${args.map(a => (a.includes(' ') ? JSON.stringify(a) : a)).join(' ')}`);
      continue;
    }

    try {
      const out = execGh(args);
      console.log(out.trim());
    } catch (e) {
      console.error(`Failed to create issue: ${title}`);
      console.error(e.stdout?.toString?.() || e.message);
      process.exitCode = 1; // continue others but mark non-zero
    }
  }
}

main();
