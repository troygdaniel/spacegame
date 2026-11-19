// ---------- The command strip (card space-game-command-strip; Troy, 18 Nov 2026: "not sure about the screen set aside for the ship computer chat") ----------
// There is no chat screen. I opens one line at the bottom of the flight view (or of the station), you type, Enter sends it, and the answer shows under it. U speaks the same
// line (src/listen.js hands its words to shipcompSubmit, which comes here). The game does NOT pause: the ship keeps flying, and while the line has focus the flight keys do
// not reach the game (the input swallows its own key events), so typing never turns the ship. Esc, a click on the game, or Enter puts the stick back in your hand.
// QUIET (Troy picked it from the first-look pictures, 18 Nov): after the answer the line is not kept; the strip shows the answer for a few seconds and fades away, and the
// two exchanges before it fade with it. Nothing lingers over the flight view. The next I brings the last two back, dim, above a new line.
// What it shows, top to bottom: the last two exchanges (dim), the command line (key cap, the line, the hint), the answer (three lines at most). The voice states come from
// listenView (src/listen.js), so the floating LISTENING box is gone: LISTENING with the level, HEARING YOU, the words with their pause, a plain line for a refusal.
// An act ("take me to Kepler-4b") is one plain line first, then, 0.7 s later, the game runs its own function (src/shipcomputer.js SC_ACT); Esc in that moment cancels it.
//
// THE INTERFACE (src/shipcomputer.js shipcompOpen and shipcompSubmit are the doors the other files use; these are what they call):
//   cmdstripOpen(game)        the line opens and has the keyboard; false when it cannot (no key, a panel or the nav list is up, not in space or a station)
//   cmdstripSubmit(text, game) a question as if typed (the microphone): the strip shows it and asks; false when it cannot
//   cmdstripVoice(view)       listenView's answer for the strip to draw; true when the strip drew it (so the old box stays shut)
//   cmdstripUp()              true while the strip is on the screen (the first-run tip steps aside, the edge arrows keep clear)
//   cmdstripZone()            { x0, y0, x1, y1 } in game pixels while it is up, else null (src/hud.js)
//   cmdstripView(S, now, voice)   PURE: what to show now, from the state: { mode, alpha, older, cmd, reply, ... } or null
//   cmdstripHold(text)        PURE: how long an answer stays, in ms
// The state is CMDSTRIP.s. Plain DOM over the canvas (like the LISTENING mark and the U cap): the same in Space and in the Station, never inside Phaser's keyboard.
const CMDSTRIP = {
  x: 368, w: 624, bottom: 64,            // game pixels (1280 by 720): the strip's left edge and width (clear of the navigation panel), the gap under it (above the key line)
  hold: { base: 4500, per: 35, max: 12000 }, // how long an answer stays: a base and a little per letter, never more than max (ms)
  fade: 1200, act: 700, older: 2, keep: 6, // the fade (ms), the pause between an act's line and the act (ms), the exchanges shown above and kept
  say: { hint: 'Enter send   Esc back to flying', place: 'ask the ship\'s computer', cancelled: 'Cancelled.', name: 'Understood. I will answer to {name}.', who: 'My name is {name}. Type /name followed by a new name to change it.' },
  zone: { x0: 368, y0: 490, x1: 992, y1: 660 },
  s: { typing: false, text: '', pend: null, live: null, items: [], act: null, seq: 0, voice: null, game: null, el: null, last: '' }
};
function csNow() { return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(); } // the tests move this clock
const csTry = (f, d) => { try { return f(); } catch (e) { return d; } };
const csSay = (k, v) => String(CMDSTRIP.say[k] || k).replace(/\{(\w+)\}/g, (all, n) => (v && v[n] !== undefined ? v[n] : all));

// how long an answer stays up before it fades: longer for a longer answer
function cmdstripHold(text) { const h = CMDSTRIP.hold; return Math.min(h.max, h.base + h.per * String(text || '').length); }
// 1 while the answer is up, down to 0 over the fade, 0 after
function cmdstripFade(live, now) {
  if (!live) return 0;
  const t = now - live.at - live.hold;
  return t <= 0 ? 1 : Math.max(0, 1 - t / CMDSTRIP.fade);
}
// the last exchanges above the line: the newest one brighter; scale is the fade of the whole strip
function cmdstripOlder(items, scale) {
  const rows = items.slice(-CMDSTRIP.older);
  return rows.map((o, i) => ({ q: o.q, a: o.a, kind: o.kind, alpha: +(scale * (rows.length === 1 ? 0.54 : 0.32 + 0.22 * i)).toFixed(3) }));
}
// PURE. What the strip shows at `now`: null (nothing), or { mode, alpha, older[], cmd, reply, kind, hint, caret, mark, head, body }.
// voice is listenView's answer ({ mark, head, body } or null). The order: the microphone, the line being typed, an answer on its way, an answer showing.
function cmdstripView(S, now, voice) {
  if (voice) return { mode: 'voice', alpha: 1, older: cmdstripOlder(S.items, 1), mark: voice.mark, head: voice.head, body: voice.body };
  if (S.typing) return { mode: 'typing', alpha: 1, older: cmdstripOlder(S.items, 1), cmd: S.text, caret: true, hint: CMDSTRIP.say.hint };
  if (S.pend) return { mode: 'thinking', alpha: 1, older: cmdstripOlder(S.items, 1), cmd: S.pend.q, reply: '. . .', kind: 'say' };
  const f = cmdstripFade(S.live, now);
  if (S.live && f > 0) return { mode: 'reply', alpha: f, older: cmdstripOlder(S.items, f), cmd: S.live.q, reply: S.live.a, kind: S.live.kind };
  return null;
}
// an answer that has faded out all the way goes into the history (the next line brings it back, dim)
function cmdstripSettle(now) {
  const S = CMDSTRIP.s;
  if (S.live && cmdstripFade(S.live, now) <= 0) cmdstripKeep();
}
function cmdstripKeep() {
  const S = CMDSTRIP.s; if (!S.live) return;
  S.items.push({ q: S.live.q, a: S.live.a, kind: S.live.kind }); S.live = null;
  if (S.items.length > CMDSTRIP.keep) S.items.splice(0, S.items.length - CMDSTRIP.keep);
}
function cmdstripUp() { const S = CMDSTRIP.s; return !!S.shown; }
function cmdstripZone() { return cmdstripUp() ? Object.assign({}, CMDSTRIP.zone) : null; }

// ---------- where it may be ----------
// the running Space or Station scene that is not going anywhere (a paused one, behind a menu or a map, is not)
function cmdstripScene(game) {
  game = game || CMDSTRIP.s.game || (typeof window !== 'undefined' ? window.game : null);
  if (!game || !game.scene || typeof game.scene.getScenes !== 'function') return null;
  const s = game.scene.getScenes(true).find(sc => sc.scene && (sc.scene.key === 'Space' || sc.scene.key === 'Station'));
  return s && !s.leaving && !s.dead ? s : null;
}
// what keeps the line from opening: a panel, a talk, the shop, a jump charging, or the navigation list holding the keys
const cmdstripBlocked = s => !!(s.panel || s.talk || s.shopOpen || s.jmp || (s.cr && s.cr.navOpen));

// ---------- the line ----------
function cmdstripOpen(game) {
  const S = CMDSTRIP.s; game = game || S.game;
  if (!shipcompAvailable()) return false;
  const sc = cmdstripScene(game); if (!sc || cmdstripBlocked(sc)) return false;
  if (S.typing) return false;
  S.game = game;
  cmdstripKeep(); // what was on the screen goes up into the dim rows; an answer still on its way shows when the line is closed again
  const d = cmdstripDom(); if (!d) return false;
  S.typing = true; S.text = ''; d.input.value = '';
  csTry(() => sc.input.keyboard.resetKeys(), 0); // keys held when the line opened never see their key-up: let them go now, the ship coasts
  cmdstripPaint(); cmdstripFocus();
  return true;
}
function cmdstripFocus() { setTimeout(() => { const S = CMDSTRIP.s; if (S.typing && S.el) csTry(() => S.el.focus(), 0); }, 20); }
// the line gives the keyboard back: Esc, Enter, a click on the game, the scene going away. Nothing typed is kept.
function cmdstripClose() {
  const S = CMDSTRIP.s; if (!S.typing) return false;
  S.typing = false; S.text = '';
  const d = CMDSTRIP.s.dom; if (d) { csTry(() => { d.input.value = ''; d.input.blur(); }, 0); }
  const sc = cmdstripScene(); if (sc) csTry(() => sc.input.keyboard.resetKeys(), 0);
  cmdstripPaint();
  return true;
}
function cmdstripEnter() {
  const S = CMDSTRIP.s, d = S.dom; if (!S.typing || !d) return;
  const q = scClean(d.input.value, SHIPCOMP.limit.line);
  cmdstripClose();
  if (q) cmdstripSend(q, S.game || (typeof window !== 'undefined' ? window.game : null));
}
function cmdstripSubmit(text, game) {
  const S = CMDSTRIP.s; game = game || S.game;
  if (!shipcompAvailable()) return false;
  const sc = cmdstripScene(game); if (!sc || cmdstripBlocked(sc)) return false;
  const q = scClean(text, SHIPCOMP.limit.line); if (!q) return false;
  S.game = game; cmdstripClose(); cmdstripSend(q, game); return true;
}

// ---------- an exchange ----------
// the question is on the line, dots under it; the answer shows when the voice starts (at once with no voice, 1.5 s at the latest), then stays its hold and fades
async function cmdstripSend(q, game) {
  const S = CMDSTRIP.s, sc = cmdstripScene(game); if (!sc) return false;
  cmdstripKeep(); cmdstripCancelAct(false);
  const seq = ++S.seq; S.pend = { q, at: csNow() }; cmdstripPaint();
  const done = (a, kind) => { if (seq !== S.seq) return; S.pend = null; S.live = { q, a, kind, at: csNow(), hold: cmdstripHold(a) }; cmdstripPaint(); };
  const nm = /^\/name\b\s*(.*)$/i.exec(q);
  if (nm) { // /name Vesper: rename the computer, here and now
    const n = nm[1] ? shipcompSetName(nm[1]) : shipcompName();
    done(nm[1] ? csSay('name', { name: n }) : csSay('who', { name: n }), 'say'); return true;
  }
  let r; try { r = await shipcompAsk(q, sc); } catch (e) { r = { error: 'The ship\'s computer could not answer.' }; }
  if (seq !== S.seq) return true;
  if (!r || !r.text) { done((r && r.error) || 'The ship\'s computer could not answer.', 'warn'); return true; }
  const plan = r.plan && r.plan.run ? r.plan : null;
  shipcompSay(r.text, () => {
    if (seq !== S.seq) return;
    done(r.text, plan ? 'act' : 'say');
    if (plan) cmdstripAct(plan, sc, seq);
  });
  return true;
}
// the act: announced (the line above, and aloud), then run by the game 0.7 s later so it can be read; Esc in that moment cancels it
function cmdstripAct(plan, sc, seq) {
  const S = CMDSTRIP.s; cmdstripCancelAct(false);
  const timer = setTimeout(() => {
    if (!S.act || S.act.seq !== seq) return;
    S.act = null;
    csTry(() => plan.run(sc), 0); // the game says so itself when it cannot
  }, CMDSTRIP.act);
  S.act = { seq, timer };
}
function cmdstripCancelAct(say) {
  const S = CMDSTRIP.s; if (!S.act) return false;
  clearTimeout(S.act.timer); S.act = null;
  if (say && S.live) { S.live.a = csSay('cancelled'); S.live.kind = 'warn'; S.live.at = csNow(); S.live.hold = cmdstripHold(S.live.a); cmdstripPaint(); }
  return true;
}

// ---------- the voice ----------
// src/listen.js calls this from listenPaint with what it would draw; the strip draws it and the old box stays shut. false when there is no strip to draw on.
function cmdstripVoice(v) {
  const S = CMDSTRIP.s, d = cmdstripDom(); if (!d) return false;
  S.voice = v || null; cmdstripPaint(); return true;
}

// ---------- the picture ----------
const CS_COLOR = { red: '#ff4d6d', amber: '#ffb454', cyan: '#9fe9ff', green: '#6dff9c' };
function cmdstripDom() {
  const S = CMDSTRIP.s; if (S.dom) return S.dom;
  if (typeof document === 'undefined' || !document.body || typeof document.createElement !== 'function') return null;
  try {
    const mk = (css, tag) => { const e = document.createElement(tag || 'div'); e.style.cssText = css; return e; };
    const root = mk('position:fixed;z-index:58;display:none;pointer-events:none;width:1280px;height:720px;transform-origin:0 0;font:16px ui-monospace,Menlo,Consolas,monospace;color:#e8f6ff');
    const box = mk('position:absolute;box-sizing:border-box;padding:12px 16px 12px 24px;background:rgba(4,16,28,0.86);border:1px solid #38e1ff;border-radius:5px;box-shadow:inset 3px 0 0 #ffb454;display:flex;flex-direction:column;gap:6px');
    const older = [mk('font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'), mk('font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')];
    const row = mk('display:flex;align-items:center;gap:12px;min-height:30px');
    const cap = mk('flex:none;width:24px;height:24px;box-sizing:border-box;border:1.5px solid #ffb454;border-radius:4px;color:#ffb454;font-weight:700;font-size:15px;line-height:21px;text-align:center');
    const input = mk('flex:1;min-width:0;background:transparent;border:0;outline:0;color:#e8f6ff;font:16px ui-monospace,Menlo,Consolas,monospace;padding:0;pointer-events:auto;caret-color:#e8f6ff', 'input');
    const text = mk('flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis');
    const hint = mk('flex:none;font-size:12px;color:#5b7a92');
    const reply = mk('padding-left:36px;line-height:21px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden');
    input.type = 'text'; input.autocomplete = 'off'; input.spellcheck = false; input.maxLength = SHIPCOMP.limit.line; input.placeholder = CMDSTRIP.say.place;
    ['keydown', 'keyup', 'keypress'].forEach(ev => input.addEventListener(ev, e => e.stopPropagation()));
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); cmdstripEnter(); } else if (e.key === 'Escape') { e.preventDefault(); cmdstripClose(); } });
    input.addEventListener('input', () => { S.text = input.value; });
    input.addEventListener('blur', () => { setTimeout(() => { if (S.typing && document.activeElement !== input) cmdstripClose(); }, 0); }); // a click on the game takes the keyboard: the line lets go
    older.forEach(o => box.appendChild(o)); row.appendChild(cap); row.appendChild(input); row.appendChild(text); row.appendChild(hint); box.appendChild(row); box.appendChild(reply); root.appendChild(box);
    root.setAttribute('role', 'status'); root.setAttribute('aria-live', 'polite'); document.body.appendChild(root);
    S.dom = { root, box, older, row, cap, input, text, hint, reply }; S.el = input;
  } catch (e) { S.dom = null; S.el = null; }
  return S.dom;
}
function cmdstripPaint() {
  const S = CMDSTRIP.s, d = S.dom || (S.voice !== null || S.typing || S.pend || S.live ? cmdstripDom() : null); if (!d) return null;
  try {
    const now = csNow(), game = S.game || (typeof window !== 'undefined' ? window.game : null), sc = cmdstripScene(game);
    if (!sc && S.typing) { S.typing = false; S.text = ''; }
    cmdstripSettle(now);
    const v = sc ? cmdstripView(S, now, S.voice) : null;
    S.shown = !!v;
    if (!v) { d.root.style.display = 'none'; return null; }
    const canvas = game && game.canvas, r = canvas && canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null, k = r ? r.width / 1280 : 1;
    const color = v.mode === 'voice' ? (CS_COLOR[v.mark] || CS_COLOR.cyan) : '#38e1ff';
    Object.assign(d.root.style, { display: 'block', left: (r ? r.left : 0) + 'px', top: (r ? r.top : 0) + 'px', transform: 'scale(' + k + ')', opacity: String(v.alpha) });
    Object.assign(d.box.style, { left: CMDSTRIP.x + 'px', width: CMDSTRIP.w + 'px', bottom: CMDSTRIP.bottom + 'px', borderColor: v.mode === 'voice' && v.mark === 'red' ? CS_COLOR.red : v.mode === 'voice' && v.mark === 'green' ? CS_COLOR.green : '#38e1ff' });
    d.older.forEach((o, i) => { const row = v.older[v.older.length - d.older.length + i]; if (!row) { o.style.display = 'none'; return; } o.style.display = 'block'; o.style.opacity = String(row.alpha); o.style.color = '#8fb4c9'; o.textContent = '> ' + row.q + '   ' + row.a; });
    const voice = v.mode === 'voice', typing = v.mode === 'typing';
    d.cap.textContent = voice ? 'U' : 'I'; d.cap.style.color = d.cap.style.borderColor = voice && v.mark === 'red' ? CS_COLOR.red : '#ffb454';
    d.input.style.display = typing ? 'block' : 'none'; d.text.style.display = typing ? 'none' : 'block';
    if (typing) { if (d.input.value !== S.text) d.input.value = S.text; } else {
      d.text.textContent = voice ? (v.mark === 'red' ? '● ' : '') + v.head : v.cmd; d.text.style.color = voice ? color : '#e8f6ff'; d.text.style.fontWeight = voice ? '600' : '400';
    }
    d.hint.textContent = typing ? v.hint : '';
    const line = voice ? v.body : v.reply;
    d.reply.style.display = line ? '-webkit-box' : 'none'; d.reply.textContent = line || '';
    d.reply.style.color = voice ? '#9fb4c4' : v.kind === 'act' ? '#9fe9ff' : v.kind === 'warn' ? '#ffb454' : '#e8f6ff'; d.reply.style.fontSize = voice ? '12px' : '16px';
  } catch (e) { /* the strip is a nicety: the flight goes on without it */ }
  return null;
}

// ---------- once for the whole game ----------
function cmdstripInstall(game) {
  const S = CMDSTRIP.s; S.game = game;
  // Esc cancels an act that is waiting its 0.7 s; the capture phase sees it before the pause menu does
  window.addEventListener('keydown', e => { if (e.code === 'Escape' && S.act) { e.preventDefault(); e.stopPropagation(); cmdstripCancelAct(true); } }, true);
  const t = setInterval(() => { if (S.dom && (S.shown || S.typing || S.pend || S.live || S.voice)) cmdstripPaint(); }, 50);
  if (t && typeof t.unref === 'function') t.unref();
}
if (typeof window !== 'undefined' && window.game && window.game.scene && typeof window.game.scene.add === 'function') cmdstripInstall(window.game);
