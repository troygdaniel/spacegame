// The Drift bar's six characters (src/shop.js NPCS, sprites in src/interior.js): the data rules of docs/NPC-CHAT.md 3.1 and docs/MODDING.md 5.3,
// IDA appearing only after the first rescue is paid, and a real talk with each new character. One headless Chrome, closed at the end.
// Run: node tests/npcs.mjs   (exit code 1 on any failure)
import { launch, sleep } from './cdp.mjs';

const ST = "game.scene.getScene('Station')";
const t = await launch('#station');
let fails = 0;
const check = (name, ok, info = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (info ? '  (' + info + ')' : '')); if (!ok) fails++; };
const J = async expr => JSON.parse(await t.ev(`JSON.stringify(${expr})`));

try {
  await t.waitFor("!!(window.game && game.scene.isActive('Station'))", 20000, 'station active');
  await sleep(800);

  console.log('A. the table');
  const rows = await J(`NPCS.map(n => ({ id: n.id, name: n.name, role: n.role, voice: n.voice, persona: n.persona, lines: n.lines, tex: 'in-' + (n.sprite || n.name.toLowerCase()), hasWhen: typeof n.when === 'function' }))`);
  check('six characters', rows.length === 6, rows.map(r => r.id).join(','));
  check('ids are the six of the design', ['juno', 'tamsin', 'dex', 'moss', 'sable', 'ida'].every((id, i) => rows[i] && rows[i].id === id));
  check('names are unique', new Set(rows.map(r => r.name)).size === 6);
  const PARTS = ['Who:', 'Manner:', 'Knows:', 'Wants:', 'Will not:'];
  for (const r of rows) {
    const p = r.persona || '', parts = p.split('\n');
    check(r.id + ': name, role and voice fit the schema', r.name.length <= 24 && r.role.length <= 40 && /^aura-[a-z]+-en$/.test(r.voice), `${r.name.length}/${r.role.length}/${r.voice}`);
    check(r.id + ': persona has the five labelled parts in order', parts.length === 5 && parts.every((x, i) => x.startsWith(PARTS[i])), parts.map(x => x.split(':')[0]).join('|'));
    check(r.id + ': persona is at most 600 characters, plain text', p.length > 200 && p.length <= 600 && !/[\u0000-\u0009\u000b-\u001f​-‏‪-‮<>]/.test(p), String(p.length));
    const sentences = l => (l.match(/[.!?](?=\s|$)/g) || []).length;
    check(r.id + ': three lines, each at most two sentences and 240 characters', r.lines.length >= 3 && r.lines.every(l => l.length <= 240 && sentences(l) <= 2), r.lines.map(l => l.length + '/' + sentences(l)).join(' '));
    check(r.id + ': both stride sprites exist', await t.ev(`game.textures.exists('${r.tex}0') && game.textures.exists('${r.tex}1')`), r.tex);
  }
  check('voices are all different', new Set(rows.map(r => r.voice)).size === 6);
  check('only IDA has a condition', rows.filter(r => r.hasWhen).map(r => r.id).join() === 'ida');

  console.log('B. reactions answer to the player\'s situation');
  const reacts = await J(`(() => {
    const out = {}, keep = JSON.stringify({ m: G.mission, id: G.missionId, hull: G.hull, cr: G.credits, up: G.upgrades, pd: G.patrolsDone, dr: G.stats.drones });
    const states = [
      { mission: 'none', missionId: null, hull: 100, credits: 0, upgrades: { armor: 0, rapid: 0, booster: 0 }, patrolsDone: 0, drones: 0 },
      { mission: 'accepted', missionId: 'rescue', hull: 100, credits: 100, upgrades: { armor: 0, rapid: 0, booster: 0 }, patrolsDone: 0, drones: 0 },
      { mission: 'accepted', missionId: 'patrol', hull: 30, credits: 900, upgrades: { armor: 2, rapid: 1, booster: 0 }, patrolsDone: 0, drones: 12 },
      { mission: 'none', missionId: null, hull: 100, credits: 900, upgrades: { armor: 0, rapid: 0, booster: 1 }, patrolsDone: 1, drones: 3 },
      { mission: 'accepted', missionId: 'bounty', hull: 100, credits: 50, upgrades: { armor: 1, rapid: 2, booster: 2 }, patrolsDone: 1, drones: 30 },
      { mission: 'failed', missionId: 'rescue', hull: 100, credits: 50, upgrades: { armor: 0, rapid: 0, booster: 0 }, patrolsDone: 0, drones: 0 }
    ];
    NPCS.forEach(n => { out[n.id] = []; });
    states.forEach(st => {
      G.mission = st.mission; G.missionId = st.missionId; G.hull = st.hull; G.maxHull = 100; G.credits = st.credits; Object.assign(G.upgrades, st.upgrades); G.patrolsDone = st.patrolsDone; G.stats.drones = st.drones;
      NPCS.forEach(n => out[n.id].push(n.react ? n.react() : null));
    });
    const k = JSON.parse(keep); G.mission = k.m; G.missionId = k.id; G.hull = k.hull; G.credits = k.cr; Object.assign(G.upgrades, k.up); G.patrolsDone = k.pd; G.stats.drones = k.dr;
    return out; })()`);
  for (const [id, list] of Object.entries(reacts)) {
    const said = list.filter(Boolean);
    check(id + ': every reaction is null or a clean line of at most 240 characters', list.every(x => x === null || (typeof x === 'string' && x.length > 20 && x.length <= 240 && !/[<>]/.test(x))), said.length + ' of ' + list.length + ' states');
  }
  ['moss', 'sable', 'ida'].forEach(id => check(id + ': reacts to at least three of the six situations', reacts[id].filter(Boolean).length >= 3, String(reacts[id].filter(Boolean).length)));

  console.log('C. IDA is in the bar only after the first rescue is paid');
  await t.ev("(() => { G.stats.missions = 0; G.mission = 'none'; G.missionId = null; return 1; })()"); await sleep(400);
  const IDX = 5;
  const state = () => J(`({ vis: ${ST}.npcSprites[${IDX}].visible, body: ${ST}.npcSprites[${IDX}].body.enable, label: ${ST}.npcLabels[${IDX}].visible, spot: ${ST}.spots.includes(${ST}.npcSpots[${IDX}]) })`);
  let s0 = await state();
  check('no rescue paid: IDA is not in the bar (no sprite, no body, no label, no prompt spot)', !s0.vis && !s0.body && !s0.label && !s0.spot, JSON.stringify(s0));
  await t.ev(`${ST}.player.setPosition(272, 500)`); await sleep(300);
  check('standing where she would be offers no talk', !(await t.ev(`${ST}.prompt.text`)).includes('IDA'));
  await t.ev("(() => { G.stats.missions = 1; return 1; })()"); await sleep(500);
  s0 = await state();
  check('first rescue paid: she is there at once', s0.vis && s0.body && s0.label && s0.spot, JSON.stringify(s0));
  await t.shot('npcs-ida-here');

  console.log('D. a talk with each new character');
  for (const [i, who, title] of [[3, 'MOSS', 'MOSS  -  repair bay mechanic, off shift'], [4, 'SABLE', 'SABLE  -  retired bounty hunter'], [5, 'IDA', 'IDA KETTER  -  rescued colonist']]) {
    const n = await J(`({ x: NPCS[${i}].x, y: NPCS[${i}].y })`);
    await t.ev(`(() => { const s = ${ST}; if (s.talk) hideTalk(s); s.player.setPosition(${n.x} + (${i} === 4 ? -34 : 0), ${n.y} + (${i} === 4 ? 0 : -34)); return 1; })()`); await sleep(350);
    check(who + ': the prompt offers to talk', (await t.ev(`${ST}.prompt.text`)).includes('Talk to ' + (who === 'IDA' ? 'IDA KETTER' : who)), await t.ev(`${ST}.prompt.text`));
    await t.press('E'); await sleep(500);
    check(who + ': the dialogue box opens with the right title', (await t.ev(`${ST}.talkName.text`)) === title, await t.ev(`${ST}.talkName.text`));
    // the typewriter is a timer on the Station's own clock, and on a busy Mac that scene runs at a fraction of real speed: step the clock by hand instead of waiting for real seconds
    await t.ev(`(() => { const s = ${ST}; for (let k = 0; k < 40; k++) s.time.update(s.time.now, 60); return 1; })()`);
    const said = await t.ev(`${ST}.talkText.text`);
    check(who + ': a line is spoken in quotes', said.length > 20 && said.startsWith('"'), said.slice(0, 50));
    if (who === 'SABLE') await t.shot('npcs-sable-talk');
  }
  await t.ev(`(() => { const s = ${ST}; hideTalk(s); s.player.setPosition(960, 400); return 1; })()`); await sleep(500);
  await t.shot('npcs-bar');
  check('no JS errors', t.errors.length === 0, t.errors.join(' | '));
} catch (e) {
  console.log('  FAIL ' + e.message); fails++;
} finally {
  await t.close();
}
console.log(fails ? `NPCS FAIL (${fails})` : 'NPCS PASS');
process.exit(fails ? 1 : 0);
