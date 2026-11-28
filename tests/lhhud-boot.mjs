// not in the smoke: the new Long Haul's one-style HUD in the real game (one Chrome, muted, through the test lock; card space-game-lh-hud-one-style, Troy 28 Nov 2026: yes, the layout picture)
// Opens index.html?longhaul=new#space (the dev shortcut into the flight) and checks what only a browser shows:
//   A  the supplies panel (Cr, Fuel, Ore, the six parts), the mission panel (with the T cap) and the tip are page panels, on the screen, in the Campaign's look; their numbers are the game's
//   B  the old canvas pieces are gone: the strip's texts are not drawn, the tip's canvas text is hidden while the page shows the same words
//   C  the state moves them: credits gained (+250 floats), the hold full (red), the tank low, the checklist shut by T and opened by a click
//   D  the radar stands under the supplies panel and the hostiles panel under the radar; a toast starts under the mission panel
//   E  the same page WITHOUT the switch has none of it: the canvas strip and tip as they were
//   F  the game logged no error
// Run: node tests/lhhud-boot.mjs
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch } = await import('./cdp.mjs');
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const VK = { KeyT: 84 };
const S = `game.scene.getScene('Space')`;
const boot = async addr => {
  const t = await launch(addr, ROOT);
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
  await t.waitFor(`!!(window.game && game.scene.isActive('Space') && ${S}.ship && ${S}.ship.body)`, 30000, 'the flight');
  await t.clock(); await t.run(2200);
  return { t, j };
};
const rect = q => `(() => { const e = document.querySelector(${JSON.stringify(q)}); if (!e || !e.getClientRects().length) return null; const b = e.getBoundingClientRect(), c = game.canvas.getBoundingClientRect(); return { l: Math.round(b.left - c.left), t: Math.round(b.top - c.top), r: Math.round(b.right - c.left), b: Math.round(b.bottom - c.top), w: Math.round(b.width), h: Math.round(b.height), cw: Math.round(c.width), ch: Math.round(c.height), text: e.innerText.replace(/\\s+/g, ' ') }; })()`;
let errors = [];
{ // ---- with the switch
  const { t, j } = await boot('?longhaul=new#space');
  try {
    console.log('A  the panels');
    const res = await j(rect('.ph-lhres')), mis = await j(rect('.ph-lhmis')), tip = await j(rect('.ph-lhtips'));
    check('the supplies panel is top right on the screen, the mission panel top centre, the tip above the key row', !!res && !!mis && !!tip && res.l > res.cw * 0.6 && res.t < res.ch * 0.2 && Math.abs((mis.l + mis.r) / 2 - mis.cw / 2) < 4 && mis.t < mis.ch * 0.2 && tip.b < res.ch * 2 && tip.t > tip.ch * 0.7, JSON.stringify([res, mis, tip]));
    const cr = await j(`G.credits`);
    check('the supplies say Cr with the credits, Fuel, Ore and the six parts SHD WPN ENG TNK CRG AIM', !!res && /CR/i.test(res.text) && res.text.includes(String(cr)) && /FUEL/i.test(res.text) && /ORE/i.test(res.text) && ['SHD', 'WPN', 'ENG', 'TNK', 'CRG', 'AIM'].every(k => res.text.includes(k)), res && res.text);
    check('the mission panel has the T cap and the mission\'s words, the tip its H cap and its words', !!mis && /\bT\b/.test(mis.text) && (mis.text.length > 6) && !!tip && /\bH\b/.test(tip.text) && /HIDE TIPS/i.test(tip.text) && tip.text.length > 20, JSON.stringify([mis && mis.text, tip && tip.text]));
    const fuel = await j(`({ frac: fuelFrac(), bar: document.querySelector('.ph-lhres .ph-fuel').style.width })`);
    check('the fuel meter is the tank\'s share', Math.abs(parseFloat(fuel.bar) / 100 - fuel.frac) < 0.01, JSON.stringify(fuel));

    console.log('B  the old pieces are gone');
    const old = await j(`(() => { const h = ${S}._hud, v = k => !!(h.t[k] && h.t[k].visible); return { cr: v('crl') || v('crv'), parts: v('up0'), ore: v('orl'), fuel: v('fuell'), track: v('tl') || v('th') || v('tc'), tipc: !!${S}._gh.visible, tipk: !!${S}._gk.visible, tipText: ${S}._gtext }; })()`);
    check('no CR, parts, ORE, FUEL or mission text is drawn on the canvas, and the tip\'s canvas text is hidden while the page shows it', !old.cr && !old.parts && !old.ore && !old.fuel && !old.track && old.tipc === false && old.tipk === false && !!tip && tip.text.indexOf(String(old.tipText).slice(0, 12)) >= 0, JSON.stringify(old));

    console.log('C  the state moves them');
    await t.ev(`(() => { G.credits += 250; G.ore = holdCap(); activeShip().fuel = fuelTank() * 0.07; return 1; })()`); await t.run(500);
    const st = await j(`(() => { const r = document.querySelector('.ph-lhres'); return { delta: (r.querySelector('.ph-lhd') || { innerText: '' }).innerText, fig: (r.querySelector('.ph-lhcr b') || { innerText: '' }).innerText, oreFull: !!r.querySelector('.ph-ore.full'), fuelCrit: !!r.querySelector('.ph-fuel.crit') }; })()`);
    check('a gain of 250 floats +250 beside the figure, the full hold and the low tank are red', st.delta === '+250' && /\d/.test(st.fig) && st.oreFull === true && st.fuelCrit === true, JSON.stringify(st));
    const openBefore = await j(`!!document.querySelector('.ph-lhmis .ph-lhstp')`);
    await t.ev(`(() => { HUDUI.mode = 'open'; return 1; })()`); await t.run(400);
    const open1 = await j(`!!document.querySelector('.ph-lhmis .ph-lhstp') || !!document.querySelector('.ph-lhmis .ph-lhhead')`);
    await t.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: VK.KeyT, nativeVirtualKeyCode: VK.KeyT, code: 'KeyT', key: 't' }); await t.run(80); await t.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: VK.KeyT, nativeVirtualKeyCode: VK.KeyT, code: 'KeyT', key: 't' }); await t.run(500);
    const shut = await j(`({ mode: HUDUI.mode, rows: !!document.querySelector('.ph-lhmis .ph-lhhead') })`);
    check('open it shows the checklist rows; T shuts it to the slim line', open1 === true && shut.mode === 'closed' && shut.rows === false, JSON.stringify([openBefore, open1, shut]));
    await t.ev(`(() => { document.querySelector('.ph-lhmis').click(); return 1; })()`); await t.run(500);
    check('a click on the panel opens it again, as the canvas box did', (await j(`HUDUI.mode`)) === 'open' && (await j(`!!document.querySelector('.ph-lhmis .ph-lhhead')`)) === true);

    console.log('D  the radar and the toasts');
    await t.run(300);
    const lay = await j(`(() => { const h = ${S}._hud, r = document.querySelector('.ph-lhres').getBoundingClientRect(), c = game.canvas.getBoundingClientRect(), k = c.height / H; return { resBottom: (r.bottom - c.top) / k, radarCy: h.radarCy, tt: ${S}.toastTop && ${S}.toastTop(), misBottom: (document.querySelector('.ph-lhmis').getBoundingClientRect().bottom - c.top) / k }; })()`);
    check('the radar\'s centre is lower than the supplies panel\'s foot by its radius, and a toast starts under the open mission panel', lay.radarCy > lay.resBottom + 84 && lay.tt >= lay.misBottom, JSON.stringify(lay));
    errors = errors.concat(t.errors);
  } finally { await t.close(); }
}
{ // ---- without the switch
  const { t, j } = await boot('#space');
  try {
    console.log('E  without the switch');
    const f = await j(`({ on: lhNewOn(), panels: !!document.querySelector('.ph-lhres, .ph-lhmis, .ph-lhtips'), strip: !!(${S}._hud.t.crl && ${S}._hud.t.crl.visible), orl: !!(${S}._hud.t.orl && ${S}._hud.t.orl.visible), tip: ${S}._gh.visible, radarCy: ${S}._hud.radarCy || 0, toastTop: typeof ${S}.toastTop })`);
    check('no switch: no page panel, the canvas strip and ORE are drawn, the radar where it was, the scene has no toastTop', f.on === false && f.panels === false && f.strip === true && f.orl === true && f.radarCy === 0 && f.toastTop === 'undefined', JSON.stringify(f));
    errors = errors.concat(t.errors);
  } finally { await t.close(); }
}
console.log('F  errors');
check('the game logged no error', errors.length === 0, errors.slice(0, 4).join(' | '));
console.log(bad ? `\nLHHUD BOOT FAIL: ${bad} checks failed` : '\nLHHUD BOOT PASS');
process.exit(bad ? 1 : 0);
