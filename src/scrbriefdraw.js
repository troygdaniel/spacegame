// ---------- The briefing in the new look, the drawing half: one page over the ready room (piece b of the new screens; card space-game-screens-b-briefing) ----------
// src/scrbrief.js says what the page shows. Here the MAP stays on the canvas (it is the live map: src/campbriefdraw.js campBriefPaintMap draws it, in the one page's frame, with the route and the objective points as before) and the four
// numbered moments are drawn on it (scrBriefMapExtras); the words, the chips, the moments' tiles, the bonus pills and the pilots' rings are page panels in the ready room's host (src/scrhost.js, src/scrcardsdraw.js scrView). The state is
// the old briefing's (s.bf, with one: true), so campBriefIsOpen, the zoom keys and the H page work as they did: only the three screens and the stepped walk are gone. Nothing here is focusable and no panel takes a key or a click.
//   scrBriefOpen(s)        open it for the mission the room's Launch would fly: true; false when there is none; null when there is no page to draw on (the old briefing opens instead)
//   scrBriefKey(s, code, repeat)  a key while it is open: the zoom keys (+ - 0, M the three views) as ever; Enter or L launch; Esc or Left take it away; every other key is the page's (nothing under it moves)
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
  if (code === 'Escape' || code === 'ArrowLeft') { campBriefClose(s); return true; } // back to the list (the Left Back chip)
  if (campKeyIs('ready', code) || code === 'Enter' || code === 'NumpadEnter') { campBriefClose(s); if (typeof s.launch === 'function') s.launch(); return true; } // L or Enter launches: the page is the whole briefing, there is no next screen
  if (code === 'KeyM') { campBriefZoomView(s); if (typeof sfx === 'function') sfx('tick'); }
  return true;
}
function scrBriefMapExtras(s, X, F, own) {
  const bf = s.bf, g = bf.mg, T = SCRBRIEF.tones;
  (bf.moments || []).forEach(m => {
    const q = X(m.at.x, m.at.y); if (q.x < F.x + 12 || q.x > F.x + F.w - 12 || q.y < F.y + 12 || q.y > F.y + F.h - 12) return; // (nothing is drawn outside the map's glass)
    const c = T[m.kind] || T.mute; g.fillStyle(0x0e1626, 1).fillCircle(q.x, q.y, 11); g.lineStyle(2, c, 1).strokeCircle(q.x, q.y, 11);
    own(s.add.text(q.x, q.y, String(m.n), uiFont(13, '#e6edf7', { fontStyle: 'bold', fontFamily: typeof CAMPMAPPANEL === 'object' ? CAMPMAPPANEL.face : 'monospace' }))).setOrigin(0.5).setDepth(138);
  });
}
