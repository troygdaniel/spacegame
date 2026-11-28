// smoke: 1.1's miner is on the E row from the first second as number 2 and is never "gone"; a number no ship has taken yet (the Transport's 1 before she is out at 4 s, or 9) answers "I cannot do that, pilot.", and only a ship that was out and is lost says "That ship is gone, pilot." (card space-game-b14-c16-11-miner-gone; BRIEF 14 chunk 16; Troy yes, 27 Nov 2026) (plain Node, no Chrome)
// The cloud's page said that in 1.1, W 1 E 1 Enter at 2 s gives "Wedge, guard our miner." and at 4 s "That ship is gone, pilot.", and read it as the miner vanishing. It does not: the miner is there all mission. The line is the refusal
// of the digit 1: the Transport holds number 1 from the first look (src/camptarget.js campFriRegister: "the transport is 1 although the miner of that mission is in space first", Troy, 26 Nov: the miner is E 2 from the first second)
// but she is not out until 4 s, so number 1 had no ship, and "gone" was not true of a ship that never was. Now a number with no ship yet says what the game says of anything it cannot do, and "gone" is kept for a ship that was out and is lost.
// Run: node tests/campminergone.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  CAMP.bay.startOut = true; // the game starts the pilots out beside the cruiser
  window.__new = () => { window.C = campNew(1, [], { seed: 5, mission: 0 }); C.arrivedAt = 0; window.__P = campPanelNew(); return C; };
  window.__run = sec => { for (let i = 0; i < Math.round(sec * 30); i++) { campStep(C, 1 / 30); C.events.length = 0; } };
  window.__k = code => { const r = campPanelKey(__P, C, code, 0); return { ok: !!r.ok, ran: !!r.ran, say: r.say, open: r.open, fsel: C.fsel }; };
  window.__friends = () => campFriNumbered(C).map(e => e.number + ':' + e.name + (e.alive ? '' : '(dark)') + (e.picked ? '*' : '')).join(' | ');
`);

console.log('A. 1.1 at 2 s: the miner is the one row, number 2');
{
  g.run('__new(); __run(2)');
  check('the list has the Miner as 2 and no Transport yet (she is out at 4 s)', J('__friends()') === '2:Miner', J('__friends()'));
  g.run(`__k('KeyW')`); g.run(`__k('Digit1')`);
  const e = J(`__k('KeyE')`);
  check('E opens the friends pick and holds the miner (the first live ship)', e.open === 'friends' && e.fsel === J(`C.ships.find(u => u.tid === 'dm').id`), JSON.stringify(e));
  const d1 = J(`__k('Digit1')`);
  check('the digit 1 has no ship yet: it does nothing and says "I cannot do that, pilot." (not "gone"), the pick stays open and the miner stays held', !d1.ok && d1.say === 'I cannot do that, pilot.' && !/gone/.test(d1.say) && d1.open === 'friends' && d1.fsel === e.fsel, JSON.stringify(d1));
  const en = J(`__k('Enter')`);
  check('Enter then sends Wedge to guard the miner, in the words that are true: "Wedge, guard our miner."', en.ok && en.say === 'Wedge, guard our miner.', JSON.stringify(en));
  check('and the order is a guard of the miner', J(`C.ships.filter(u => u.team === 'earth' && u.squad === 'red').every(u => u.order && u.order.type === 'guard' && u.order.tg && u.order.tg.id === C.fsel)`));
  g.run('__run(2.1)');
  check('at 4 s and after the Transport is out as number 1, the miner is still number 2, alive and still the one held', J('__friends()') === '1:Transport | 2:Miner*' && J(`C.by[C.fsel].hp`) > 0 && J(`C.by[C.fsel].tid`) === 'dm', J('__friends()'));
  g.run('__run(4)');
  check('and six seconds on he is still there: full hull 24, not gone, the order is still his', J(`C.by[C.fsel].hp`) === 24 && J(`C.ships.find(u => u.team === 'earth' && u.squad === 'red').order.tg.id === C.fsel`));
}

console.log('B. the right digit works at 2 s, and at 4 s the Transport is 1');
{
  g.run('__new(); __run(2)'); g.run(`__k('KeyE')`);
  const d2 = J(`__k('Digit2')`);
  check('E then 2 at 2 s holds the miner and closes the pick', d2.ok && d2.open === '' && d2.fsel === J(`C.ships.find(u => u.tid === 'dm').id`), JSON.stringify(d2));
  g.run('__run(2.5)'); g.run(`__k('KeyE')`);
  const d1 = J(`__k('Digit1')`);
  check('at 4 s the Transport is out: E then 1 holds her', d1.ok && d1.fsel === 'freighter-t1', JSON.stringify(d1));
}

console.log('C. only a ship that was out and is lost says "gone"');
{
  g.run('__new(); __run(5)');
  g.run(`C.by['freighter-t1'].hp = 0; __run(0.2)`);
  check('the Transport is lost: her number 1 goes dark and the miner keeps 2', /^1:Transport\(dark\) \| 2:Miner/.test(J('__friends()')), J('__friends()'));
  g.run(`__k('KeyE')`);
  const d1 = J(`__k('Digit1')`);
  check('E then the dark 1 says "That ship is gone, pilot." (true: she was out)', !d1.ok && d1.say === 'That ship is gone, pilot.', JSON.stringify(d1));
  const d9 = J(`__k('Digit9')`);
  check('E then 9, a number nobody ever had, says "I cannot do that, pilot." and the pick stays open', !d9.ok && d9.say === 'I cannot do that, pilot.' && d9.open === 'friends', JSON.stringify(d9));
  const rows = J(`campPanelRows(C, 'friends').map(r => r.short || r.state || '')`);
  check('the pick\'s rows say it the same way: 1 (lost) "gone", 3 to 9 (never) "not now"', rows[0] === 'gone' && rows.slice(2).every(s => s === 'not now'), JSON.stringify(rows));
  check('campFriJump says the same: dark "gone", never "I cannot do that, pilot."', J(`campFriJump(C, 1).say`) === 'That ship is gone, pilot.' && J(`campFriJump(C, 8).say`) === 'I cannot do that, pilot.');
}

console.log('D. the words are the existing ones');
{
  check('no new line: both are rows that were there (camp.no.nofriend, camp.no.what)', J(`uiText('camp.no.nofriend')`) === 'That ship is gone, pilot.' && J(`uiText('camp.no.what')`) === 'I cannot do that, pilot.');
}

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
