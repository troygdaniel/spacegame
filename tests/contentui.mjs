// The Title screen's content chip, panel and MODDED tag (card space-game-m2b-content-ui, docs/MODDING.md 5.2; src/contentui.js).
// Each case runs the real game in headless Chrome from a throwaway copy of the folder with its own content.generated.js:
//   the real pack            nothing at all on the Title screen
//   a bad pack (modded)      the chip "CONTENT: 14 PROBLEMS", the MODDED tag, Settings at Content with the first 8 problems and "and N more"
//   modded, no problems      only the MODDED tag
// Screenshots go to tests/out/content-*.png. Run: node tests/contentui.mjs   (one Chrome at a time; about 30 seconds)
import { rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from '../tools/build-content.mjs';
import { chromePool, sleep } from './cdp.mjs';
import { copyGame, ROOT } from './gamecopy.mjs';

let failed = 0, n = 0;
const pool = chromePool(); // every case shares one Chrome (one turn at the test lock), each starting on a clean profile (tests/cdp.mjs goto)
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok  ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const REAL_CORE = /core: "([0-9a-f]+)"/.exec(readFileSync(join(ROOT, 'content.generated.js'), 'utf8'))[1];

// the Title scene's texts that start with a word, and what the content UI says about itself
const ui = t => t.ev(`(() => { const s = game.scene.getScene('Title'), u = s.contentUi, txt = s.children.list.filter(o => o.type === 'Text').map(o => o.text), open = u.isOpen(), pt = [];
  if (open) { const walk = o => { if (o.type === 'Text') pt.push(o.text); if (o.list) o.list.forEach(walk); }; game.scene.getScene('Settings').children.list.forEach(walk); } // the Content section of Settings (src/settings.js)
  return JSON.stringify({ chip: !!u.chip, tag: !!u.tag, open, texts: txt, panelTexts: pt }); })()`).then(JSON.parse);
// a real mouse click on a content-UI zone, found through the canvas (the page scales it to the window)
async function click(t, which) {
  const p = await t.ev(`(() => { const r = game.canvas.getBoundingClientRect(), k = r.width / 1280, z = game.scene.getScene('Title').contentUi.${which}.zone; return { x: r.left + z.x * k, y: r.top + z.y * k }; })()`);
  await t.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 });
  await t.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
  await sleep(300);
}
async function clickAt(t, gx, gy) { // game coordinates
  const p = await t.ev(`(() => { const r = game.canvas.getBoundingClientRect(), k = r.width / 1280; return { x: r.left + ${gx} * k, y: r.top + ${gy} * k }; })()`);
  await t.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 });
  await t.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
  await sleep(300);
}
const keys = { P: [80, 'KeyP', 'p'], ESC: [27, 'Escape', 'Escape'], W: [87, 'KeyW', 'w'] };
async function press(t, k) {
  const [vk, code, key] = keys[k];
  await t.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: vk, code, key });
  await sleep(80);
  await t.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: vk, code, key });
  await sleep(250);
}
const isActive = (t, scene) => t.ev(`game.scene.isActive('${scene}')`);

async function open(name, dir) {
  console.log(name);
  const t = await pool.open('', dir);
  await t.waitFor(`!!(window.game && game.scene.isActive('Title') && game.scene.getScene('Title').contentUi)`, 25000, 'Title with the content UI');
  await sleep(2200); // the fade-in (700 ms) and the 500 ms before any key counts, so the screenshots are crisp
  return t;
}

const tmp = [];
try {
  // 1. the real pack: nothing at all
  {
    const t = await open('the real pack', ROOT);
    try {
      const s = await ui(t);
      check('no chip and no tag', !s.chip && !s.tag && !s.texts.some(x => /CONTENT|MODDED/.test(x)), JSON.stringify(s.texts));
      await press(t, 'P');
      check('P does nothing when there is nothing to show, and does not start the game', (await isActive(t, 'Title')) && !(await ui(t)).open);
      check('no console errors', t.errors.length === 0, t.errors.join(' | '));
    } finally { await t.close(); }
  }

  // 2. a bad pack that also differs from the shipped one: chip, tag, panel
  {
    const dir = copyGame('contentui'); tmp.push(dir);
    const made = build({ dir: join(ROOT, 'tests/fixtures/content-bad'), prefix: 'content/', out: join(dir, 'content.generated.js'), write: true, core: REAL_CORE });
    check('the bad pack is modded against the real core and has problems', made.modded && made.result.errors.length === 12);
    const t = await open('a bad, modded pack', dir);
    try {
      let s = await ui(t);
      check('the chip says how many problems', s.chip && s.texts.includes('CONTENT: 14 PROBLEMS'), JSON.stringify(s.texts.filter(x => /CONTENT/.test(x))));
      check('the MODDED tag is there', s.tag && s.texts.includes('MODDED'));
      check('the panel is closed at first', !s.open);
      await t.shot('content-chip');

      await click(t, 'chip');
      s = await ui(t);
      check('a click on the chip opens Settings at Content and does not start the game', s.open && (await isActive(t, 'Settings')) && !(await isActive(t, 'Station')));
      const rows = s.panelTexts.filter(x => /content\/|does not read/.test(x));
      check('the panel lists the first problems in plain words, one with a file, a line and what the game did', rows.length >= 4 && rows.length <= 8 && rows.some(x => x === 'content/missions/rescue.md, line 7: the description: "{rewrd}" is not a known placeholder here. Did you mean {reward}? Ignored.'), JSON.stringify(rows.slice(0, 3)));
      check('it says how many more there are, and where to see them', s.panelTexts.some(x => /^and \d+ more, see the browser console\.$/.test(x)), JSON.stringify(s.panelTexts.slice(-3)));
      check('it says MODDED and the game started anyway', s.panelTexts.some(x => x.includes('MODDED')) && s.panelTexts.some(x => x.includes('The game started anyway')));
      await t.shot('content-panel');

      await press(t, 'P');
      check('another key does not start the game while Settings is open', (await isActive(t, 'Settings')) && (await ui(t)).open && !(await isActive(t, 'Station')));
      await press(t, 'ESC');
      check('Esc closes it and the title runs again', (await isActive(t, 'Title')) && !(await ui(t)).open);
      await press(t, 'P');
      check('P opens it again', (await ui(t)).open);
      await press(t, 'ESC');
      await click(t, 'tag');
      check('the MODDED tag opens it too', (await ui(t)).open);
      await press(t, 'ESC');
      await clickAt(t, 640, 200);
      await t.waitFor(`game.scene.isActive('Station')`, 5000, 'Station after a click').then(() => check('a click on the empty title starts the game as before', true)).catch(() => check('a click on the empty title starts the game as before', false));
      check('no console errors', t.errors.length === 0, t.errors.join(' | '));
    } finally { await t.close(); }
  }

  // 3. modded with nothing wrong: only the tag
  {
    const dir = copyGame('contentui'); tmp.push(dir);
    const h = (await import('node:module')).createRequire(import.meta.url)('../src/content.js').hashOf('[]');
    writeFileSync(join(dir, 'content.generated.js'), `var CONTENT = { version: 1, hash: "${h}", core: "${REAL_CORE === h ? 'deadbeef' : REAL_CORE}", files: 0,\n  entries: [],\n  errors: []\n};\n`);
    const t = await open('modded, with no problems', dir);
    try {
      let s = await ui(t);
      check('only the MODDED tag shows, no chip', !s.chip && s.tag && s.texts.includes('MODDED') && !s.texts.some(x => /CONTENT:/.test(x)), JSON.stringify(s.texts.filter(x => /CONTENT|MODDED/.test(x))));
      await press(t, 'P');
      s = await ui(t);
      check('P opens a panel that explains it', s.open && s.panelTexts.some(x => x.includes('not running the shipped core pack')) && !s.panelTexts.some(x => x.includes('The game started anyway')), JSON.stringify(s.panelTexts));
      await t.shot('content-modded');
      check('no console errors', t.errors.length === 0, t.errors.join(' | '));
    } finally { await t.close(); }
  }
} finally {
  tmp.forEach(d => rmSync(d, { recursive: true, force: true }));
}

await pool.close();
console.log(failed ? `\nCONTENT UI FAIL: ${failed} of ${n} checks failed` : `\nCONTENT UI PASS: ${n} checks`);
process.exitCode = failed ? 1 : 0;
