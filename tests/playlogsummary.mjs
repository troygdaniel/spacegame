// smoke: the play log reader: a session made by the real logger, read back as one screen (plain Node, no Chrome)
// Card space-game-playlog (tools/playlog-summary.mjs). A session of about six minutes is played on the logger of src/playlog.js with a fake clock (scenes, a pause, a death, a call
// accepted and done, deals, idle gaps, errors, a frame dip, keys, the ship computer), the text it kept is read by summarize and render, and the numbers are checked against what
// was played. The logger and the reader agree on the format because one makes what the other reads. Then the command line: the newest file of a folder, a named file, --json,
// --session, and the messages when there is nothing to read.
// Run: node tests/playlogsummary.mjs   (exit code 1 on a failed check)
import { mkdtempSync, writeFileSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { nodeGame } from './nodegame.mjs';
import { parseLog, sessionsOf, summarize, render } from '../tools/playlog-summary.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const g = nodeGame();
g.run(`
  var __t = 1000, __wall = 1763424000000, __map = new Map();
  const __store = { get: k => (__map.has(k) ? __map.get(k) : null), set: (k, v) => { __map.set(k, String(v)); }, remove: k => { __map.delete(k); } };
  const __snap = o => Object.assign({ scene: 'Space', scenes: 'Space', system: 'halcyon', dock: 'halcyon-station', mission: 'none', missionId: null, credits: 100, hull: 100, fuel: 40, ship: 'wren', x: 10, y: 20, speed: 5, auto: '', panel: '' }, o);
  function play(sid, fn) { __t = 1000; __map = new Map(); const L = playlogCreate({ mono: () => __t, wall: () => __wall + (__t - 1000), store: __store, sink: null, sid }); const sec = (s, snap, input) => { for (let i = 0; i < s; i++) { __t += 1000; if (input) L.input(); L.tick(snap); } }; fn(L, sec); return L.text(); }
  var __text = play('aaaa1111', (L, sec) => {
    L.start({ scr: '1458x820', mods: 'none' });
    sec(60, __snap({ scene: 'Station', scenes: 'Station' }), true);
    sec(20, __snap({}), true);
    sec(1, __snap({ mission: 'accepted', missionId: 'rescue' }), true);
    for (let i = 0; i < 300; i++) L.count('key:flight: thrust'); for (let i = 0; i < 90; i++) L.count('key:flight: turn'); L.count('key:station: use the terminal'); L.count('click'); L.count('voice');
    sec(40, __snap({ mission: 'accepted', missionId: 'rescue', auto: 'cruise' }));   // flying itself: an idle gap that is not confusion
    sec(5, __snap({ scene: 'Pause', scenes: 'Pause+Space', mission: 'accepted', missionId: 'rescue' }), true);
    sec(10, __snap({ mission: 'accepted', missionId: 'rescue' }), true);
    L.death('drone', __snap({}));
    sec(5, __snap({ scene: 'Station', scenes: 'Station', mission: 'accepted', missionId: 'rescue' }), true);   // docked: Space to Station
    sec(45, __snap({ scene: 'Station', scenes: 'Station', panel: 'board', mission: 'accepted', missionId: 'rescue' }));  // 45 s with nothing pressed, at the board
    L.input();
    sec(2, __snap({ scene: 'Settings', scenes: 'Settings+Station', mission: 'accepted', missionId: 'rescue' }), true);
    sec(2, __snap({ scene: 'Station', scenes: 'Station', mission: 'none', missionId: 'rescue', credits: 600 }), true);   // paid 500
    L.ev('buy', { what: 'part', n: -200 }); L.ev('buy', { what: 'fuel', n: -40 }); L.ev('sell', { what: 'ore', n: 130 });
    L.ev('computer', { ms: 2000, ok: true }); L.ev('computer', { ms: 3000, ok: false, code: 'limit' }); L.ev('computer', { ms: 2100, ok: false, code: 'empty', why: 'length' });
    L.ev('listen', { step: 'start' }); L.ev('listen', { step: 'ring', done: true }); L.ev('listen', { step: 'open', ms: 400, ok: true }); L.ev('listen', { step: 'stop', held: 2, why: 'silence', short: false, silent: false }); L.ev('listen', { step: 'clip', bytes: 9000 }); L.ev('listen', { step: 'heard', ms: 700, bytes: 9000, chars: 24 }); L.ev('listen', { step: 'end', why: 'sent' });
    L.ev('listen', { step: 'start' }); L.ev('listen', { step: 'ring', done: true }); L.ev('listen', { step: 'open', ms: 600, ok: true }); L.ev('listen', { step: 'stop', held: 1, why: 'lead', short: false, silent: true }); L.ev('listen', { step: 'clip', bytes: 3000 }); L.ev('listen', { step: 'heard', ms: 500, bytes: 3000, chars: 0 }); L.ev('listen', { step: 'end', why: 'silent' });
    L.ev('listen', { step: 'start' }); L.ev('listen', { step: 'ring', done: false, held: 0.2 }); L.ev('listen', { step: 'end', why: 'tap' });
    L.ev('computer_plan', { action: 'plot_route' }); L.ev('npc_chat', { ms: 1500, ok: true });
    L.error('error', 'boom is not a function', 'Error: boom'); L.error('error', 'boom is not a function', 'Error: boom'); L.error('console', 'something else');
    for (let i = 0; i < 160; i++) { __t += 50; L.frame(50); } for (let i = 0; i < 130; i++) { __t += 16; L.frame(16); }
    sec(3, __snap({ scene: 'Station', scenes: 'Station', credits: 560, system: 'kestrel' }), true);
    L.end('pagehide');
  });
`);
const events = parseLog(g.run('__text'));
check('the logger made a session of lines the reader can read', events.length > 40 && sessionsOf(events).length === 1 && sessionsOf(events)[0].id === 'aaaa1111', events.length);
const S = summarize(events), text = render(S, 'session aaaa1111 test.jsonl');
console.log(text.split('\n').map(l => '      | ' + l).join('\n'));
check('played about 3 minutes (the clock moved 203 s) and ended with the tab closing in the Station', S.secs >= 200 && S.secs <= 206 && S.end.why === 'pagehide' && S.endScene === 'Station', S.secs + ' ' + JSON.stringify(S.end));
check('time per scene adds up to the play time, with the Station and the Space on top', Math.abs(Object.values(S.scenes).reduce((a, b) => a + b, 0) - S.secs) <= 2 && S.scenes.Station > 100 && S.scenes.Space > 60 && S.scenes.Pause >= 4 && S.scenes.Settings >= 1, JSON.stringify(S.scenes));
check('one dock (Space to Station), one pause, one Settings visit, one system seen', S.docks === 1 && S.pauses === 1 && S.settings === 1 && S.systems.join() === 'kestrel', JSON.stringify([S.docks, S.pauses, S.settings, S.systems]));
check('one call accepted and done for 500, and the 500 is not also counted as other credits', S.missions.accepted === 1 && S.missions.done === 1 && S.missions.pay === 500 && S.credits.other === -40, JSON.stringify([S.missions, S.credits.other]));
check('deals: two buys (-240) and a sale (+130), net -110', S.deals.buy === 2 && S.deals.buyN === -240 && S.deals.sell === 1 && S.deals.sellN === 130, JSON.stringify(S.deals));
check('a death by a drone', S.deaths.length === 1 && S.deathCauses.drone === 1);
check('keys by action: thrust 300, turn 90, a click, a voice line', S.actions['key:flight: thrust'] === 300 && S.actions['key:flight: turn'] === 90 && S.actions.click === 1 && S.actions.voice === 1, JSON.stringify(S.actions));
const conf = S.idle.filter(i => !i.auto);
check('two idle gaps: 40 s flying itself (not confusion) and 45+ s at the mission board, with that on it', S.idle.length === 2 && S.idle.filter(i => i.auto === 'cruise').length === 1 && conf.length === 1 && conf[0].scene === 'Station' && conf[0].panel === 'board' && conf[0].secs >= 45 && conf[0].mission === 'accepted', JSON.stringify(S.idle));
check('the computer: 3 asks, 2 failed (the limit, and an empty reply with its reason), chose plot_route; the bar chat once', S.computer.n === 3 && S.computer.failed === 2 && S.computer.codes.limit === 1 && S.computer.codes['empty/length'] === 1 && S.computer.tools.plot_route === 1 && S.chat.n === 1, JSON.stringify([S.computer, S.chat]));
check('the voice: 3 presses, 2 rings full and 1 let go early, the microphone, how long it listened, 2 heard of which 1 empty, how each ended', S.listen.starts === 3 && S.listen.rings === 2 && S.listen.ringAborts === 1 && S.listen.opens === 2 && S.listen.heard === 2 && S.listen.heardEmpty === 1 && S.listen.ends.sent === 1 && S.listen.ends.silent === 1 && S.listen.ends.tap === 1, JSON.stringify(S.listen));
check('the screen has a Voice line with the presses, the rings, the microphone time, how long it listened, what was heard and how they ended', /Voice \(U\): 3 presses, ring full 2x, mic 0\.5 s, listened 1\.5 s, heard 1 of 2\.  Ended: (sent|silent|tap) x1, (sent|silent|tap) x1, (sent|silent|tap) x1/.test(text) && /empty\/length x1/.test(text), (text.match(/Voice.*/) || [''])[0]);
check('three errors, two different, the repeated one first with its count', S.errorCount === 3 && S.errors.length === 2 && S.errors[0].n === 2 && /boom/.test(S.errors[0].msg), JSON.stringify(S.errors.map(e => [e.n, e.msg])));
check('one frame dip of about 20 fps', S.dips.length === 1 && S.dips[0].fps >= 19 && S.dips[0].fps <= 21, JSON.stringify(S.dips));
const lines = text.split('\n');
check('the screen is one screen: at most 24 lines, none over 130 characters', lines.length <= 24 && lines.every(l => l.length <= 130), lines.length + ' lines, longest ' + Math.max(...lines.map(l => l.length)));
check('the screen says where the time went, the deals, the calls, the deaths, what was pressed, the idle gaps, the errors and the dips', ['Where the time went', 'Deals: bought 2', 'Calls: accepted 1, done 1 (+500 cr)', 'Deaths 1: drone x1', 'Pressed most:  flight: thrust 300', 'station: use the terminal 1', 'Idle gaps', 'Errors: 3 (2 different)', 'Frame dips', 'Ship computer: 3 asks'].every(k => text.includes(k)), text);
check('the idle gap at the board is listed with where and what, the one while flying itself only counted', text.includes('Station / board') && text.includes('call: accepted') && /1 while the ship flew itself/.test(text));
check('no word anyone typed or said can be in it: the logger had none', !/secret|question/i.test(text));

// a session with no end line, and an empty one
const noEnd = summarize(events.filter(e => !(e.ev === 'session' && e.phase === 'end')));
check('a log with no end line says so', /NO END LINE/.test(render(noEnd)));
check('an empty session does not throw and still prints a screen', render(summarize([])).split('\n').length > 5);

// ---- the command line ----
const tmp = mkdtempSync(join(tmpdir(), 'lh-summary-'));
try {
  const raw = g.run('__text'), other = raw.replace(/aaaa1111/g, 'bbbb2222');
  writeFileSync(join(tmp, 'old.jsonl'), raw); utimesSync(join(tmp, 'old.jsonl'), new Date(2026, 0, 1), new Date(2026, 0, 1));
  writeFileSync(join(tmp, 'new.jsonl'), raw + other); // two sessions in one file
  const run = args => spawnSync(process.execPath, [join(ROOT, 'tools', 'playlog-summary.mjs'), ...args], { encoding: 'utf8', env: Object.assign({}, process.env, { LONGHAUL_PLAYLOGS: tmp }) });
  let r = run([]);
  check('with no argument it reads the newest file of the folder, its last session, and says there are two', r.status === 0 && r.stdout.includes('session bbbb2222') && r.stdout.includes('2 in the file') && r.stdout.includes('new.jsonl'), r.stdout.split('\n')[0] + ' / ' + r.stderr);
  r = run([join(tmp, 'new.jsonl'), '--session', 'aaaa1111']);
  check('--session picks the other one', r.status === 0 && r.stdout.includes('session aaaa1111'));
  r = run([join(tmp, 'new.jsonl'), '--all', '--json']);
  check('--all --json is the numbers of both sessions together', r.status === 0 && JSON.parse(r.stdout).deaths.length === 2);
  r = run([join(tmp, 'nothing.jsonl')]);
  check('a file that is not there is exit 1 with a plain message', r.status === 1 && /No such file/.test(r.stderr));
  r = run([join(tmp, 'new.jsonl'), '--session', 'zzzz']);
  check('a session that is not in the file says which are', r.status === 1 && /aaaa1111, bbbb2222/.test(r.stderr), r.stderr);
  writeFileSync(join(tmp, 'junk.jsonl'), 'not json\n{"a":1}\n');
  r = run([join(tmp, 'junk.jsonl')]);
  check('a file with no play log lines in it is exit 1', r.status === 1 && /no play log lines/.test(r.stderr));
  const empty = mkdtempSync(join(tmpdir(), 'lh-empty-')); const r2 = spawnSync(process.execPath, [join(ROOT, 'tools', 'playlog-summary.mjs')], { encoding: 'utf8', env: Object.assign({}, process.env, { LONGHAUL_PLAYLOGS: join(empty, 'none') }) });
  check('with no log yet it says how to make one', r2.status === 1 && /No play log yet/.test(r2.stderr) && /serve\.mjs/.test(r2.stderr)); rmSync(empty, { recursive: true, force: true });
} finally { rmSync(tmp, { recursive: true, force: true }); }
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `PLAYLOG SUMMARY FAIL (${failed} of ${n})` : `PLAYLOG SUMMARY PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
