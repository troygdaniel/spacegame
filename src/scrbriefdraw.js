// ---------- The briefing in the new look, the drawing half: one page over the ready room (piece b of the new screens; card space-game-screens-b-briefing) ----------
// src/scrbrief.js says what the page shows. Here the MAP stays on the canvas (it is the live map: src/campbriefdraw.js campBriefPaintMap draws it, in the one page's frame, with the route and the objective points as before) and the four
// numbered moments are drawn on it (scrBriefMapExtras); the words, the chips, the moments' tiles, the bonus pills and the pilots' rings are page panels in the ready room's host (src/scrhost.js, src/scrcardsdraw.js scrView). The state is
// the old briefing's (s.bf, with one: true), so campBriefIsOpen, the zoom keys and the H page work as they did: only the three screens and the stepped walk are gone. Nothing here is focusable and no panel takes a key or a click.
//   scrBriefOpen(s)        open it for the mission the room's Launch would fly: true; false when there is none; null when there is no page to draw on (the old briefing opens instead)
//   scrBriefKey(s, code, repeat)  a key while it is open: the zoom keys (+ - 0, M the three views) as ever; Enter or L launch; Esc takes it away; Left and Right walk the moments (scrBriefStep); every other key is the page's (nothing under it moves)
//   scrBriefStep(s, dir)   Right (1) or Left (-1): the next or the earlier moment lit and the map moving to its mark; past the last or before the first, the whole route again (step 0); scrBriefTick(s, time) is the map's move, drawn by the room's update
//   scrBriefMapExtras(s, X, F, own)  the moments' markers on the map: a dark disc, a ring in the moment's colour and its number
//   scrBriefDrop(s)        the panels off the page (campBriefClose calls it)
function scrBriefOpen(s) {
  if (!s || !s.add || campBriefIsOpen(s)) return false;
  const R = typeof scrHostMount === 'function' ? scrHostMount(s) : null; if (!R) return null;
  const t = campHubTarget(s.P, s.hub), Y = campBriefLayers(t.level, t.i); if (!Y) return false;
  const moments = campBriefMoments(t.level, t.i); Y.moments = moments; // on the map's layers too: the view is fitted to show them (campBriefBounds)
  const K = CAMPBRIEF, F = SCRBRIEF.frame, objs = [], put = (o, d) => { o.setScrollFactor(0).setDepth(130 + (d || 0)); objs.push(o); return o; }, v = campBriefView(Y, 0, 1, undefined, undefined, F);
  const bf = s.bf = { open: true, one: true, objs, t, Y, zoom: 0, z: 1, base: v.base, fit: v.fit, frame: F, screen: 0, plan: null, wk: null, map: [], text: [], pics: [], route: campBriefRoute(Y), brief: campHubBrief(s.P, t.level, t.i), moments, story: [], keysFor: [], ready: { lines: [], warnings: [] }, foes: { list: [], line: '' }, steps: { goals: [], bonus: [] }, walk: { steps: [], data: false } };
  put(s.add.rectangle(W / 2, H / 2, W, H, 0x02050c, 0.97).setInteractive(), 0); // a veil that takes the clicks
  bf.g = put(s.add.graphics(), 2); bf.mg = put(s.add.graphics(), 2);
  if (s.input && typeof s.input.on === 'function') { bf.onWheel = (p, over, dx, dy) => { campBriefZoomTo(s, camzoomWheel(bf.z, dy, K.zoom.min, K.zoom.max)); }; s.input.on('wheel', bf.onWheel); }
  bf.el = scrView(R, R.root, scrBriefModel(s.P, bf));
  campBriefPaintMap(s);
  if (typeof sfx === 'function') sfx('uiOpen');
  const line = scrGoalSpoken(t.level, t.i);
  if (typeof shipcompSay === 'function' && line) { try { shipcompSay(line); } catch (e) { /* the voice never stops the screen */ } } // ONE sentence a mission, the goal line; the voice's own settings (muted, off, no voice) decide if it is heard
  return true;
}
function scrBriefSync(s) { // the H page or the tuning panel over the briefing: its panels wait (they are in the same host as the keys page)
  const bf = s && s.bf; if (!bf || bf.one !== true || !bf.el) return false;
  const under = (typeof campKeysIsOpen === 'function' && campKeysIsOpen(s)) || (typeof campTuneIsOpen === 'function' && campTuneIsOpen(s));
  scrHostSet(bf.el, 'display', under ? 'none' : ''); return !under;
}
function scrBriefDrop(s) {
  const bf = s && s.bf; if (!bf || !bf.one) return false;
  if (bf.el && bf.el.parentNode) bf.el.parentNode.removeChild(bf.el);
  bf.el = null; return true;
}
function scrBriefKey(s, code, repeat) {
  const bf = s.bf, K = CAMPBRIEF, zk = typeof campZoomKey === 'function' ? campZoomKey(code) : null;
  if (zk) { campBriefZoomTo(s, zk.reset ? 1 : camzoomKey(bf.z, zk.dir, !!repeat, K.zoom.min, K.zoom.max)); return true; } // + - 0: the map's zoom, as before (a held key repeats)
  if (repeat) return true;
  const L = typeof scrKey === 'function' ? scrKey('left') : null, R = typeof scrKey === 'function' ? scrKey('right') : null, C = typeof scrKey === 'function' ? scrKey('close') : null; // the keys of the page are the key table's roles (src/data_controls.js)
  if (L && L.codes.indexOf(code) >= 0) { scrBriefStep(s, -1); return true; } // Left and Right walk the four moments (card space-game-screens-arrows-walk): each is lit below the map and the map moves to its mark
  if (R && R.codes.indexOf(code) >= 0) { scrBriefStep(s, 1); return true; }
  if ((C && C.codes.indexOf(code) >= 0) || code === 'Escape') { campBriefClose(s); return true; } // Esc is Back: to the list (Left no longer is)
  if (campKeyIs('ready', code) || code === 'Enter' || code === 'NumpadEnter') { campBriefClose(s); if (typeof s.launch === 'function') s.launch(); return true; } // L or Enter launches: the page is the whole briefing, there is no next screen
  if (code === 'KeyM') { campBriefZoomView(s); if (typeof sfx === 'function') sfx('tick'); }
  return true;
}
function scrBriefMapExtras(s, X, F, own) {
  const bf = s.bf, g = bf.mg, T = SCRBRIEF.tones;
  (bf.moments || []).forEach(m => {
    const q = X(m.at.x, m.at.y); if (q.x < F.x + 12 || q.x > F.x + F.w - 12 || q.y < F.y + 12 || q.y > F.y + F.h - 12) return; // (nothing is drawn outside the map's glass)
    const c = T[m.kind] || T.mute; g.fillStyle(0x0e1626, 1).fillCircle(q.x, q.y, 11); g.lineStyle(2, c, 1).strokeCircle(q.x, q.y, 11);
    if (bf.step === m.n) g.lineStyle(2, 0xe6edf7, 0.95).strokeCircle(q.x, q.y, 17); // the moment lit by the walk: a second, white ring
    own(s.add.text(q.x, q.y, String(m.n), uiFont(13, '#e6edf7', { fontStyle: 'bold', fontFamily: typeof CAMPMAPPANEL === 'object' ? CAMPMAPPANEL.face : 'monospace' }))).setOrigin(0.5).setDepth(138);
  });
}

// ---- the walk of the four moments (card space-game-screens-arrows-walk; Troy, 26 Nov 2026: "Left and Right walk through the four numbered moments: each lights its card below the map and the map pans and zooms to its numbered mark, a smooth move, not a jump"; stepping past 4 or before 1 returns to the whole route) ----
// bf.step is 0 (the whole route) or the number of the moment lit; bf.anim is the map's move in hand: from one view (scale and centre) to another over SCRBRIEF.walk.ms, eased, played by scrBriefTick from the room's clock.
function scrBriefWhole(bf) { const v = campBriefView(bf.Y, bf.zoom, 1, undefined, undefined, bf.frame); return { fit: v.fit, z: 1 }; } // the view the whole route has now: the one the pilot chose with M (the route, the area or the system), at its own zoom
function scrBriefTarget(bf, step) { // the view of a step: the whole route (0), or the moment's mark in the middle of the frame at SCRBRIEF.walk.zoom times the view
  const m = step > 0 ? (bf.moments || [])[step - 1] : null, W0 = scrBriefWhole(bf);
  if (!m) return W0;
  const z = Math.min(CAMPBRIEF.zoom.max, SCRBRIEF.walk.zoom * 1);
  return { fit: { s: bf.base.s * z, cx: m.at.x, cy: m.at.y }, z };
}
function scrBriefStep(s, dir) {
  const bf = s && s.bf; if (!bf || bf.one !== true || !bf.open) return false;
  const n = (bf.moments || []).length, was = bf.step | 0; if (!n) return false;
  const to = dir > 0 ? (was >= n ? 0 : was + 1) : (was <= 1 ? 0 : was - 1); // past the last or before the first: the whole route; Left on the whole route stays on it
  if (to === was) return false;
  const T = scrBriefTarget(bf, to);
  bf.step = to; bf.anim = { t0: null, from: { s: bf.fit.s, cx: bf.fit.cx, cy: bf.fit.cy }, zFrom: bf.z, to: T.fit, zTo: T.z };
  scrBriefRepaint(s);
  if (typeof sfx === 'function') sfx('tick');
  return true;
}
function scrBriefRepaint(s) { // the page again, with the moment lit (the tiles are the model's: `on` is the step)
  const bf = s.bf, R = s.scrHost; if (!bf || !R || typeof scrView !== 'function') return false;
  scrBriefDrop(s); bf.el = scrView(R, R.root, scrBriefModel(s.P, bf)); scrBriefSync(s); return true;
}
function scrBriefTick(s, time) { // the map's move, one frame (the room's update calls it with its clock)
  const bf = s && s.bf, a = bf && bf.anim; if (!bf || bf.one !== true || !a) return false;
  if (a.t0 == null) a.t0 = time;
  const p = Math.max(0, Math.min(1, (time - a.t0) / SCRBRIEF.walk.ms)), e = p * p * (3 - 2 * p), lerp = (x, y) => x + (y - x) * e; // (smoothstep: it starts and ends slowly)
  bf.fit = { s: lerp(a.from.s, a.to.s), cx: lerp(a.from.cx, a.to.cx), cy: lerp(a.from.cy, a.to.cy) }; bf.z = lerp(a.zFrom, a.zTo);
  if (p >= 1) bf.anim = null;
  campBriefPaintMap(s); return true;
}
