// ---------- Campaign: a pilot's call for orders, on the screen (cards space-game-order-calls and one-list-keys) ----------
// The Phaser half of src/camporders.js, which says WHAT is asked. A small amber plate low in the middle of the window, headed PILOT CALL: the pilot's callsign and what he sees, three rows (five when the call offers the squads: the
// plate grows up from the same bottom edge; a row that cannot be done now is grey with its reason, and Enter on it says why and leaves the call open), and a bar that
// runs down as he waits. It is a small LIST, answered like the Q and P lists: Up and Down move the highlight, Enter gives the answer (no key is reused: the digits answer nothing). The highlight starts on
// the pilot's own cautious pick (the row marked "no answer"), so an Enter pressed by accident does what silence would have done. It cannot be confused with a Q or P list: those are at the screen's edges,
// this is in the middle and amber, and only ONE of them has the arrows and Enter at a time: while a Q or P list is open the call waits, dimmed, and says "close the list to answer".
// The pilot waits CAMP_CALLS.answer seconds, shown by the bar: touch the prompt (Up or Down) and the bar stops where it is, turns pale blue and the key line says "Timer stopped": the call then waits for Enter (the sim's
// campCallHold, card space-game-call-timer-stops; untouched it runs out to the cautious pick). No other key stops it: the prompt's keys are Up, Down and Enter, and only the prompt's own key is the prompt's.
// The words are camp.call.* (content/text/camporders.md). The answer is said back on the radio line (the scene's chatShow: the callsign, the words, the pilot's voice).
//   campCallPaint(s)      each frame: the plate while a call waits and the battle is on, else gone; the texts change only when the call does
//   campCallHasKeys(s)    a call waits and has the arrows and Enter (the battle is on and no Q or P list is open): the ship coasts meanwhile
//   campCallSel(s)        the highlighted row of the waiting call (0 to the last row); it starts on the pilot's own pick
//   campCallKey(s, code)  true when the key was the call's: Up, Down (they stop the timer; Left and Right are swallowed and do not), Enter answers (the scene asks before the lists and the missile)
//   campCallHear(s, e)    a sim event { type: 'call', stage }: the open call is said in its pilot's voice, the answer on the radio line
const CAMPCALL_UI = { w: 470, h: 150, lift: 262, rows: 6, depth: 210, pad: 14, row: 24, bar: 5, warn: 2.5, dim: 0.45 }; // h and lift: the plate of a three-row call (its top is `lift` px above the screen's bottom); a call with more rows grows it up from the same bottom edge, by `row` for each (`rows` is the most it holds)

function campCallPilot(i) { const P = (typeof CHATTER === 'object' && CHATTER.pilots) || [['HAWK', '']]; return P[(i | 0) % P.length]; }

function campCallUi(s) { // made when the first call comes, and kept; campCallLay sizes it for the call's rows
  if (s.callUi) return s.callUi;
  const K = CAMPCALL_UI, Wd = typeof W === 'number' ? W : 1280, x = Math.round(Wd / 2 - K.w / 2), y = 0;
  const fix = o => o.setScrollFactor(0).setDepth(K.depth);
  const ui = { key: '', n: 0, back: fix(s.add.rectangle(x, y, K.w, 150, 0x02060d, 0.88).setOrigin(0, 0)), edge: fix(s.add.graphics()), hi: fix(s.add.rectangle(x + 6, y, K.w - 12, K.row, 0xffd37a, 0.95).setOrigin(0, 0)), bar: fix(s.add.rectangle(x + K.pad, y, K.w - 2 * K.pad, K.bar, 0xffd37a, 1).setOrigin(0, 0.5)),
    head: fix(s.add.text(x + K.pad, y + 6, uiText('camp.ui.callhead'), uiFont(12, '#ffd37a', { letterSpacing: 2 }))), call: fix(s.add.text(x + K.pad, y + 22, '', uiFont(15, '#ffd37a', { wordWrap: { width: K.w - 2 * K.pad } }))), rows: [], x, y };
  ui.fix = fix; campCallRows(s, ui, 3); // three rows to start with; a call with more makes them when it comes
  ui.foot = fix(s.add.text(x + K.w - K.pad, y + 8, '', uiFont(11, '#9fbdd1')).setOrigin(1, 0));
  s.callUi = ui; return ui;
}
function campCallRows(s, ui, n) { const K = CAMPCALL_UI; while (ui.rows.length < Math.min(n, K.rows)) { const i = ui.rows.length; ui.rows.push(ui.fix(s.add.text(ui.x + K.pad + 4, ui.y + 50 + i * K.row + 3, '', uiFont(15, '#9fe9ff')))); } }
// lay the plate out for a call of n rows: it grows up from its bottom edge, so three rows sit where they always did
function campCallLay(ui, n) {
  const K = CAMPCALL_UI, Ht = typeof H === 'number' ? H : 720, h = K.h + (n - 3) * K.row, y = Ht - K.lift + K.h - h, x = ui.x; // (n rows: the same bottom edge as three)
  ui.n = n; ui.y = y;
  ui.back.setPosition(x, y).setSize(K.w, h);
  ui.edge.clear(); ui.edge.lineStyle(2, 0xffd37a, 0.9); ui.edge.strokeRect(x + 1, y + 1, K.w - 2, h - 2);
  ui.head.setPosition(x + K.pad, y + 6); ui.call.setPosition(x + K.pad, y + 22); ui.foot.setPosition(x + K.w - K.pad, y + 8);
  ui.bar.setPosition(x + K.pad, y + h - 8);
  ui.rows.forEach((t, i) => { t.setPosition(x + K.pad + 4, y + 50 + i * K.row + 3); });
}
function campCallShow(ui, on) { [ui.back, ui.edge, ui.hi, ui.bar, ui.head, ui.call, ui.foot].concat(ui.rows).forEach(o => o && o.setVisible(on)); ui.on = on; if (on) ui.rows.forEach((t, i) => t.setVisible(i < ui.n)); }

const campCallListOpen = s => !!(s && s.pn && typeof campPanelOpen === 'function' && campPanelOpen(s.pn));
function campCallHasKeys(s) { return !!(s && s.camp && s.mode === 'play' && !s.mp && typeof campCallOpen === 'function' && campCallOpen(s.camp) && !campCallListOpen(s)); }
// the highlight of the waiting call: kept on the scene, and put on the pilot's own pick when a new call opens
function campCallSel(s) {
  const v = s && s.camp && typeof campCallView === 'function' ? campCallView(s.camp) : null; if (!v) return 0;
  const key = v.id + ':' + v.pilot + ':' + (s.camp.call.n | 0);
  if (!s.callSel || s.callSel.key !== key || s.callSel.camp !== s.camp) s.callSel = { key, camp: s.camp, at: Math.max(0, v.def - 1) }; // of THIS battle: a retry starts the same scene again, and its first call has the same key
  return s.callSel.at;
}

function campCallPaint(s) {
  if (!s || !s.camp || typeof campCallView !== 'function') return;
  const v = s.mode === 'play' && !s.camp.result ? campCallView(s.camp) : null;
  if (!v) { if (s.callUi && s.callUi.on) campCallShow(s.callUi, false); return; }
  if (!s.add || !s.add.rectangle) return; // a stand-in scene draws nothing
  const ui = campCallUi(s), K = CAMPCALL_UI, key = v.id + ':' + v.pilot + ':' + v.rows.map(r => r.off ? 1 : 0).join(''), at = campCallSel(s), wait = campCallListOpen(s) || !!s.mp;
  if (ui.key !== key) {
    ui.key = key;
    ui.call.setText(campCallPilot(v.pilot)[0] + ': ' + uiText(v.line));
    campCallRows(s, ui, v.rows.length); campCallLay(ui, Math.min(K.rows, v.rows.length)); ui.state = '';
    ui.rows.forEach((t, i) => t.setText(''));
    v.rows.slice(0, K.rows).forEach((r, i) => ui.rows[i].setText(uiText(r.label) + (r.def ? '   (' + uiText('camp.call.hud.def') + ')' : '') + (r.off ? '   (' + r.why + ')' : '')));
    if (ui.on) ui.rows.forEach((t, i) => t.setVisible(i < ui.n));
  }
  if (!ui.on) campCallShow(ui, true);
  const note = (s.callSel && s.callSel.note) || '', state = at + ':' + wait + ':' + v.held + ':' + note;
  if (ui.state !== state) { // the highlight moved, a list took the keys, the timer was stopped or a grey row was refused: the plate dims and says so
    ui.state = state;
    ui.hi.setPosition(ui.x + 6, ui.y + 50 + at * K.row).setVisible(!wait);
    ui.rows.forEach((t, i) => t.setColor(i === at && !wait ? '#02101c' : v.rows[i] && v.rows[i].off ? '#6c8294' : '#9fe9ff')); // a grey row is the lists' grey
    ui.foot.setText(note && !wait ? note : uiText(wait ? 'camp.call.hud.wait' : v.held ? 'camp.call.hud.held' : 'camp.call.hud.keys'));
    [ui.back, ui.edge, ui.bar, ui.head, ui.call, ui.foot].concat(ui.rows).forEach(o => o.setAlpha && o.setAlpha(wait ? K.dim : 1));
  }
  const share = v.total > 0 ? Math.max(0, Math.min(1, v.left / v.total)) : 0;
  ui.bar.setSize(Math.max(1, Math.round((K.w - 2 * K.pad) * share)), K.bar).setFillStyle(v.held ? 0x9fe9ff : v.left <= K.warn ? 0xff6a5a : 0xffd37a, 1); // stopped: where it was, pale blue
}

function campCallKey(s, code) {
  if (!campCallHasKeys(s)) return !!(s && s.camp && s.mode === 'play' && !s.mp && !campCallListOpen(s) && campKeyIs('pick', code) && typeof campCallGrace === 'function' && campCallGrace(s.camp)); // the call closed by itself a moment ago: the Enter that was on its way to it is swallowed, not fired as a missile
  const up = campKeyIs('up', code), down = campKeyIs('down', code);
  if (up || down) { campCallHold(s.camp); const at = campCallSel(s), n = campCallView(s.camp).rows.length; s.callSel.at = (at + (down ? 1 : -1) + n) % n; s.callSel.note = ''; return true; }
  if (code === 'ArrowLeft' || code === 'ArrowRight') return true; // the ship coasts while the call has the arrows
  if (campKeyIs('pick', code)) { const r = campCallAnswer(s.camp, campCallSel(s) + 1, 'key'); if (r && r.off) s.callSel.note = r.say; return true; } // a grey row is refused with its reason, in the key line; the call goes on waiting
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
