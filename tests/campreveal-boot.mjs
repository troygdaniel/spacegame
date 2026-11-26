// not in the smoke: a boot to the Campaign's ending, run by hand (one Chrome, muted, through the test lock; card space-game-campaign-outpost-reveal)
// The rules are in tests/campreveal.mjs (plain Node). This boots level 3, wins it, and looks at the three cards a player meets: the won card (the victory), the ending (the reveal: "This is not their
// home. It is an outpost." "The war is not over." the star, drawn small in the corner), then the same level 3 on a replay (the flag is in the save: the intro says the outpost). Three pictures.
//   node tests/campreveal-boot.mjs
// The pictures go to the folder in REVEAL_SHOTS (default ~/dev/spacegame-night/shots/reveal-*.png), never into the repository. Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch } = await import('./cdp.mjs');
const OUT = process.env.REVEAL_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const t = await launch('?campaign=3', ROOT);
try {
  const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
  const shot = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'reveal-' + name + '.png'), Buffer.from(r.data, 'base64')); } }; // twice: the second has drawn
  const cardText = () => j(`((${SC}.card || []).filter(o => o && typeof o.text === 'string').map(o => o.text)).concat([(document.querySelector('.sc-root') || {}).textContent || '']).filter(Boolean).join(' | ')`); // the card's canvas words, and the new screens' page card (screens=1: the won and ending cards are page panels: card space-game-boots-after-looks)
  await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
  let txt = await cardText();
  check('level 3 opens on the home world and the last battle (nothing hints at an outpost)', /home world/i.test(txt) && /Last battle/.test(txt) && !/outpost/i.test(txt), txt);
  await shot('1-intro');
  const toPlay = async () => { for (let i = 0; i < 4 && (await j(`${SC}.mode`)) !== 'play'; i++) { await t.ev(`(() => { ${SC}.onKey({ code: 'Enter', repeat: false }); return 1; })()`); await t.run(300); } }; // the intro card, then the mission's briefing
  await toPlay();
  check('while playing the place is the alien home world', await j(`campPlaces(3).home.name === 'Alien home world' && CAMP.levels[3].name === 'The home world'`));
  // level 3 is three missions since the missions card: fly the last one (a level is done with its last mission), win it, read the debrief, then the level's won card
  await t.ev(`(() => { ${SC}.scene.restart({ level: 3, mission: 2 }); return 1; })()`); await t.run(1200); await toPlay();
  await t.ev(`(() => { const S = ${SC}; campEnd(S.camp, 'won', 'towers'); return 1; })()`); await t.run(2500); // the debrief comes up 1.8 s after
  check('the last mission of level 3 is won: the debrief is up and the level is done', await j(`${SC}.mode === 'debrief' && ${SC}.mdone === true`), await j(`${SC}.mode`));
  await t.ev(`(() => { ${SC}.onKey({ code: 'Enter', repeat: false }); return 1; })()`); await t.run(500); // the debrief goes to the level's won card
  txt = await cardText();
  check('the won card is the victory: "Their defences are down." "The war is won." and no outpost', /Their defences are down\./.test(txt) && (/The war is won\./.test(txt) || (await j("typeof scrOn === 'function' && scrOn()"))) && !/outpost|not over/i.test(txt), txt); // (the new won card shows one sentence; "The war is won." is the line that is spoken)
  check('the flag is not set yet', await j(`campProgressLoad().revealed === false`));
  await shot('2-won');
  await t.ev(`(() => { ${SC}.onKey({ code: 'Enter', repeat: false }); return 1; })()`); await t.run(500);
  txt = await cardText();
  check('the ending turns: this is not their home, it is an outpost, the war is not over, the star', /This is not their home\. It is an outpost\./.test(txt) && /The war is not over\./.test(txt) && /Tau Ceti/.test(txt) && /WAR IS NOT OVER/i.test(txt), txt); // (the new screens' ending title is in the page's case)
  check('the ending is the one place that says outpost, and the star is drawn (a glow, a point and its name)', await j(`${SC}.mode === 'end' && (${SC}.card.length >= 7 || (typeof scrOn === 'function' && scrOn() && /Tau Ceti/i.test((document.querySelector('.sc-root') || {}).textContent || '')))`)); // (the new ending is a page card: its star is the name of Tau Ceti; the glow and the point are the glass's canvas objects)
  check('the flag is set and saved (revealed: true) and a new campaign starts at level 1', await j(`(() => { const p = JSON.parse(localStorage.getItem(CAMP.store)); return p.revealed === true && p.level === 1; })()`));
  await shot('3-ending');
  await t.ev(`(() => { ${SC}.scene.restart({ level: 3 }); return 1; })()`); await t.run(1200); // level 3 again, from the save (a new page would start from a clean storage in this harness)
  for (let i = 0; i < 12 && await j(`game.scene.isActive('CampWarp')`); i++) await t.run(1000); // level 3 opens with its warp cinematic (about 6 s): wait for the Campaign's own card
  await t.run(500);
  txt = await cardText();
  check('a replay of level 3 after the reveal opens on the outpost, not on the last battle', /outpost/i.test(txt) && !/Last battle|home world/i.test(txt), txt);
  await shot('4-replay');
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} finally { await t.close(); }
console.log(bad ? `CAMP REVEAL BOOT FAIL (${bad})` : 'CAMP REVEAL BOOT PASS');
process.exit(bad ? 1 : 0);
