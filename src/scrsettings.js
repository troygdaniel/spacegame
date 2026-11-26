// ---------- Settings in the new look of the screens: all seven tabs (landing E of the new screens; card space-game-screens-e-keys-settings) ----------
// Troy approved the new look of the screens (25 Nov 2026; the mock is docs/screens-mock.html, sections Settings, Sound and the six tabs of brief 3 part 2): tab names on the left, the controls of the tab on the right as rows (a word, a control, one short
// hint only where the control needs it), and a foot of three chips. Every control stays (docs/screens-mock.html lists what was cut and where it went); the helper paragraphs shrink to the mock's words, which are content/text/scrsettings.md's and
// content/text/scrctl.md's (the prefix scr.sett. and scr.ctl.). Behind the switch CAMP.flags.screens (src/screens.js scrOn): with it off, src/settings.js draws the screen it always drew, and nothing here is called.
// THE MODEL IS PURE (tests/scrsettings.mjs runs it in plain Node): scrSetModel(s) says what a tab shows for a state; the DOM half (scrSetPaint) draws it on the host of src/scrhost.js and the scene's own methods do what a click says (src/settings.js: setVolume,
// saveKey, press ...), so the new look and the old one cannot do different things. A KEYS tab keeps its REAL inputs (the ones src/settings.js makes): they are laid over the placeholders this draws. A stored key is never drawn, logged or moved:
// a row says "Saved", "No key" or "Rejected", and nothing of the key itself (the old tab showed its last four characters).
//   scrSetModel(s)         { section, tabs: [{ id, text, on }], body: [row], foot: [{ chips, t }], status: { text, tone } | null }; s: the Settings scene, or any { section, ctab, armed, inputs, scrSayMsg } (nothing of the scene is needed to ask)
//   scrSetShown(model)     the texts the model puts on the screen (its words and its chips), in order; scrSetWords(model) how many words and numbers (the count of the mock: src/screens.js scrWords); scrSetBudget(section) its screen's id in SCR_BUDGET
//   scrSetAct(s, act, arg, frac)   what a click on a pill, a tab or a meter does (a name and an argument: the model has no functions in it, so it can be compared and kept)
//   scrSetCreate(s), scrSetShow(s, id), scrSetPaint(s), scrSetUpdate(s), scrSetSay(s, text, color), scrSetPress(s, what), scrSetInputs(s)   the scene's side: src/settings.js calls them when the switch is on
//   scrSetResetCampaign()  the new Reset campaign button: the mission list's "Start the campaign over", the Campaign's progress back to mission 1 (the Long Haul save and the keys are not touched)
const SCRSET = {
  tabs: ['sound', 'keys', 'listen', 'controls', 'flight', 'content', 'reset'],           // the mock's seven, in its order (SETTINGS.sections of src/settings.js has the same ids)
  ctl: ['station', 'ship', 'flight', 'surface', 'campaign', 'readyroom', 'title', 'any'], // the groups of the key table (CONTROLS) the Controls tab has as pills: LISTS is not one (the mock: its rows are the Campaign's)
  budget: { sound: 'settings', keys: 'setkeys', listen: 'setlisten', controls: 'setcontrols', flight: 'setflight', content: 'setcontent', reset: 'setreset' }, // a tab's screen of the word budget (SCR_BUDGET)
  input: { background: 'rgba(255,255,255,.05)', color: '#e6edf7', border: '1px solid rgba(140,170,210,.3)', borderColor: 'rgba(140,170,210,.3)', borderRadius: '2em', padding: '0 0.9em', outline: 'none', boxSizing: 'border-box', fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif' }, inputOn: '#e6edf7', // the real fields of the Keys tab, in the pill's look (src/scrset.css .sc-pill): they are laid over the placeholders
  tick: 100,                                                                           // ms between two looks at the state (the page is drawn again only when the model changed)
  problems: 4,                                                                         // the Content tab lists at most this many problems of the content pack
  tones: { '#6dff9c': 'good', '#ff4d6d': 'foe', '#ffd37a': 'warn', '#ffb454': 'warn', '#9fe9ff': '' }, // the colours src/settings.js says a line in, as the tones of the new look
  campaignAsk: 'Press Reset campaign again to start the campaign over.'
};
const scrSetCase = t => { t = String(t == null ? '' : t); return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(); }; // ON to On, READY ROOM to Ready room: the names of the old tables, in the new look's case
const scrSetKeyOf = id => (id === 'deepgram' ? (typeof VOICE === 'object' ? VOICE.key : '') : (typeof CHAT === 'object' && CHAT.keys ? CHAT.keys[id] : '')) || '';
const scrSP = (text, o) => Object.assign({ t: 'pill', text: String(text) }, o || {});            // a pill: { on, tone (amber, pink), ok (a tick or a dash), act, arg, hint }
const scrSM = (pct, tone, o) => Object.assign({ t: 'meter', pct: Math.round(Math.max(0, Math.min(100, pct)) * 10) / 10, tone: tone || '' }, o || {}); // a meter: act makes it a thing to click
const scrST = (text, o) => Object.assign({ t: 'text', text: String(text) }, o || {});         // some words: { cls: val, dim, amber }

// ---- the seven tabs (pure) ----
function scrSetSound() {
  const muted = !!G.muted, vol = muted ? 0 : G.volume, mus = MUSIC.on ? MUSIC.vol : 0, st = voiceStatus(), waits = !!VOICE.on && st !== 'ON', bad = st === 'KEY REJECTED';
  const vc = VOICE_CHOICES.find(x => x[0] === VOICE.voice) || VOICE_CHOICES[0], pc = v => Math.round(v * 100) + '%';
  return [
    { label: uiText('scr.sett.s.volume'), items: [scrSM(vol * 100, 'blue', { act: 'volume' }), scrST(pc(vol), { cls: 'val' }), scrSP(uiText(muted ? 'scr.sett.s.muted' : 'scr.sett.s.mute'), { on: muted, tone: muted ? 'pink' : '', act: 'mute' })] },
    { label: uiText('scr.sett.s.music'), items: [scrSM(mus * 100, 'blue', { act: 'music' }), scrST(pc(mus), { cls: 'val' })] },   // a meter at 0 is off (the old switch and the old volume are one)
    { label: uiText('scr.sett.s.fx'), items: [scrSM(FX.vol * 100, 'blue', { act: 'fx' }), scrST(pc(FX.vol), { cls: 'val' })] },
    { label: uiText('scr.sett.s.chatter'), items: CHATTER_MODES.map(([id, name]) => scrSP(scrSetCase(name), { on: chatterMode() === id, act: 'chatter', arg: id })) },
    { label: uiText('scr.sett.s.voice'), items: [scrSP(uiText(!VOICE.on ? 'scr.sett.s.voiceoff' : bad ? 'scr.sett.s.voicebad' : waits ? 'scr.sett.s.voiceneeds' : 'scr.sett.s.voiceon'), { on: !!VOICE.on && !waits, tone: waits ? (bad ? 'pink' : 'amber') : '', act: 'voiceon' }), waits ? scrST(uiText('scr.sett.s.voicehint'), { dim: true }) : null].filter(Boolean) },
    { label: uiText('scr.sett.s.voicename'), items: [scrSP(scrSetCase(vc[1]), { on: true, act: 'voicestep' }), scrSP(uiText('scr.sett.s.hear'), { act: 'hear' })] },
    { label: uiText('scr.sett.s.replies'), items: VOICE_SPOKEN_MODES.map(([id, name]) => scrSP(scrSetCase(name), { on: VOICE.spoken === id, act: 'spoken', arg: id })) }
  ];
}
function scrSetKeys(s) {
  const rows = [{ kind: 'warn', text: uiText('scr.sett.k.warn') }], inp = s && s.inputs ? s.inputs : {};
  SETTINGS.keyRows.forEach(r => {
    const k = scrSetKeyOf(r.id), bad = r.id === 'deepgram' ? !!VOICE.bad : !!(CHAT.bad && chatProvider() === r.id && k), typed = !!(inp[r.id] && String(inp[r.id].value || '').trim()), info = settingsKeyInfo(r.id);
    rows.push({ name: uiText('scr.sett.k.' + r.id), sub: uiText('scr.sett.k.' + r.id + '.use'), items: [
      scrSP(uiText(!k ? 'scr.sett.k.none' : bad ? 'scr.sett.k.rejected' : 'scr.sett.k.saved'), { ok: !k ? null : !bad, tone: !k ? 'amber' : bad ? 'pink' : '' }),
      { t: 'field', id: r.id, text: uiText(k ? 'scr.sett.k.replace' : 'scr.sett.k.paste') },
      scrSP(uiText(k && !typed ? 'scr.sett.k.clear' : 'scr.sett.k.save'), { act: 'keysave', arg: r.id }),  // Clear is Save with an empty field: it says so when a key is saved and nothing is typed
      scrSP(uiText('scr.sett.k.test'), { act: 'keytest', arg: r.id }),
      info && info.urlOk ? scrSP(uiText('scr.sett.k.get'), { act: 'keyget', arg: r.id }) : null].filter(Boolean) });
  });
  rows.push({ label: uiText('scr.sett.k.chat'), items: [scrSP(uiText('scr.sett.k.on'), { on: !!CHAT.on, act: 'chaton', arg: true }), scrSP(uiText('scr.sett.k.off'), { on: !CHAT.on, act: 'chaton', arg: false })] });
  rows.push({ label: uiText('scr.sett.k.provider'), items: [['', uiText('scr.sett.k.auto')], ['openai', uiText('scr.sett.k.openai')], ['anthropic', uiText('scr.sett.k.anthropic')]].map(([id, name]) => scrSP(name, { on: (CHAT.provider || '') === id, act: 'provider', arg: id })) });
  rows.push({ label: uiText('scr.sett.k.model'), items: [{ t: 'field', id: 'model', text: CHAT_PROVIDERS[chatProvider()].model }] });
  const strip = typeof scrKeysCap === 'function' ? scrKeysCap('strip') : ''; // the key page's strip row moved here (the mock's cut list): the key that types an order, read from the key table, and what it needs
  if (strip) rows.push({ label: uiText('scr.sett.k.strip'), items: [{ t: 'chip', chip: { id: 'strip', k: strip } }, scrST(uiText('scr.sett.k.striphint'), { cls: 'sm', dim: true })] });
  return rows;
}
function scrSetListen() {
  const r = listenReady(), used = LISTEN.s.used, max = LISTEN.limit.minutes, mins = Math.floor(used / 60000);
  return [
    { label: uiText('scr.sett.l.hold'), items: [{ t: 'chip', chip: { id: 'listen', k: LISTEN.cap } }, scrST(uiText('scr.sett.l.how'), { cls: 'sm' })] },
    { label: uiText('scr.sett.l.listening'), items: [scrSP(uiText('scr.sett.l.on'), { on: !!LISTEN.on, act: 'listenon', arg: true }), scrSP(uiText('scr.sett.l.off'), { on: !LISTEN.on, act: 'listenon', arg: false }), !r.ok ? scrST(uiText('scr.sett.l.needs'), { cls: 'sm', amber: true }) : null].filter(Boolean) },
    { label: uiText('scr.sett.l.mic'), items: [scrSP(uiText('scr.sett.l.test'), { act: 'mictest', hint: uiText('scr.sett.l.testhint') })] },
    { label: uiText('scr.sett.l.session'), items: [scrSM(Math.min(1, used / (max * 60000)) * 100, 'blue'), scrST(uiText('scr.sett.l.of', { used: mins, max }), { cls: 'val' })] }
  ];
}
function scrSetControls(s) {
  const gid = SCRSET.ctl.indexOf(s && s.ctab) >= 0 ? s.ctab : 'station', g = controlsGroup(gid);
  return [
    { kind: 'pills', items: SCRSET.ctl.map(id => scrSP(scrSetCase(controlsGroup(id).title), { on: id === gid, act: 'ctab', arg: id })) },
    { kind: 'grid', rows: g.rows.map((r, i) => ({ chips: [{ id: 'ctl:' + gid + ':' + i, k: r.k.join(' ') }], t: uiText('scr.ctl.' + gid + '.' + i) })) } // the caps are the table's; the words, one to four, are scr.ctl.<group>.<n>'s
  ];
}
function scrSetFlightRows() { // the five rows of the feel's numbers: the label key, what each feel takes (seconds), and the scale: the table of the old tab (src/settings.js draw_flight) as data
  const acc = shipStat('accel'), vmax = shipStat('vmax');
  return [['turnup', h => h.turnUp / 1000, 1], ['turndown', h => h.turnDown / 1000, 1], ['thrust', h => h.thrustUp / 1000, 1], ['top', h => handlingTimeTo(h, acc, vmax), 3], ['coast', h => handlingCoast(h, vmax), 15]];
}
function scrSetFlight() {
  const ids = Object.keys(HANDLING), now = handlingNow(), rows = [{ label: uiText('scr.sett.f.feel'), items: ids.map(id => scrSP(HANDLING[id].name, { on: id === now.id, act: 'feel', arg: id })).concat([scrST(uiText('scr.sett.f.applies'), { dim: true })]) }];
  scrSetFlightRows().forEach(([key, f, max]) => {
    const v = f(HANDLING[now.id]);
    rows.push({ label: uiText('scr.sett.f.' + key), items: [{ t: 'meter2', ms: ids.map(id => ({ pct: Math.round(Math.min(1, f(HANDLING[id]) / max) * 1000) / 10, tone: id === now.id ? 'amber' : 'blue' })) }, scrST(v ? uiText('scr.sett.f.secs', { s: v.toFixed(1) }) : uiText('scr.sett.f.now'), { cls: 'sec' })] });
  });
  return rows;
}
function scrSetContent() {
  const errs = typeof CONTENT_ERRORS !== 'undefined' ? CONTENT_ERRORS : [], n = errs.length, modded = typeof CONTENT_STATE !== 'undefined' && !!CONTENT_STATE.modded, on = typeof scrOn === 'function' && scrOn();
  const rows = [
    { label: uiText('scr.sett.c.screens'), hint: uiText('scr.sett.c.screenshint'), items: [scrSP(uiText(on ? 'scr.sett.c.on' : 'scr.sett.c.off'), { on, act: 'screens', arg: !on })] },   // kept here until the default-on card takes the switch out
    typeof fillOn === 'function' ? { label: uiText('scr.sett.c.fill'), hint: uiText('scr.sett.c.fillhint'), items: [scrSP(uiText(fillOn() ? 'scr.sett.c.on' : 'scr.sett.c.off'), { on: !!fillOn(), act: 'fill', arg: !fillOn() })] } : null, // beside the New screens row, as the old Settings has it (card space-game-fill-window-a-flight; src/fillwindow.js; card space-game-batch-922-small-fixes)
    { label: uiText('scr.sett.c.pack'), items: [scrSP(uiText(modded ? 'scr.sett.c.modded' : 'scr.sett.c.core'), { on: true }), n ? scrST(uiText(n === 1 ? 'scr.sett.c.one' : 'scr.sett.c.many', { n }), { cls: 'sm', amber: true }) : { t: 'ok', text: uiText('scr.sett.c.ok') }] }
  ];
  errs.slice(0, SCRSET.problems).forEach(e => rows.push({ items: [scrST(typeof contentLine === 'function' ? contentLine(e) : String(e && e.message || e), { cls: 'sm', dim: true })] }));
  return rows.filter(Boolean);
}
function scrSetReset(s) {
  const a = s && s.armed ? s.armed.what : '', btn = (what, key) => scrSP(uiText(a === what ? 'scr.sett.r.again' : key), { tone: 'pink', on: a === what, act: 'press', arg: what }), logOn = typeof playlogOn === 'function' && playlogOn();
  return [
    { label: uiText('scr.sett.r.campaign'), items: [btn('campaign', 'scr.sett.r.campaignbtn'), scrST(uiText('scr.sett.r.campaignhint'), { cls: 'sm', dim: true })] },
    { label: uiText('scr.sett.r.game'), items: [btn('reset', 'scr.sett.r.gamebtn'), scrST(uiText('scr.sett.r.gamehint'), { cls: 'sm', dim: true })] },
    { label: uiText('scr.sett.r.keys'), items: [btn('forget', 'scr.sett.r.keysbtn'), scrST(uiText('scr.sett.r.keyshint'), { cls: 'sm', dim: true })] },
    { label: uiText('scr.sett.r.log'), items: [scrSP(uiText(logOn ? 'scr.sett.r.logon' : 'scr.sett.r.logoff'), { on: logOn, act: 'plon' }), scrSP(uiText('scr.sett.r.logget'), { act: 'plget' }), btn('plforget', 'scr.sett.r.logforget'), scrST(uiText('scr.sett.r.loghint'), { cls: 'sm', dim: true })] }
  ];
}
function scrSetFoot() { // the three chips of the foot are the key table's (the roles of the menus' keys in src/data_controls.js: Up and Down switch the tab, Enter does the one thing the tab has, Esc leaves)
  return [{ chips: scrChips(['up', 'down']), t: uiText('scr.sett.foot.move') }, { chips: scrChips(['pick']), t: uiText('scr.sett.foot.change') }, { chips: scrChips(['close']), t: uiText('scr.sett.foot.back') }];
}
function scrSetModel(s) {
  s = s || {}; const sec = SCRSET.tabs.indexOf(s.section) >= 0 ? s.section : 'sound';
  const body = ({ sound: scrSetSound, keys: scrSetKeys, listen: scrSetListen, controls: scrSetControls, flight: scrSetFlight, content: scrSetContent, reset: scrSetReset })[sec](s), say = s.scrSayMsg;
  return { section: sec, tabs: SCRSET.tabs.map(id => ({ id, text: uiText('scr.sett.tab.' + id), on: id === sec })), body, foot: scrSetFoot(), status: say && say.text ? { text: String(say.text), tone: SCRSET.tones[say.color] || '' } : null };
}
const scrSetBudget = sec => SCRSET.budget[sec] || 'settings';
function scrSetShown(M) { // everything the model writes on the screen: the tabs, the rows' words, the chips' caps, the foot (the status is a line the game says back, not a part of the tab: it is left out of the count)
  const out = [];
  M.tabs.forEach(t => out.push(t.text));
  const item = it => {
    if (!it) return;
    if (it.t === 'pill' || it.t === 'text') out.push(it.text); else if (it.t === 'ok') out.push(it.text); else if (it.t === 'chip') out.push(it.chip.k); else if (it.t === 'field') out.push(it.text);
  };
  M.body.forEach(r => {
    if (r.kind === 'warn') { out.push(r.text); return; }
    if (r.kind === 'pills') { r.items.forEach(item); return; }
    if (r.kind === 'grid') { r.rows.forEach(g => { g.chips.forEach(c => out.push(c.k)); out.push(g.t); }); return; }
    if (r.label) out.push(r.label); if (r.name) out.push(r.name); if (r.sub) out.push(r.sub); (r.items || []).forEach(item);
  });
  M.foot.forEach(f => { f.chips.forEach(c => out.push(c.k)); out.push(f.t); });
  return out;
}
const scrSetWords = M => scrWords(scrSetShown(M));

// ---- what a click does (the scene's own methods: the old tabs and the new one do the same) ----
function scrSetAct(s, act, arg, frac) {
  const f = Math.max(0, Math.min(1, +frac || 0));
  switch (act) {
    case 'tab': s.show(arg); break;
    case 'volume': s.setVolume(f); break;
    case 'mute': s.toggleMute(); break;
    case 'music': if (f < 0.05) musicSetOn(false); else { musicSetOn(true); musicSetVol(f); } musicPreview(); s.soundRefresh(); break; // a meter at 0 is off
    case 'fx': fxSetVol(f); beep(660, 0.08, 'triangle', 0.05); s.soundRefresh(); break;
    case 'chatter': chatterSetMode(arg); s.soundRefresh(); s.say(uiText('chatter.mode.' + arg)); break;
    case 'voiceon': voiceSetOn(!VOICE.on); s.soundRefresh(); break;
    case 'voicestep': s.stepVoice(1); break;
    case 'hear': s.hearVoice(); break;
    case 'spoken': voiceSetSpoken(arg); s.soundRefresh(); break;
    case 'keysave': s.saveKey(arg); break;
    case 'keytest': s.testKey(arg); break;
    case 'keyget': { const o = settingsOpenKey(arg); s.say(o.say, o.ok ? '#9fe9ff' : '#ff4d6d'); break; }
    case 'chaton': chatSetOn(!!arg); s.keysRefresh(); break;
    case 'provider': chatSetProvider(arg); s.keysRefresh(); break;
    case 'listenon': listenSetOn(!!arg); s.listenRefresh(); break;
    case 'mictest': s.testMic(); break;
    case 'ctab': s.ctab = arg; s.show('controls'); break;
    case 'feel': s.setFeel(arg); break;
    case 'screens': if (scrOn() !== !!arg) s.screensToggle(); break;
    case 'fill': if (typeof fillOn === 'function' && fillOn() !== !!arg) s.fillToggle(); break;
    case 'press': s.press(arg); break;
    case 'plon': s.playlogToggle(); break;
    case 'plget': s.playlogGet(); break;
    default: return false;
  }
  return true;
}
function scrSetResetCampaign() { // the mission list's Start over, from Settings: the Campaign's progress is the first mission's again (the ending seen stays seen: campHubStartOver keeps it); the Long Haul save, the keys and the volume are not touched
  if (typeof campProgressLoad !== 'function' || typeof campHubStartOver !== 'function' || typeof campProgressSave !== 'function') return false;
  const P0 = campProgressLoad(); campHubStartOver({}, P0); campProgressSave(P0); return true;
}
function scrSetPress(s, what) { // the second press within four seconds confirms (the old tab's rule, SETTINGS.confirmMs); the pill says "Press again" and turns pink in between
  const now = performance.now(), ask = { reset: 'Press Reset Long Haul again to erase your Long Haul save.', plforget: 'Press Forget log again to erase the log kept in this browser.', forget: 'Press Forget all keys again to remove them.', campaign: SCRSET.campaignAsk };
  if (!s.armed || s.armed.what !== what || now - s.armed.at > SETTINGS.confirmMs) { s.armed = { what, at: now }; s.say(ask[what] || '', '#ff4d6d'); return scrSetPaint(s, true); }
  if (now - s.armed.at < 350) return false; // a double tap is not a confirmation
  s.armed = null;
  if (what === 'plforget') { const ok = playlogForget(); s.say(ok ? 'Play log forgotten. (A copy that the dev server kept stays in its own folder.)' : 'The play log could not be cleared.', ok ? '#6dff9c' : '#ff4d6d'); }
  else if (what === 'forget') { voiceSetKey(''); chatSetKey(''); s.say('All keys removed from this browser.', '#6dff9c'); }
  else if (what === 'campaign') { const ok = scrSetResetCampaign(); s.say(ok ? uiText('scr.sett.said.campaign') : 'The campaign could not be reset.', ok ? '#6dff9c' : '#ff4d6d'); }
  else s.resetGame();
  return scrSetPaint(s, true);
}

// ---- the scene's side ----
function scrSetCreate(s) { // Settings.create, with the switch on: no canvas panel, a veil, and the host's panel (false when there is no page to draw on: the screen of today is made)
  const R = typeof scrHostMount === 'function' ? scrHostMount(s) : null; if (!R) return false;
  s.scr = { R, el: null, fields: {}, sig: '', at: 0 };
  s.add.rectangle(W / 2, H / 2, W, H, 0x02050c, SETTINGS.dim).setInteractive(); // nothing of the scene behind reads through, and its clicks do not reach it
  s.input.keyboard.on('keydown', e => s.onKey(e));
  s.input.on('pointerdown', () => { s.blurInputs(); });
  s.events.once('shutdown', () => s.dropInputs());
  s.show(s.section);
  return true;
}
function scrSetShow(s, id) { // Settings.show: the tab is the model's section; the inputs of the Keys tab are made when it opens and dropped when it closes
  s.dropInputs(); s.armed = null; s.section = id; s.scrSayMsg = null;
  if (id === 'keys') scrSetInputs(s);
  scrSetPaint(s, true); s.focusFirst();
}
function scrSetInputs(s) { // the real inputs of the Keys tab, as src/settings.js draw_keys makes them (a password field a key, a text field the model); they are laid over the placeholders this draws
  SETTINGS.keyRows.forEach(r => { s.inputs[r.id] = s.makeInput('password', 'paste your key here', 200, () => s.saveKey(r.id)); }); // (Settings.makeInput gives the keyboard back after Enter, as after Esc: card space-game-settings-keys-focus)
  s.inputs.model = s.makeInput('text', '', 60, () => s.saveModel()); s.inputs.model.value = CHAT.model; s.inputs.model.addEventListener('change', () => s.saveModel());
  Object.keys(s.inputs).forEach(id => {
    const el = s.inputs[id]; el.addEventListener('input', () => scrSetPaint(s)); // Save says Clear while a key is saved and nothing is typed
    Object.assign(el.style, SCRSET.input); // the field in the look of the page: the pill's own, not the old amber box
    el.addEventListener('focus', () => { el.style.borderColor = SCRSET.inputOn; }); el.addEventListener('blur', () => { el.style.borderColor = SCRSET.input.borderColor; });
  });
}
function scrSetSay(s, text, color) { s.scrSayMsg = text ? { text, color } : null; scrSetPaint(s); }
function scrSetPill(R, parent, it, s) {
  const e = scrHostEl(R, 'span', 'sc-pill' + (it.on ? ' on' : '') + (it.tone ? ' ' + it.tone : '') + (it.act ? ' act' : ''), parent);
  if (it.ok !== undefined && it.ok !== null) scrHostSet(scrHostEl(R, 'b', it.ok ? 'sc-ok' : 'sc-no', e), 'text', it.ok ? '✓' : '–');
  scrHostSet(scrHostEl(R, 'span', '', e), 'text', it.text);
  if (it.hint) e.title = it.hint; // a longer word for the pointer (the mock moves "Opens it for an instant ..." under the button)
  if (it.act) { e.addEventListener('mousedown', ev => { if (ev.preventDefault) ev.preventDefault(); }); e.addEventListener('click', () => scrSetAct(s, it.act, it.arg)); }
  return e;
}
function scrSetMeter(R, parent, m, it, s) {
  const e = scrHostEl(R, 'div', 'sc-m ' + (m.tone || '') + (it && it.act ? ' act' : ''), parent), i = scrHostEl(R, 'i', '', e);
  scrHostSet(i, 'width', m.pct + '%'); if (m.tone && m.tone !== 'blue' && m.tone !== 'amber') scrHostSet(i, 'background', 'var(--sc-' + m.tone + ')');
  if (it && it.act) { e.addEventListener('mousedown', ev => { if (ev.preventDefault) ev.preventDefault(); }); e.addEventListener('click', ev => { const r = e.getBoundingClientRect(); scrSetAct(s, it.act, it.arg, r.width > 0 ? (ev.clientX - r.left) / r.width : 0); }); }
  return e;
}
function scrSetRow(R, parent, r, s) {
  if (r.kind === 'warn') { const t = scrHostEl(R, 'div', 'sc-tile sc-warn', parent); scrHostSet(scrHostEl(R, 'span', 'sc-sm sc-amber', t), 'text', r.text); return t; }
  if (r.kind === 'pills') { const row = scrHostEl(R, 'div', 'sc-row', parent); r.items.forEach(it => scrSetPill(R, row, it, s)); return row; }
  if (r.kind === 'grid') { const grid = scrHostEl(R, 'div', 'sc-grid2', parent); r.rows.forEach(g => { const c = scrHostEl(R, 'div', 'sc-r', grid); g.chips.forEach(k => scrHostChip(R, c, k)); scrHostSet(scrHostEl(R, 'span', 'sc-sm', c), 'text', g.t); }); return grid; }
  const row = scrHostEl(R, 'div', 'sc-row', parent);
  if (r.label) { const l = scrHostEl(R, 'span', 'sc-lab sc-rl', row); scrHostSet(l, 'text', r.label); if (r.hint) l.title = r.hint; }
  if (r.name) { const n = scrHostEl(R, 'div', 'sc-rn', row); scrHostSet(scrHostEl(R, 'span', 'sc-t3', n), 'text', r.name); scrHostSet(scrHostEl(R, 'span', 'sc-sm sc-dim', n), 'text', r.sub || ''); }
  (r.items || []).forEach(it => {
    if (it.t === 'pill') scrSetPill(R, row, it, s);
    else if (it.t === 'meter') scrSetMeter(R, row, it, it, s);
    else if (it.t === 'meter2') { const w = scrHostEl(R, 'div', 'sc-r sc-two', row); it.ms.forEach(m => scrSetMeter(R, w, m, null, s)); }
    else if (it.t === 'chip') scrHostChip(R, row, it.chip);
    else if (it.t === 'ok') { scrHostSet(scrHostEl(R, 'span', 'sc-sm sc-ok', row), 'text', '✓ ' + it.text); }
    else if (it.t === 'field') { const f = scrHostEl(R, 'span', 'sc-pill field', row); scrHostSet(f, 'text', '\u00a0'); s.scr.fields[it.id] = f; if (s.inputs && s.inputs[it.id]) s.inputs[it.id].placeholder = it.text; }
    else if (it.t === 'text') scrHostSet(scrHostEl(R, 'span', 'sc-' + (it.cls || 'sm') + (it.dim ? ' sc-dim' : '') + (it.amber ? ' sc-amber' : ''), row), 'text', it.text);
  });
  return row;
}
function scrSetPaint(s, force) { // the model, and only when it is not what is drawn: a click is not lost to a page made again under the pointer
  const sc = s && s.scr; if (!sc || typeof document === 'undefined') return false;
  const R = scrHostMount(s); if (!R) return false;
  const M = scrSetModel(s), sig = JSON.stringify(M); if (!force && sig === sc.sig) return false;
  sc.sig = sig; sc.fields = {};
  if (sc.el && sc.el.parentNode) sc.el.parentNode.removeChild(sc.el);
  const el = sc.el = scrHostEl(R, 'div', 'sc-p sc-abs sc-r sc-set'), rail = scrHostEl(R, 'div', 'sc-c sc-rail', el), body = scrHostEl(R, 'div', 'sc-body', el);
  M.tabs.forEach(t => { const e = scrHostEl(R, 'div', 'sc-tab act' + (t.on ? ' on' : ''), rail); scrHostSet(e, 'text', t.text); e.addEventListener('mousedown', ev => { if (ev.preventDefault) ev.preventDefault(); }); e.addEventListener('click', () => scrSetAct(s, 'tab', t.id)); });
  M.body.forEach(r => scrSetRow(R, body, r, s));
  if (M.status) scrHostSet(scrHostEl(R, 'div', 'sc-stat ' + M.status.tone, body), 'text', M.status.text);
  const foot = scrHostEl(R, 'div', 'sc-r sc-foot', body);
  M.foot.forEach(f => { f.chips.forEach(c => scrHostChip(R, foot, c)); scrHostSet(scrHostEl(R, 'span', 'sc-lab', foot), 'text', f.t); });
  return true;
}
function scrSetUpdate(s) { // every frame: the real inputs of the Keys tab over their placeholders, the page when the state moved, and a confirmation nobody gave running out
  const sc = s.scr; if (!sc) return;
  const now = performance.now();
  if (s.armed && now - s.armed.at > SETTINGS.confirmMs) { s.armed = null; scrSetPaint(s); }
  else if (now - sc.at >= SCRSET.tick) { sc.at = now; scrSetPaint(s); }
  const cr = s.game && s.game.canvas && s.game.canvas.getBoundingClientRect ? s.game.canvas.getBoundingClientRect() : null, k = cr ? cr.width / W : 1;
  Object.keys(s.inputs || {}).forEach(id => {
    const el = s.inputs[id], at = sc.fields[id]; if (!el) return;
    const shown = s.section === 'keys' && !!at && !!at.isConnected; el.style.display = shown ? '' : 'none';
    if (shown) { const r = at.getBoundingClientRect(); Object.assign(el.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', fontSize: Math.round(r.height * 0.52 * 10) / 10 + 'px' }); }
  });
}
