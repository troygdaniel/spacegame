// ---------- Campaign: a pilot's call for orders, on the screen (card space-game-order-calls) ----------
// The Phaser half of src/camporders.js, which says WHAT is asked. A small plate low in the middle of the window (since card space-game-two-hands-keys the FLEET panel shows the call in place of its rows, and this plate is not drawn while that panel is there): the
// pilot's callsign and what he sees, three rows 1 2 3, the cautious one marked, and a bar that runs down as he waits. The words are camp.call.* (content/text/camporders.md). The answer is said back
// on the radio line (the scene's chatShow: the callsign, the words, the pilot's voice). Keys: 1 2 3 (and the keypad's) answer while a call waits (they are asked before the panels' keys).
//   campCallPaint(s)      each frame: the plate while a call waits and the battle is on, else gone; the texts change only when the call does
//   campCallKey(s, code)  true when the key answered the call (the scene asks before the panels do)
//   campCallHear(s, e)    a sim event { type: 'call', stage }: the open call is said in its pilot's voice, the answer on the radio line
const CAMPCALL_UI = { w: 470, h: 124, lift: 252, depth: 210, pad: 14, row: 22, bar: 5, warn: 2.5 };

function campCallPilot(i) { const P = (typeof CHATTER === 'object' && CHATTER.pilots) || [['HAWK', '']]; return P[(i | 0) % P.length]; }

function campCallUi(s) { // made when the first call comes, and kept
  if (s.callUi) return s.callUi;
  const K = CAMPCALL_UI, Wd = typeof W === 'number' ? W : 1280, Ht = typeof H === 'number' ? H : 720, x = Math.round(Wd / 2 - K.w / 2), y = Ht - K.lift;
  const fix = o => o.setScrollFactor(0).setDepth(K.depth);
  const ui = { key: '', back: fix(s.add.rectangle(x, y, K.w, K.h, 0x02060d, 0.82).setOrigin(0, 0)), edge: fix(s.add.graphics()), bar: fix(s.add.rectangle(x + K.pad, y + K.h - K.pad, K.w - 2 * K.pad, K.bar, 0xffd37a, 1).setOrigin(0, 0.5)),
    call: fix(s.add.text(x + K.pad, y + 10, '', uiFont(15, '#ffd37a', { wordWrap: { width: K.w - 2 * K.pad } }))), rows: [], x, y };
  ui.edge.lineStyle(1, 0xffd37a, 0.7); ui.edge.strokeRect(x + 0.5, y + 0.5, K.w - 1, K.h - 1);
  for (let i = 0; i < 3; i++) ui.rows.push(fix(s.add.text(x + K.pad, y + 40 + i * K.row, '', uiFont(15, '#9fe9ff'))));
  ui.foot = fix(s.add.text(x + K.w - K.pad, y + K.h - K.pad - 8, uiText('camp.call.hud.keys'), uiFont(11, '#7f9fb4')).setOrigin(1, 1));
  s.callUi = ui; return ui;
}
function campCallShow(ui, on) { [ui.back, ui.edge, ui.bar, ui.call, ui.foot].concat(ui.rows).forEach(o => o && o.setVisible(on)); ui.on = on; }

function campCallPaint(s) {
  if (!s || !s.camp || typeof campCallView !== 'function') return;
  if (s.pnl && s.pnl.p && s.pnl.p.fleet) { if (s.callUi && s.callUi.on) campCallShow(s.callUi, false); return; } // the FLEET panel shows the call in place of its rows (src/campanelsdraw.js; card space-game-two-hands-keys): this plate is the stand-in scene's
  const v = s.mode === 'play' && !s.camp.result ? campCallView(s.camp) : null;
  if (!v) { if (s.callUi && s.callUi.on) campCallShow(s.callUi, false); return; }
  if (!s.add || !s.add.rectangle) return; // a stand-in scene draws nothing
  const ui = campCallUi(s), K = CAMPCALL_UI, key = v.id + ':' + v.pilot;
  if (ui.key !== key) {
    ui.key = key;
    ui.call.setText(campCallPilot(v.pilot)[0] + ': ' + uiText(v.line));
    v.rows.forEach((r, i) => ui.rows[i].setText(r.n + '  ' + uiText(r.label) + (r.def ? '   (' + uiText('camp.call.hud.def') + ')' : '')));
  }
  if (!ui.on) campCallShow(ui, true);
  const share = v.total > 0 ? Math.max(0, Math.min(1, v.left / v.total)) : 0;
  ui.bar.setSize(Math.max(1, Math.round((K.w - 2 * K.pad) * share)), K.bar).setFillStyle(v.left <= K.warn ? 0xff6a5a : 0xffd37a, 1);
}

function campCallKey(s, code) {
  const n = typeof campCallKeyNum === 'function' ? campCallKeyNum(code) : 0;
  if (!n || !s || !s.camp || s.mode !== 'play' || typeof campCallOpen !== 'function' || !campCallOpen(s.camp)) return false;
  campCallAnswer(s.camp, n, 'key');
  return true;
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
