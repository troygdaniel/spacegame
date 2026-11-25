// smoke: Settings opens ON TOP of the scene that opened it: settingsOpen pauses it, launches Settings and brings Settings to the top (it is listed before the Campaign), and a paused Campaign's S reaches it (card space-game-pause-settings-under)
// Browser batch on main cf783bcc (8-GEN): "pause, then S: Settings opens (its scene is running) but draws UNDER the paused Campaign, so nothing shows and mute cannot be reached". Phaser draws the scenes in the order of the game's scene list (src/main.js): Settings
// comes before the Campaign there, so a Settings launched from the Campaign was under it. Mute lives in Settings for the Campaign since card space-game-keys6-enter (M is the missile in flight), so the pause card must reach it.
//   A  settingsOpen on a stand-in scene: pause, launch with where it came from, then bring Settings to the top, in that order; a Settings already open is not opened twice
//   B  the Campaign's pause card: S (the table's settings key) calls settingsOpen with the Campaign; the order of the scene list is the reason (Settings before Campaign), so the bring-to-top is needed
// Run: node tests/settingsontop.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');

console.log('A. settingsOpen');
g.run(`
  window.__calls = [];
  window.__mk = (active) => ({ scene: { key: 'Campaign', manager: { isActive: k => !!active }, pause: () => __calls.push('pause'), launch: (k, d) => __calls.push('launch:' + k + ':' + d.from + ':' + d.section), bringToTop: k => __calls.push('top:' + k) } });
  settingsOpen(__mk(false), 'sound');
`);
check('the scene is paused, Settings is launched with the scene to come back to, and then Settings is brought to the top', J('__calls').join() === 'pause,launch:Settings:Campaign:sound,top:Settings', JSON.stringify(J('__calls')));
g.run(`__calls.length = 0; settingsOpen(__mk(true), 'sound');`);
check('with Settings already open nothing happens (no second Settings)', J('__calls.length') === 0);
g.run(`__calls.length = 0; settingsOpen({ scene: { key: 'Title', manager: { isActive: () => false }, pause() { __calls.push('pause'); }, launch(k, d) { __calls.push('launch:' + d.from); } } }, 'keys', 'chat');`);
check('a scene with no bringToTop (a stand-in) still opens it, without a failure', J('__calls').join() === 'pause,launch:Title', JSON.stringify(J('__calls')));

console.log('B. the pause card of the Campaign');
const main = src('src/main.js'), scene = src('src/campaignscene.js');
const order = (main.match(/scene: \[([^\]]*)\]/) || [, ''])[1].split(',').map(s => s.trim());
check('the reason: Settings is listed before Campaign in the game\'s scene list, so a Settings launched from the Campaign is drawn under it unless it is brought to the top', order.indexOf('Settings') >= 0 && order.indexOf('Campaign') > order.indexOf('Settings'), order.join());
check('the Campaign\'s pause card opens Settings on the settings key (S), through settingsOpen with the Campaign', /this\.mode === 'pause'\) \{[^\n]*campKeyIs\('settings', c\) && typeof settingsOpen === 'function'\) settingsOpen\(this/.test(scene) && J(`campKeyCodes('settings').join()`) === 'KeyS');
check('settingsOpen brings Settings to the top (the one place every scene opens it from)', /scene\.scene\.launch\('Settings'[^\n]*\n[^\n]*bringToTop\('Settings'\)/.test(src('src/settings.js')));

console.log(failed ? `\nSETTINGS ON TOP FAIL: ${failed} of ${n} checks failed` : `\nSETTINGS ON TOP PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
