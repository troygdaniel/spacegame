#!/usr/bin/env node
// Reads the test-run ledger (tests/ledger.mjs, one line per test run) and prints what testing cost: totals per suite and per day.
//
//   node tools/test-ledger.mjs                       every run in the ledger
//   node tools/test-ledger.mjs --days 7              the last 7 days (local time)
//   node tools/test-ledger.mjs --since 2026-11-14    from that day on
//   node tools/test-ledger.mjs --who spacegame-TaskMaster-2 --via smoke   only that runner / only smoke runs (or hand)
//   node tools/test-ledger.mjs --by who              the first table by runner (or: via) instead of by suite
//   node tools/test-ledger.mjs --file <path>         another ledger file (default: the shared one, see tests/ledger.mjs)
//
// "total" is the whole process, the wait for the Chrome lock included; "waited" is the lock wait inside it; "ran" is total minus waited,
// what the run itself cost. Read-only; a missing ledger says so and exits 0.
import { pathToFileURL } from 'node:url';
import { ledgerPath, readRuns } from '../tests/ledger.mjs';

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };
const HELP = 'usage: node tools/test-ledger.mjs [--days N | --since YYYY-MM-DD] [--who NAME] [--via smoke|hand] [--by suite|who|via] [--file PATH]\n' +
  'Totals of the test runs the ledger recorded (tests/ledger.mjs), per suite and per day.';

const dayOf = at => { const d = new Date(at); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export function span(s) { // 75 -> "1m 15s", 4 -> "4.0s", 3700 -> "1h 02m"
  if (s < 59.95) return Math.max(0, s).toFixed(1) + 's';
  const t = Math.round(s), m = Math.floor(t / 60);
  if (m < 60) return `${m}m ${String(t % 60).padStart(2, '0')}s`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

// group the runs by a key and total each group
export function totals(runs, key) {
  const g = new Map();
  for (const r of runs) {
    const k = key(r);
    const t = g.get(k) || { key: k, runs: 0, failed: 0, total: 0, waited: 0, longest: 0, smoke: 0 };
    t.runs++; if (r.result !== 'pass') t.failed++;
    t.total += r.seconds; t.waited += r.waited; t.longest = Math.max(t.longest, r.seconds - r.waited);
    if (r.via === 'smoke') t.smoke++;
    g.set(k, t);
  }
  return [...g.values()];
}

function table(head, rows, widths) {
  const line = cells => cells.map((c, i) => (i === 0 ? String(c).padEnd(widths[i]) : String(c).padStart(widths[i]))).join('  ');
  return [line(head), line(head.map((h, i) => '-'.repeat(widths[i]))), ...rows.map(line)].join('\n');
}

function main() {
  if (args.includes('-h') || args.includes('--help')) { console.log(HELP); return; }
  const file = opt('file') || ledgerPath(process.env.LONGHAUL_LEDGER === 'off' ? {} : process.env); // 'off' stops writing; the reader still reads the default file
  let runs = readRuns(file);
  if (!runs.length) { console.log(`no test runs recorded yet (ledger: ${file})`); return; }
  const days = Number(opt('days')), since = opt('since'), who = opt('who'), via = opt('via'), by = opt('by') || 'suite';
  if (!['suite', 'who', 'via'].includes(by)) { console.error(`--by is suite, who or via, not ${by}`); process.exit(2); }
  if (days > 0) { const from = new Date(); from.setHours(0, 0, 0, 0); from.setDate(from.getDate() - (days - 1)); runs = runs.filter(r => r.at >= from.getTime()); }
  if (since) { const from = new Date(since + 'T00:00:00'); if (Number.isNaN(from.getTime())) { console.error(`--since wants YYYY-MM-DD, not ${since}`); process.exit(2); } runs = runs.filter(r => r.at >= from.getTime()); }
  if (who) runs = runs.filter(r => r.who === who);
  if (via) runs = runs.filter(r => r.via === via);
  if (!runs.length) { console.log('no test runs match that (ledger: ' + file + ')'); return; }

  const all = totals(runs, () => 'all')[0], first = dayOf(Math.min(...runs.map(r => r.at))), last = dayOf(Math.max(...runs.map(r => r.at)));
  console.log(`${all.runs} test runs, ${first} to ${last}: ${span(all.total)} in all, ${span(all.waited)} of it waiting for the Chrome lock (${Math.round(100 * all.waited / (all.total || 1))}%), ${all.failed} not passed`);
  console.log(`ledger: ${file}\n`);

  const rowOf = (t, label) => [label ?? t.key, t.runs, t.failed || '', span(t.total), t.waited ? span(t.waited) : '', span(t.total - t.waited), span((t.total - t.waited) / t.runs), span(t.longest)];
  const head = [by, 'runs', 'not pass', 'total', 'waited', 'ran', 'mean ran', 'longest'];
  const bySuite = totals(runs, r => r[by]).sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
  const rows1 = bySuite.map(t => rowOf(t));
  console.log(`per ${by} (most total time first)`);
  console.log(table(head, rows1, head.map((h, i) => Math.max(h.length, ...rows1.map(r => String(r[i]).length)))));

  const byDay = totals(runs, r => dayOf(r.at)).sort((a, b) => a.key.localeCompare(b.key));
  const head2 = ['day', 'runs', 'not pass', 'total', 'waited', 'ran', 'smoke runs', 'hand runs'];
  const rows2 = byDay.map(t => [t.key, t.runs, t.failed || '', span(t.total), t.waited ? span(t.waited) : '', span(t.total - t.waited), t.smoke, t.runs - t.smoke]);
  console.log('\nper day');
  console.log(table(head2, rows2, head2.map((h, i) => Math.max(h.length, ...rows2.map(r => String(r[i]).length)))));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
