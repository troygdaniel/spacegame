// ---------- Campaign: a pilot's call for orders, on the screen (cards space-game-order-calls and one-list-keys) ----------
// The Phaser half of src/camporders.js, which says WHAT is asked. A small amber plate low in the middle of the window, headed PILOT CALL: the pilot's callsign and what he sees, three rows, and a bar that
// runs down as he waits. It is a small LIST, answered like the Q and P lists: Up and Down move the highlight, Enter gives the answer (no key is reused: the digits answer nothing). The highlight starts on
// the pilot's own cautious pick (the row marked "no answer"), so an Enter pressed by accident does what silence would have done. It cannot be confused with a Q or P list: those are at the screen's edges,
// this is in the middle and amber, and only ONE of them has the arrows and Enter at a time: while a Q or P list is open the call waits, dimmed, and says "close the list to answer".
// The words are camp.call.* (content/text/camporders.md). The answer is said back on the radio line (the scene's chatShow: the callsign, the words, the pilot's voice).
//   campCallPaint(s)      each frame: the plate while a call waits and the battle is on, else gone; the texts change only when the call does
//   campCallHasKeys(s)    a call waits and has the arrows and Enter (the battle is on and no Q or P list is open): the ship coasts meanwhile
//   campCallSel(s)        the highlighted row of the waiting call (0 to 2); it starts on the pilot's own pick
//   campCallKey(s, code)  true when the key was the call's: Up, Down (Left and Right are swallowed), Enter answers (the scene asks before the lists and the missile)
//   campCallHear(s, e)    a sim event { type: 'call', stage }: the open call is said in its pilot's voice, the answer on the radio line
const CAMPCALL_UI = { w: 470, h: 150, lift: 262, depth: 210, pad: 14, row: 24, bar: 5, warn: 2.5, dim: 0.45 };

function campCallPilot(i) { const P = (typeof CHATTER === 'object' && CHATTER.pilots) || [['HAWK', '']]; return P[(i | 0) % P.length]; }

function campCallUi(s) { // made when the first call comes, and kept
  if (s.callUi) return s.callUi;
  const K = CAMPCALL_UI, Wd = typeof W === 'number' ? W : 1280, Ht = typeof H === 'number' ? H : 720, x = Math.round(Wd / 2 - K.w / 2), y = Ht - K.lift;
  const fix = o => o.setScrollFactor(0).setDepth(K.depth);
  const ui = { key: '', back: fix(s.add.rectangle(x, y, K.w, K.h, 0x02060d, 0.88).setOrigin(0, 0)), edge: fix(s.add.graphics()), hi: fix(s.add.rectangle(x + 6, y, K.w - 12, K.row, 0xffd37a, 0.95).setOrigin(0, 0)), bar: fix(s.add.rectangle(x + K.pad, y + K.h - 8, K.w - 2 * K.pad, K.bar, 0xffd37a, 1).setOrigin(0, 0.5)),
    head: fix(s.add.text(x + K.pad, y + 6, uiText('camp.ui.callhead'), uiFont(12, '#ffd37a', { letterSpacing: 2 }))), call: fix(s.add.text(x + K.pad, y + 22, '', uiFont(15, '#ffd37a', { wordWrap: { width: K.w - 2 * K.pad } }))), rows: [], x, y };
  ui.edge.lineStyle(2, 0xffd37a, 0.9); ui.edge.strokeRect(x + 1, y + 1, K.w - 2, K.h - 2);
  for (let i = 0; i < 3; i++) ui.rows.push(fix(s.add.text(x + K.pad + 4, y + 50 + i * K.row + 3, '', uiFont(15, '#9fe9ff'))));
  ui.foot = fix(s.add.text(x + K.w - K.pad, y + 8, '', uiFont(11, '#9fbdd1')).setOrigin(1, 0));
  s.callUi = ui; return ui;
}
function campCallShow(ui, on) { [ui.back, ui.edge, ui.hi, ui.bar, ui.head, ui.call, ui.foot].concat(ui.rows).forEach(o => o && o.setVisible(on)); ui.on = on; }

const campCallListOpen = s => !!(s && s.pn && typeof campPanelOpen === 'function' && campPanelOpen(s.pn));
function campCallHasKeys(s) { return !!(s && s.camp && s.mode === 'play' && !s.mp && typeof campCallOpen === 'function' && campCallOpen(s.camp) && !campCallListOpen(s)); }
// the highlight of the waiting call: kept on the scene, and put on the pilot's own pick when a new call opens
function campCallSel(s) {
  const v = s && s.camp && typeof campCallView === 'function' ? campCallView(s.camp) : null; if (!v) return 0;
  const key = v.id + ':' + v.pilot + ':' + (s.camp.call.n | 0);
  if (!s.callSel || s.callSel.key !== key) s.callSel = { key, at: Math.max(0, v.def - 1) };
  return s.callSel.at;
}

function campCallPaint(s) {
  if (!s || !s.camp || typeof campCallView !== 'function') return;
  const v = s.mode === 'play' && !s.camp.result ? campCallView(s.camp) : null;
  if (!v) { if (s.callUi && s.callUi.on) campCallShow(s.callUi, false); return; }
  if (!s.add || !s.add.rectangle) return; // a stand-in scene draws nothing
  const ui = campCallUi(s), K = CAMPCALL_UI, key = v.id + ':' + v.pilot, at = campCallSel(s), wait = campCallListOpen(s) || !!s.mp;
  if (ui.key !== key) {
    ui.key = key;
    ui.call.setText(campCallPilot(v.pilot)[0] + ': ' + uiText(v.line));
    v.rows.forEach((r, i) => ui.rows[i].setText(uiText(r.label) + (r.def ? '   (' + uiText('camp.call.hud.def') + ')' : '')));
  }
  if (!ui.on) campCallShow(ui, true);
  const state = at + ':' + wait;
  if (ui.state !== state) { // the highlight moved, or a list took the keys: the plate dims and says so
    ui.state = state;
    ui.hi.setPosition(ui.x + 6, ui.y + 50 + at * K.row).setVisible(!wait);
    ui.rows.forEach((t, i) => t.setColor(i === at && !wait ? '#02101c' : '#9fe9ff'));
    ui.foot.setText(uiText(wait ? 'camp.call.hud.wait' : 'camp.call.hud.keys'));
    [ui.back, ui.edge, ui.bar, ui.head, ui.call, ui.foot].concat(ui.rows).forEach(o => o.setAlpha && o.setAlpha(wait ? K.dim : 1));
  }
  const share = v.total > 0 ? Math.max(0, Math.min(1, v.left / v.total)) : 0;
  ui.bar.setSize(Math.max(1, Math.round((K.w - 2 * K.pad) * share)), K.bar).setFillStyle(v.left <= K.warn ? 0xff6a5a : 0xffd37a, 1);
}

function campCallKey(s, code) {
  if (!campCallHasKeys(s)) return false;
  const up = campKeyIs('up', code), down = campKeyIs('down', code);
  if (up || down) { const at = campCallSel(s), n = campCallView(s.camp).rows.length; s.callSel.at = (at + (down ? 1 : -1) + n) % n; return true; }
  if (code === 'ArrowLeft' || code === 'ArrowRight') return true; // the ship coasts while the call has the arrows
  if (campKeyIs('pick', code)) { campCallAnswer(s.camp, campCallSel(s) + 1, 'key'); return true; }
  return false;
}

// the sim's call events: the open call is said in the pilot's voice (no word of it is queued: the plate shows it too); the answer is the radio line
function campCallHear(s, e) {
  if (!s || !e || e.type !== 'call') return;
  const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(), pl = campCallPilot(e.pilot);
  if (typeof chatterHold === 'function' && s.radio) chatterHold(s.radio, now); // the radio is the call's: no wing chatter over it
  const off = typeof chatterMode === 'function' && chatterMode() === 'off';
  if (e.stage === 'open') {
    if (typeof beep === 'function') beep(760, 0.07, 'triangle', 0.05, 150);
    if (!off && typeof chatterPlay === 'function') chatterPlay({ voice: pl[1], text: uiText('camp.call.line.' + e.id) });
  } else if (e.stage === 'answer') {
    const key = e.how === 'late' ? 'camp.call.late' : e.how === 'fail' ? 'camp.call.fail' : 'camp.call.r.' + e.pick;
    const line = { ev: 'call', call: pl[0], voice: pl[1], text: uiText(key) };
    if (!off && typeof s.chatShow === 'function') s.chatShow(line, now); // said in his voice and shown
    else if (s.hud && s.hud.chat && s.hud.chat.setText) { s.hud.chat.setText(line.call + ': ' + line.text); s.chatUntil = now + (typeof CHATTER === 'object' ? CHATTER.show : 4200); } // the radio is Off: shown, not said
  }
}
