// Reads a "Copy my settings" block of the Campaign's tuning panel (card space-game-tuning-panel) and says which lines of the tuning tables it means.
// Troy tunes by feel in the game (the N key), copies his settings and pastes them to ORCH; an agent runs this to see the changes, and again with --write to bake them in as the new defaults.
//   node tools/apply-tuning.mjs settings.txt           print each change: the row, its table path, the old default and the new one, and the file and line it is on
//   node tools/apply-tuning.mjs --write settings.txt   the same, and change those lines in the source (src/campaign.js, src/campzoom.js): only the number or the array on the line, never a comment
//   pbpaste | node tools/apply-tuning.mjs -            the block from standard input
//   --root DIR                                         another checkout (default: this one)
// The rows and their places are CAMP_TUNE in src/camptune.js (the one table the panel and this tool share); the block is read with the game's own campTuneParse, so a line the panel would not write is listed
// as "not understood" and nothing is guessed. A switch (CAMP.flags) prints true or false. A row of pips (a shield's mend rate) is written as its whole array: every pip scaled with the one the row shows.
// Exit code 1 when a line is not understood or its place in the source cannot be found. Plain Node 22, no packages.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nodeGame } from '../tests/nodegame.mjs';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = { CAMP: 'src/campaign.js', CAMPZOOM: 'src/campzoom.js' }; // where each table is written

// the line of a path in a table written as the sources write them: one key a line (an inline object may carry the next keys on its own lines, indented further)
// text: the file; name: 'CAMP' or 'CAMPZOOM'; parts: ['carrier', 'speed']. Returns the 0-based index of the line that holds the last key, or -1.
export function findLine(text, name, parts) {
  const lines = text.split('\n'), start = lines.findIndex(l => new RegExp('^const ' + name + ' = \\{').test(l));
  if (start < 0) return -1;
  let at = start, indent = 0;
  for (let d = 0; d < parts.length; d++) {
    const key = parts[d], re = new RegExp('(^|[\\s{,])' + key + '\\s*:');
    let found = -1;
    for (let i = at + (d === 0 ? 1 : 0); i < lines.length; i++) {
      const l = lines[i], m = /^(\s*)/.exec(l), ind = m[1].length;
      if (/^\s*\}/.test(l) && ind <= indent && d > 0) break;               // left the block of the parent
      if (d === 0 && /^\};?\s*$/.test(l)) break;                            // left the table
      if (/^\s*\/\//.test(l)) continue;
      if (re.test(l.replace(/\/\/.*$/, '')) && (d === 0 ? ind === 2 : ind > indent || i === at)) { found = i; break; }
    }
    if (found < 0) return -1;
    at = found; indent = /^(\s*)/.exec(lines[found])[1].length;
  }
  return at;
}

const lit = v => typeof v === 'boolean' ? String(v) : Array.isArray(v) ? '[' + v.join(', ') + ']' : String(v);
// the new text of the file with the row's value written on its line (the number, the array or the boolean after the last key; the comment stays as it was)
export function editText(text, name, path, value) {
  const parts = path.split('.'), i = findLine(text, name, parts); if (i < 0) return null;
  const lines = text.split('\n'), key = parts[parts.length - 1], re = new RegExp('(^|[\\s{,])(' + key + '\\s*:\\s*)(\\[[^\\]]*\\]|true|false|-?\\d+(?:\\.\\d+)?(?:e-?\\d+)?)');
  const code = lines[i].replace(/\/\/.*$/, ''), m = re.exec(code); if (!m) return null;
  const at = m.index + m[1].length + m[2].length, was = m[3];
  lines[i] = lines[i].slice(0, at) + lit(value) + lines[i].slice(at + was.length);
  return { text: lines.join('\n'), line: i + 1, was };
}

export function plan(g, block) { // what the block means: [{ id, label, ref, was, now, name, path }], and the lines that were not understood
  const P = JSON.parse(g.run(`JSON.stringify(campTuneParse(${JSON.stringify(block)}))`)), out = [];
  for (const r of P.rows) {
    const row = JSON.parse(g.run(`JSON.stringify(campTuneRow(${JSON.stringify(r.id)}))`)), isFlag = row.kind === 'flag';
    const name = isFlag ? 'CAMP' : row.root, path = isFlag ? 'flags.' + row.flag : row.path;
    const was = JSON.parse(g.run(`JSON.stringify((() => { const s = campTuneSlot(campTuneRow(${JSON.stringify(r.id)})); return s.obj[s.key]; })())`));
    let now;
    if (isFlag) now = r.value;
    else if (row.of != null) { g.run(`campTuneRestore(); campTuneResetAll(); campTuneSet(${JSON.stringify(r.id)}, ${JSON.stringify(r.value)})`); now = JSON.parse(g.run(`JSON.stringify((() => { const s = campTuneSlot(campTuneRow(${JSON.stringify(r.id)})); return s.obj[s.key]; })())`)); g.run('campTuneResetAll()'); }
    else { g.run(`campTuneResetAll(); campTuneSet(${JSON.stringify(r.id)}, ${JSON.stringify(r.value)})`); now = JSON.parse(g.run(`campTuneValue(${JSON.stringify(r.id)})`)); g.run('campTuneResetAll()'); }
    out.push({ id: r.id, label: g.run(`campTuneLabel(campTuneRow(${JSON.stringify(r.id)}))`), name, path, ref: name + '.' + path, was, now });
  }
  return { rows: out, bad: P.bad };
}

if (process.argv[1] && process.argv[1].endsWith('apply-tuning.mjs')) {
  const args = process.argv.slice(2), write = args.includes('--write'), ri = args.indexOf('--root'), root = ri >= 0 ? resolve(args[ri + 1]) : HERE;
  const file = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--root')[0];
  if (!file) { console.log('usage: node tools/apply-tuning.mjs [--write] [--root DIR] settings.txt   (or - for standard input)'); process.exit(2); }
  const block = file === '-' ? readFileSync(0, 'utf8') : readFileSync(file, 'utf8');
  const g = nodeGame({ root });
  const P = plan(g, block); let failed = P.bad.length;
  const texts = {};
  for (const r of P.rows) {
    const f = FILES[r.name]; texts[f] = texts[f] || readFileSync(join(root, f), 'utf8');
    const e = editText(texts[f], r.name, r.path, r.now);
    if (!e) { console.log(`  NOT FOUND  ${r.ref} (${r.label}): no line for it in ${f}`); failed++; continue; }
    console.log(`  ${r.ref}  ${lit(r.was)} -> ${lit(r.now)}   (${f}:${e.line}, ${r.label})`);
    if (write) texts[f] = e.text;
  }
  P.bad.forEach(l => console.log('  NOT UNDERSTOOD  ' + l));
  if (write && !failed) { Object.keys(texts).forEach(f => writeFileSync(join(root, f), texts[f])); console.log(`wrote ${Object.keys(texts).join(', ')}`); }
  else if (write) console.log('nothing written: fix the lines above first');
  if (!P.rows.length && !P.bad.length) console.log('nothing to change: the block has no rows');
  process.exit(failed ? 1 : 0);
}
