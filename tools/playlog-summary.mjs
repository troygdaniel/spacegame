// Reads a Long Haul play log (src/playlog.js) and prints one screen: how the game was played (card space-game-playlog).
//   node tools/playlog-summary.mjs                 the newest file in ~/dev/spacegame-playlogs (or $LONGHAUL_PLAYLOGS), its last session
//   node tools/playlog-summary.mjs FILE            a file: one the dev server kept, or one downloaded from Settings > Reset > Download log
//   node tools/playlog-summary.mjs FILE --session ID     another session of that file      --all    every session of it as one
//   node tools/playlog-summary.mjs FILE --json    the numbers, not the screen
// ORCH reads this and talks it through with Troy: playtime, where the time went, the credits, the deals, the deaths and what killed him, what he pressed most,
// the idle gaps (20 s or more with no input, with what was on screen: the best sign of confusion), the errors, the frame dips, and where the session ended.
// Needs Node 22+, no packages. The log has no typed or spoken text in it; this prints only what is in it.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const top = (m, n) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);
const mmss = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60; return (h ? h + 'h ' : '') + (h || m ? String(m).padStart(h ? 2 : 1, '0') + 'm ' : '') + String(r).padStart(h || m ? 2 : 1, '0') + 's'; };
const num = n => Math.round(n).toLocaleString('en-US');
const BARS = '▁▂▃▄▅▆▇█';

// the lines of a text, the ones that are JSON objects with an "ev"
export function parseLog(text) {
  const out = [];
  String(text).split('\n').forEach(l => { l = l.trim(); if (!l || l[0] !== '{') return; try { const o = JSON.parse(l); if (o && typeof o.ev === 'string') out.push(o); } catch (e) { /* a torn line at the end of a file */ } });
  return out;
}
export function sessionsOf(events) {
  const by = new Map();
  events.forEach(e => { const k = e.s || '?'; if (!by.has(k)) by.set(k, []); by.get(k).push(e); });
  return [...by.entries()].map(([id, evs]) => ({ id, events: evs, start: evs.find(e => e.ev === 'session' && e.phase === 'start') }));
}

// the numbers of one session (or of all, merged: pass all the events)
export function summarize(events) {
  const S = { events: events.length, build: {}, scenes: {}, samples: [], deals: { buy: 0, sell: 0, buyN: 0, sellN: 0, by: {} }, missions: { accepted: 0, done: 0, failed: 0, dropped: 0, pay: 0, by: {} }, credits: { other: 0 },
    docks: 0, systems: [], jumps: 0, deaths: [], deathCauses: {}, actions: {}, idle: [], computer: { n: 0, ms: 0, failed: 0, codes: {}, tools: {} }, listen: { starts: 0, opens: 0, openMs: 0, openFail: 0, releases: 0, held: 0, clips: 0, heard: 0, heardEmpty: 0, ends: {} }, chat: { n: 0, ms: 0, failed: 0, codes: {} },
    errors: [], errorCount: 0, dips: [], pauses: 0, settings: 0, hidden: 0, stalls: 0, end: null, endScene: '', last: null, unclean: false };
  const errs = new Map();
  events.forEach(e => {
    S.last = e;
    switch (e.ev) {
      case 'server': S.build.commit = e.commit; S.build.node = e.node; break;
      case 'session':
        if (e.phase === 'start') { S.start = e; if (e.prev === 'unclean') S.unclean = true; S.build.mods = e.mods; S.build.scr = e.scr; }
        else if (e.phase === 'end') S.end = e;
        break;
      case 'scene':
        if (e.from && e.secs >= 0) S.scenes[e.from] = (S.scenes[e.from] || 0) + e.secs;
        if (e.to === 'Pause') S.pauses++; if (e.to === 'Settings') S.settings++;
        break;
      case 'sample': S.samples.push(e); break;
      case 'dock': S.docks++; break;
      case 'system': if (!S.systems.includes(e.to)) S.systems.push(e.to); break;
      case 'jump': S.jumps++; break;
      case 'buy': case 'sell': { const d = S.deals; d[e.ev]++; d[e.ev + 'N'] += e.n || 0; const w = d.by[e.what] = d.by[e.what] || { n: 0, sum: 0 }; w.n++; w.sum += e.n || 0; break; }
      case 'credits': S.credits.other += e.delta || 0; break;
      case 'mission': { const m = S.missions; if (m[e.state] !== undefined) m[e.state]++; if (e.state === 'done') m.pay += e.pay || 0; if (e.id) { const b = m.by[e.id] = m.by[e.id] || {}; b[e.state] = (b[e.state] || 0) + 1; } break; }
      case 'death': S.deaths.push(e); S.deathCauses[e.cause || 'unknown'] = (S.deathCauses[e.cause || 'unknown'] || 0) + 1; break;
      case 'counts': Object.entries(e.a || {}).forEach(([k, v]) => { S.actions[k] = (S.actions[k] || 0) + v; }); break;
      case 'idle': S.idle.push(e); break;
      case 'computer': S.computer.n++; S.computer.ms += e.ms || 0; if (e.ok === false) { S.computer.failed++; const k = (e.code || 'error') + (e.why ? '/' + e.why : ''); S.computer.codes[k] = (S.computer.codes[k] || 0) + 1; } break;
      case 'listen': { const V = S.listen; switch (e.step) {
        case 'start': V.starts++; break;
        case 'open': V.opens++; V.openMs += e.ms || 0; if (e.ok === false) V.openFail++; break;
        case 'release': V.releases++; V.held += e.held || 0; break;
        case 'clip': V.clips++; break;
        case 'heard': V.heard++; if (!e.chars) V.heardEmpty++; break;
        case 'end': V.ends[e.why || 'other'] = (V.ends[e.why || 'other'] || 0) + 1; break;
        default: break; } break; }
      case 'computer_plan': S.computer.tools[e.action || 'none'] = (S.computer.tools[e.action || 'none'] || 0) + 1; break;
      case 'npc_chat': S.chat.n++; S.chat.ms += e.ms || 0; if (e.ok === false) { S.chat.failed++; S.chat.codes[e.code || 'error'] = (S.chat.codes[e.code || 'error'] || 0) + 1; } break;
      case 'error': { S.errorCount++; const k = (e.kind || '') + '|' + String(e.msg || '').slice(0, 120); const x = errs.get(k) || { kind: e.kind, msg: e.msg, stack: e.stack, scene: e.scene, n: 0, t: e.t }; x.n++; errs.set(k, x); break; }
      case 'fps_dip': S.dips.push(e); break;
      case 'tab': if (e.state === 'hidden') S.hidden++; break;
      case 'stall': S.stalls++; break;
      default: break;
    }
  });
  S.errors = [...errs.values()].sort((a, b) => b.n - a.n);
  const first = events[0], lastT = Math.max(0, ...events.map(e => e.t || 0));
  S.secs = S.end && S.end.secs != null ? S.end.secs : Math.round(lastT / 1000);
  S.startW = S.start && S.start.w; S.endW = S.end && S.end.w;
  const lastSample = S.samples[S.samples.length - 1], firstSample = S.samples[0];
  S.credits.first = firstSample ? firstSample.credits : null; S.credits.last = lastSample ? lastSample.credits : null;
  S.credits.min = S.samples.length ? Math.min(...S.samples.map(s => s.credits)) : null; S.credits.max = S.samples.length ? Math.max(...S.samples.map(s => s.credits)) : null;
  S.endScene = (S.end && S.end.scene) || (lastSample && lastSample.scene) || '';
  S.endSystem = (S.end && S.end.system) || (lastSample && lastSample.system) || '';
  S.endMission = lastSample ? lastSample.mission : '';
  S.spans = S.scenes; S.firstEvent = first;
  return S;
}

const spark = (vals, n = 28) => {
  if (!vals.length) return ''; const lo = Math.min(...vals), hi = Math.max(...vals), b = [];
  for (let i = 0; i < Math.min(n, vals.length); i++) { const a = Math.floor(i * vals.length / Math.min(n, vals.length)), z = Math.max(a + 1, Math.floor((i + 1) * vals.length / Math.min(n, vals.length))); b.push(vals.slice(a, z).reduce((p, c) => p + c, 0) / (z - a)); }
  return b.map(v => BARS[hi === lo ? 0 : Math.min(7, Math.floor((v - lo) / (hi - lo) * 7.999))]).join('');
};
const when = w => (w ? new Date(w * 1000).toLocaleString('en-CA', { dateStyle: 'short', timeStyle: 'short', hour12: false }) : '');
const clip = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));

// one screen
export function render(S, label = '') {
  const L = [], total = Object.values(S.scenes).reduce((a, b) => a + b, 0) || 1;
  const stamp = S.startW ? when(S.startW) + (S.endW ? ' to ' + when(S.endW).slice(-5) : '') : '';
  L.push(`LONG HAUL PLAY LOG  ${label}${S.build.commit ? '  commit ' + S.build.commit : ''}${S.build.mods && S.build.mods !== 'none' ? '  mods ' + S.build.mods : ''}${S.build.scr ? '  window ' + S.build.scr : ''}`);
  L.push(`Played ${mmss(S.secs)}${stamp ? '  (' + stamp + ')' : ''}.  Ended: ${S.end ? (S.end.why === 'pagehide' ? 'tab closed or page reloaded' : S.end.why) : 'NO END LINE (the page died or the log is cut)'}${S.endScene ? ' in ' + S.endScene : ''}${S.endSystem ? ' (' + S.endSystem + ')' : ''}${S.endMission && S.endMission !== 'none' ? ', a call under way: ' + S.endMission : ''}${S.unclean ? '  [the session before it did not end]' : ''}`);
  L.push('');
  L.push('Where the time went:  ' + top(S.scenes, 6).map(([k, v]) => `${k} ${mmss(v)} ${Math.round(v / total * 100)}%`).join('   '));
  if (S.credits.first != null) L.push(`Credits: ${num(S.credits.first)} -> ${num(S.credits.last)}  (low ${num(S.credits.min)}, high ${num(S.credits.max)})   ${spark(S.samples.map(s => s.credits))}`);
  const d = S.deals, m = S.missions;
  L.push(`Deals: bought ${d.buy} for ${num(-d.buyN)} cr, sold ${d.sell} for ${num(d.sellN)} cr: net ${d.buyN + d.sellN >= 0 ? '+' : ''}${num(d.buyN + d.sellN)}${top(d.by, 4).length ? '   (' + Object.entries(d.by).sort((a, b) => b[1].n - a[1].n).slice(0, 4).map(([k, v]) => `${k} x${v.n} ${v.sum >= 0 ? '+' : ''}${num(v.sum)}`).join(', ') + ')' : ''}`);
  L.push(`Calls: accepted ${m.accepted}, done ${m.done} (+${num(m.pay)} cr), failed ${m.failed}, dropped ${m.dropped}${Object.keys(m.by).length ? '   (' + Object.entries(m.by).map(([k, v]) => `${k}: ${Object.entries(v).map(([s, c]) => c + ' ' + s).join(', ')}`).join('; ') + ')' : ''}.   Other credits (fees, finds): ${S.credits.other >= 0 ? '+' : ''}${num(S.credits.other)}`);
  L.push(`Docks ${S.docks}, jumps ${S.jumps}${S.systems.length ? ', systems seen: ' + S.systems.join(', ') : ''}.   Pauses ${S.pauses}, Settings ${S.settings}${S.hidden ? ', tab hidden ' + S.hidden + 'x' : ''}${S.stalls ? ', page froze ' + S.stalls + 'x' : ''}`);
  L.push(`Deaths ${S.deaths.length}${S.deaths.length ? ': ' + top(S.deathCauses, 4).map(([k, v]) => `${k} x${v}`).join(', ') + ' (in ' + [...new Set(S.deaths.map(x => x.system).filter(Boolean))].join(', ') + ')' : ''}`);
  const acts = top(S.actions, 8);
  L.push('Pressed most:  ' + (acts.length ? acts.map(([k, v]) => `${k.replace(/^key:/, '')} ${num(v)}`).join('   ') : '(nothing counted)'));
  const c = S.computer, ch = S.chat, v = S.listen;
  if (v.starts || Object.keys(v.ends).length) L.push(`Voice (U): ${v.starts} holds${v.opens ? `, mic open in ${(v.openMs / v.opens / 1000).toFixed(1)} s${v.openFail ? ` (${v.openFail} failed)` : ''}` : ''}${v.releases ? `, held ${(v.held / v.releases).toFixed(1)} s` : ''}${v.heard ? `, heard ${v.heard - v.heardEmpty} of ${v.heard}` : ''}.  Ended: ${Object.keys(v.ends).length ? top(v.ends, 5).map(([k, n]) => k + ' x' + n).join(', ') : 'no end seen'}`);
  if (c.n || ch.n) L.push(`Ship computer: ${c.n} asks${c.n ? `, ${(c.ms / c.n / 1000).toFixed(1)} s each` : ''}${c.failed ? `, ${c.failed} failed (${Object.entries(c.codes).map(([k, v]) => k + ' x' + v).join(', ')})` : ''}${Object.keys(c.tools).length ? '; chose: ' + top(c.tools, 5).map(([k, v]) => `${k} x${v}`).join(', ') : ''}.   Bar chat: ${ch.n}${ch.n ? `, ${(ch.ms / ch.n / 1000).toFixed(1)} s each` : ''}${ch.failed ? `, ${ch.failed} failed` : ''}`);
  const idle = [...S.idle].sort((a, b) => b.secs - a.secs), conf = idle.filter(i => !i.auto), auto = idle.length - conf.length;
  L.push('');
  L.push(`Idle gaps (20 s or more with no input): ${idle.length}, ${mmss(idle.reduce((a, b) => a + b.secs, 0))} in all${auto ? `; ${auto} while the ship flew itself` : ''}.  ${conf.length ? 'Longest where nothing was flying itself:' : ''}`);
  conf.slice(0, 5).forEach(i => L.push(`   at ${mmss((i.t || 0) / 1000).padStart(7)}  ${String(Math.round(i.secs)).padStart(4)} s${i.open ? '+' : ' '}  ${i.scene || '?'}${i.panel ? ' / ' + i.panel : ''}${i.scenes && i.scenes !== i.scene ? '  [' + i.scenes + ']' : ''}${i.mission && i.mission !== 'none' ? '  call: ' + i.mission : ''}  ${i.system || ''}`));
  L.push(`Errors: ${S.errorCount} (${S.errors.length} different)`);
  S.errors.slice(0, 4).forEach(e => L.push(`   x${e.n} ${e.kind || ''} in ${e.scene || '?'} at ${mmss((e.t || 0) / 1000)}: ${clip(e.msg, 84)}`));
  L.push(`Frame dips (under 30 fps for 2 s or more): ${S.dips.length}${S.dips.length ? ', worst ' + Math.round(Math.min(...S.dips.map(x => x.fps))) + ' fps, ' + mmss(S.dips.reduce((a, b) => a + b.secs, 0)) + ' in all, mostly in ' + (top(S.dips.reduce((a, x) => { a[x.scene || '?'] = (a[x.scene || '?'] || 0) + 1; return a; }, {}), 1)[0] || ['?'])[0] : ''}`);
  return L.join('\n');
}

function newestFile(dir) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter(f => f.endsWith('.jsonl')).map(f => ({ f, t: statSync(join(dir, f)).mtimeMs })).sort((a, b) => b.t - a.t);
  return files.length ? join(dir, files[0].f) : null;
}
function main(argv) {
  const has = f => argv.includes(f), val = f => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : undefined);
  const dir = resolve(process.env.LONGHAUL_PLAYLOGS || join(homedir(), 'dev', 'spacegame-playlogs'));
  const arg = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--session');
  const file = arg ? resolve(arg) : newestFile(dir);
  if (!file || !existsSync(file)) { console.error(arg ? 'No such file: ' + arg : 'No play log yet in ' + dir + '. Open the game from node tools/serve.mjs, play, and run this again; or Settings > Reset > Download log and pass the file.'); process.exit(1); }
  const events = parseLog(readFileSync(file, 'utf8'));
  if (!events.length) { console.error(file + ' has no play log lines in it.'); process.exit(1); }
  const sessions = sessionsOf(events);
  const pick = has('--all') ? { id: 'all', events } : (val('--session') ? sessions.find(s => s.id === val('--session')) : sessions[sessions.length - 1]);
  if (!pick) { console.error('No session ' + val('--session') + ' in ' + file + '. Sessions: ' + sessions.map(s => s.id).join(', ')); process.exit(1); }
  const S = summarize(pick.events);
  if (has('--json')) { console.log(JSON.stringify(S, null, 1)); return; }
  console.log(render(S, 'session ' + pick.id + (sessions.length > 1 && !has('--all') ? ` (${sessions.length} in the file: --session ID, --all)` : '') + '  ' + file.replace(homedir(), '~').split('/').pop()));
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main(process.argv.slice(2));
