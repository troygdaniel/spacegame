#!/usr/bin/env node
// The voice pack tool (card space-game-voice-pack): records every FIXED line the game speaks once, into voicepack/ (an mp3 per line and an index), so a repeated line costs nothing and the game speaks its fixed lines with no key.
// You run it yourself, with your own Deepgram key, in a terminal. The key is read from the environment (DEEPGRAM_API_KEY) and nowhere else: it is never an argument, never printed, never written to a file, and an agent never has it.
//   node tools/voicepack.mjs --dry-run      the plan: how many lines, how many characters, what it would cost. No key is read, nothing is sent. Start here.
//   node tools/voicepack.mjs                 the plan, then it ASKS ("type yes"); only then it records what is new or changed, one line at a time, saving as it goes (stop it and run it again: it carries on)
//   node tools/voicepack.mjs --list          every line of the catalogue with its name and whether it is recorded; --list --skipped adds the lines that are NOT recorded (a number or a name in them) and why
//   node tools/voicepack.mjs --check         exit 1 when a line is not recorded, a recorded line is no line any more (stale), a file is missing, or a key of the content tables is not classified (spoken or silent): for after a recording
//   node tools/voicepack.mjs --prune         the plan, then asks, and removes the stale files and entries (a line whose words changed leaves its old recording behind until you do this)
//   --voices a,b      the ship voices to record (default aura-athena-en, the ship computer's own; the wing's four pilots are always in their own voices)
//   --only SOURCE     only this source (events, campaign.say, campaign.no, campaign.story, campaign.brief, campaign.warp, campaign.chatter, or one a card added)
//   --max-cost USD    refuse to spend more than this in one run (default 5)
//   --root DIR        another checkout of the game (default: this one); --dir DIR  another folder for the pack (default: <root>/voicepack)
// Incremental: a line is named by a hash of its voice and its exact words (src/voicepack.js), so a line whose text changed is a new line, an unchanged one is skipped, and nothing is recorded twice. The text of the game is not final: run it
// again after each change, and it records only what changed. Needs Node 22+ and no packages.
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import readline from 'node:readline';
import { nodeGame } from '../tests/nodegame.mjs';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Deepgram's published text-to-speech prices, dollars per 1,000 characters (a guess to tell you the size of the bill, not a quote: see deepgram.com/pricing). Aura: 0.015, Aura-2: 0.030.
export const PRICE_PER_1K = { aura: 0.015, 'aura-2': 0.030 };
export const SPEAK_URL = 'https://api.deepgram.com/v1/speak';
const VOICE_NAME = /^aura(-2)?-[a-z]{3,12}-en$/;
const priceOf = voice => (/^aura-2-/.test(voice) ? PRICE_PER_1K['aura-2'] : PRICE_PER_1K.aura);
export const costOf = lines => lines.reduce((a, l) => a + l.text.length / 1000 * priceOf(l.voice), 0);
const usd = x => '$' + (x < 0.01 && x > 0 ? '0.01' : x.toFixed(2));

// ---- the game's catalogue, read from its own scripts in Node ----
const MEMO = new Map(); // booting the game takes a second: one catalogue per checkout and voices for the life of the process
export function loadCatalogue(root, opts) {
  const k = root + '|' + JSON.stringify(opts || {}); if (MEMO.has(k)) return { cat: JSON.parse(JSON.stringify(MEMO.get(k))) };
  const g = nodeGame({ root }), cat = JSON.parse(g.run(`JSON.stringify(voicePackCatalogue(${JSON.stringify(opts || {})}))`));
  MEMO.set(k, cat); return { cat: JSON.parse(JSON.stringify(cat)) };
}
export function readIndexRaw(dir) {
  try { const raw = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')); return raw && raw.v === 1 && raw.lines && typeof raw.lines === 'object' ? raw : { v: 1, lines: {} }; } catch (e) { return { v: 1, lines: {} }; }
}
export function writeIndex(dir, index) { // atomic: a stopped run never leaves half an index
  mkdirSync(dir, { recursive: true });
  const sorted = { v: 1, lines: {} }; Object.keys(index.lines).sort().forEach(id => { sorted.lines[id] = index.lines[id]; });
  const tmp = join(dir, 'index.json.tmp'); writeFileSync(tmp, JSON.stringify(sorted, null, 1) + '\n'); renameSync(tmp, join(dir, 'index.json'));
}
// what is to do against the index and the folder: the lines to record (new, changed, or whose file is gone), the entries that are no line, the files that are no entry
export function planOf(cat, index, dir) {
  const have = index.lines, ids = new Set(cat.lines.map(l => l.id));
  const todo = cat.lines.filter(l => !(have[l.id] && have[l.id].text === l.text && have[l.id].voice === l.voice && existsSync(join(dir, l.id + '.mp3'))));
  const stale = Object.keys(have).filter(id => !ids.has(id));
  const orphans = existsSync(dir) ? readdirSync(dir).filter(f => /^[a-z0-9-]+\.mp3$/.test(f) && !have[f.slice(0, -4)]) : [];
  return { total: cat.lines.length, done: cat.lines.length - todo.length, todo, stale, orphans, chars: todo.reduce((a, l) => a + l.text.length, 0), cost: costOf(todo) };
}

// ---- recording: one line at a time, saving as it goes ----
// fetchFn and the key are given by the caller; the key is used in one header and goes nowhere else (not into a message, a log or a file)
export async function record(plan, { fetchFn, key, dir, index, log = () => {}, wait = ms => new Promise(r => setTimeout(r, ms)), gap = 250 }) {
  mkdirSync(dir, { recursive: true });
  let ok = 0, failed = 0, spent = 0, stopped = '';
  for (let i = 0; i < plan.todo.length; i++) {
    const l = plan.todo[i]; let res = null, tries = 0;
    if (!VOICE_NAME.test(l.voice)) { log(`  skipped (not an Aura voice name): ${l.voice}`); failed++; continue; }
    while (tries++ < 3) {
      try { res = await fetchFn(SPEAK_URL + '?model=' + encodeURIComponent(l.voice) + '&encoding=mp3', { method: 'POST', headers: { Authorization: 'Token ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: l.text }) }); }
      catch (e) { res = null; }
      if (res && res.status === 429) { await wait(2000 * tries); continue; }
      break;
    }
    if (res && (res.status === 401 || res.status === 402 || res.status === 403)) { stopped = `Deepgram refused the key (HTTP ${res.status}). Nothing more was spent; ${ok} line(s) are saved.`; break; }
    if (!res || !res.ok) { failed++; log(`  failed (${res ? 'HTTP ' + res.status : 'no answer'}): ${l.text}`); if (failed >= 3 && ok === 0) { stopped = 'Three lines failed in a row. Stopped; nothing is lost.'; break; } continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 400) { failed++; log(`  failed (an empty answer): ${l.text}`); continue; }
    writeFileSync(join(dir, l.id + '.mp3'), buf);
    index.lines[l.id] = { text: l.text, voice: l.voice, bytes: buf.length, source: l.source }; writeIndex(dir, index);
    ok++; spent += l.text.length / 1000 * priceOf(l.voice); log(`  ${i + 1}/${plan.todo.length}  ${l.id}  ${buf.length} bytes  ${l.text}`);
    if (gap) await wait(gap);
  }
  return { ok, failed, spent, stopped };
}
export function prune(plan, { dir, index }) {
  let n = 0;
  plan.stale.forEach(id => { delete index.lines[id]; const f = join(dir, id + '.mp3'); if (existsSync(f)) { unlinkSync(f); n++; } });
  plan.orphans.forEach(f => { unlinkSync(join(dir, f)); n++; });
  writeIndex(dir, index); return n;
}

// ---- the command line ----
export function parseArgs(argv) {
  const o = { dry: false, list: false, skipped: false, check: false, prune: false, voices: null, only: '', maxCost: 5, root: HERE, dir: '', help: false, bad: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => argv[++i];
    if (a === '--dry-run') o.dry = true; else if (a === '--list') o.list = true; else if (a === '--skipped') o.skipped = true; else if (a === '--check') o.check = true; else if (a === '--prune') o.prune = true;
    else if (a === '--voices') o.voices = String(next() || '').split(',').map(s => s.trim()).filter(Boolean); else if (a === '--only') o.only = String(next() || '');
    else if (a === '--max-cost') o.maxCost = Number(next()); else if (a === '--root') o.root = resolve(String(next() || '')); else if (a === '--dir') o.dir = resolve(String(next() || ''));
    else if (a === '-h' || a === '--help') o.help = true;
    else if (/^--?(key|token|api|secret|auth|password)/i.test(a)) { o.bad = 'The key is never an argument (it would sit in your shell history). Set DEEPGRAM_API_KEY in the environment.'; return o; } // stop here: what follows may be the key, and nothing of it is echoed
    else { o.bad = /^--[a-z-]{1,20}$/.test(a) ? 'Unknown option: ' + a : 'Unknown argument.'; return o; }
  }
  if (o.voices && o.voices.some(v => !VOICE_NAME.test(v))) o.bad = 'A voice is an Aura name such as aura-athena-en.';
  if (!Number.isFinite(o.maxCost) || o.maxCost < 0) o.bad = '--max-cost is a number of dollars.';
  return o;
}
const HELP = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//')).slice(0, 18).map(l => l.slice(3)).join('\n');

// io: { out(line), ask(question) -> Promise<string>, isTTY, env, fetch }: the real ones in a terminal, stand-ins in a test
export async function main(argv, io) {
  const o = parseArgs(argv), out = io.out;
  if (o.help) { out(HELP); return 0; }
  if (o.bad) { out(o.bad); return 2; }
  const dir = o.dir || join(o.root, 'voicepack'), { cat } = loadCatalogue(o.root, { voices: o.voices || undefined });
  if (o.only) cat.lines = cat.lines.filter(l => l.source === o.only);
  const index = readIndexRaw(dir), plan = planOf(cat, index, dir);
  const bySource = {}; cat.lines.forEach(l => { bySource[l.source] = (bySource[l.source] || 0) + 1; });
  if (o.list) {
    cat.lines.forEach(l => out(`${plan.todo.includes(l) ? 'todo     ' : 'recorded '}${l.id}  [${l.source}]  ${l.text}`));
    if (o.skipped) { cat.skipped.forEach(s => out(`not recorded  [${s.source}] ${s.key}  ${s.text}\n              ${s.why}`)); cat.live.forEach(s => out(`live  ${s.where}: ${s.why}`)); }
    return 0;
  }
  out(`The voice pack: ${plan.total} fixed lines (${Object.keys(bySource).map(k => `${k} ${bySource[k]}`).join(', ')}); ${plan.done} recorded, ${plan.todo.length} to record, ${plan.stale.length} stale entries, ${plan.orphans.length} stray files.`);
  out(`Not recorded: ${cat.skipped.length} line(s) with a number or a name in them stay live (spoken through Deepgram for a player with a key); --list --skipped says which and why.`);
  const un = cat.unclassified || [];
  if (un.length) out(`WARNING: ${un.length} key(s) of the content tables are not classified, so the pack cannot know if the game speaks them: ${un.slice(0, 8).join(', ')}${un.length > 8 ? ', ...' : ''}. Add a rule to VOICEPACK_FAMILIES in src/voicepack.js: spoken (a source and a voice) or silent (a reason).`);
  if (o.check) {
    const bad = plan.todo.length + plan.stale.length + plan.orphans.length + un.length; out(bad ? `CHECK FAILED: ${plan.todo.length} to record, ${plan.stale.length} stale, ${plan.orphans.length} stray, ${un.length} unclassified.` : 'CHECK PASSED: every fixed line is recorded and nothing else is in the pack.'); return bad ? 1 : 0;
  }
  if (o.prune) {
    if (!plan.stale.length && !plan.orphans.length) { out('Nothing to prune.'); return 0; }
    out(`It would remove ${plan.stale.length} stale entries and ${plan.orphans.length} stray files.`);
    if (o.dry) { out('Dry run: nothing removed.'); return 0; }
    if (!io.isTTY) { out('Run it in a terminal: it asks before it removes anything.'); return 2; }
    if (String(await io.ask('Type yes to remove them: ')).trim().toLowerCase() !== 'yes') { out('Nothing removed.'); return 0; }
    out(`Removed ${prune(plan, { dir, index })} file(s).`); return 0;
  }
  if (!plan.todo.length) { out('Nothing to record: the pack is complete for the text as it is.'); return 0; }
  const chars = plan.chars, vo = {}; plan.todo.forEach(l => { vo[l.voice] = (vo[l.voice] || 0) + l.text.length; });
  out(`To record: ${plan.todo.length} lines, ${chars} characters (${Object.keys(vo).map(v => `${v} ${vo[v]}`).join(', ')}).`);
  out(`Estimate: about ${usd(plan.cost)} on your Deepgram account (Aura ${PRICE_PER_1K.aura} dollars and Aura-2 ${PRICE_PER_1K['aura-2']} dollars per 1,000 characters: a guess, see deepgram.com/pricing). Lines already recorded are not charged again.`);
  if (o.dry) { out('Dry run: no key was read and nothing was sent.'); return 0; }
  if (plan.cost > o.maxCost) { out(`That is over the limit of ${usd(o.maxCost)}. Raise it with --max-cost if you mean it.`); return 2; }
  if (!io.isTTY) { out('Run it in a terminal: it asks before it spends anything.'); return 2; }
  const key = String(io.env.DEEPGRAM_API_KEY || '').trim();
  if (!key) { out('Set your key in the environment first: export DEEPGRAM_API_KEY=... (this tool never writes it down). Then run it again.'); return 2; }
  const answer = String(await io.ask(`Type yes to spend about ${usd(plan.cost)} recording ${plan.todo.length} lines: `)).trim().toLowerCase();
  if (answer !== 'yes') { out('Nothing was spent.'); return 0; }
  const r = await record(plan, { fetchFn: io.fetch, key, dir, index, log: out, wait: io.wait, gap: io.gap });
  out(`Recorded ${r.ok} line(s)${r.failed ? `, ${r.failed} failed (run it again to retry them)` : ''}; about ${usd(r.spent)} spent.${r.stopped ? ' ' + r.stopped : ''}`);
  return r.stopped || r.failed ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const io = { out: l => console.log(l), ask: q => new Promise(res => rl.question(q, res)), isTTY: !!process.stdin.isTTY && !!process.stdout.isTTY, env: process.env, fetch: globalThis.fetch };
  main(process.argv.slice(2), io).then(code => { rl.close(); process.exit(code); }, e => { rl.close(); console.error(String(e && e.message || e).replace(/Token\s+\S+/g, 'Token ***')); process.exit(1); });
}
