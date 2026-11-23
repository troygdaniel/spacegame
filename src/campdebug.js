// ---------- Campaign: the debug keys (card space-game-campaign-tune; Troy, 19 Nov 2026) ----------
// Troy plays the Campaign to tune it, so he can jump around it: skip to the next level, win or lose this one, and a god mode. They work in the Campaign only (the scene
// asks campDebugKey for every key it gets; Long Haul never does), and the pause screen lists them in one small line (campDebugLine). Plain data first, the behaviour after it.
// This file needs src/campaign.js (CAMP, campEnd, campPick, campTechChoices) and says what it does to the play log through campaignNote (src/playlog.js, when there is one).
//
//   campDebugOn()                 are the tune kit's keys on? OFF unless the address says ?debug=1 (src/campaignaddr.js campDebugAddrPage) or a bot or tool calls campDebugSet(true)
//   campDebugSet(on)              switch the kit on or off by hand (the bots, the tools and the tests do; the page never does, only its address)
//   campDebugKey(code)            the id of the row a physical key is ('skip', 'win', 'lose', 'god') or null; code is KeyboardEvent.code. null for every key while the kit is off
//   campDebugRun(C, P, id)        do it: C is the battle (campNew), P the progress { level, techs }. -> { ok, say, go }; { ok: false } and nothing done while the kit is off
//                                 say: a plain line for the screen. go: null, or { level, techs, via: 'skip' }: the scene starts that level now (campNew(go.level, go.techs, { via: go.via }))
//   campDebugLine(C)              the one line for the pause screen, with the god mode as it is now; '' while the kit is off (the scene leaves the line out)
// Why the switch (card space-game-debug-keys-off): the four keys sit beside Enter, and one slip of the finger on the backslash ended Troy's Mission 1 at 108 s. Off is the normal game.
const CAMP_DEBUG = {
  keys: [                                   // one row a key. code: the physical key (KeyboardEvent.code, so a layout cannot move it); key: what it says on the pause line; text: what it does
    { id: 'skip', code: 'Quote', key: '\'', text: 'next level' },         // ends this level as skipped and starts the next with the first tech of each level before it
    { id: 'win', code: 'Backslash', key: '\\', text: 'win' },               // wins this level, so the story and the tech pick that follow a win are shown
    { id: 'lose', code: 'Comma', key: ',', text: 'lose' },              // loses this level (the lose screen)
    { id: 'god', code: 'Backquote', key: '`', text: 'god mode' }            // the carrier takes no damage and Earth's shield does not fall; again to turn it off
  ],
  sep: '   ',                              // between the rows of the pause line
  on: null                                  // null: not asked yet (the first campDebugOn reads the address once: ?debug=1 is on, anything else is off); true or false once asked or set by campDebugSet
};

function campDebugSet(on) { CAMP_DEBUG.on = !!on; return CAMP_DEBUG.on; }

function campDebugOn() {
  if (CAMP_DEBUG.on === null) { let a = false; try { a = typeof campDebugAddrPage === 'function' && campDebugAddrPage() === true; } catch (e) { a = false; } CAMP_DEBUG.on = a; }
  return CAMP_DEBUG.on === true;
}

function campDebugKey(code) { if (!campDebugOn()) return null; const r = CAMP_DEBUG.keys.find(k => k.code === code); return r ? r.id : null; }

function campDebugLine(C) {
  if (!campDebugOn()) return '';
  return 'DEBUG  ' + CAMP_DEBUG.keys.map(r => r.key + ' ' + r.text + (r.id === 'god' && C ? (C.god ? ' ON' : ' off') : '')).join(CAMP_DEBUG.sep);
}

function campDebugNote(step, data) { try { if (typeof campaignNote === 'function') campaignNote(step, data); } catch (e) { /* the log is never the reason a key does nothing */ } }

function campDebugRun(C, P, id) {
  if (!campDebugOn() || !C || !CAMP_DEBUG.keys.some(k => k.id === id)) return { ok: false, say: '', go: null }; // the kit is off: no key does anything, whoever asks
  campDebugNote('debug', { debug: id, level: C.level });
  if (id === 'god') { C.god = !C.god; return { ok: true, say: 'Debug: god mode ' + (C.god ? 'ON' : 'off') + '.', go: null }; }
  if (C.result) return { ok: false, say: 'Debug: this level is already over.', go: null };
  const hull = C.carrier ? Math.round(C.carrier.hp) : undefined;
  if (id === 'win') { campEnd(C, 'won', 'debug'); campDebugNote('end', { level: C.level, result: 'win', why: 'debug', hull }); return { ok: true, say: 'Debug: level ' + C.level + ' won.', go: null }; }
  if (id === 'lose') { campEnd(C, 'lost', 'debug'); campDebugNote('end', { level: C.level, result: 'lose', why: 'debug', hull }); return { ok: true, say: 'Debug: level ' + C.level + ' lost.', go: null }; }
  // skip: the next level, if there is one. The tech this level would have given is picked for you (the first it offers) so the next one starts as a played game would.
  const next = C.level + 1;
  if (!CAMP.levels[next]) { campEnd(C, 'won', 'debug'); campDebugNote('end', { level: C.level, result: 'win', why: 'debug', hull }); return { ok: true, say: 'Debug: that was the last level: won.', go: null }; }
  const have = (C.techs || []).slice();
  if (P && Array.isArray(P.techs)) P.techs.forEach(t => { if (have.indexOf(t) < 0) have.push(t); });
  if (!campTechChoices(C.level).some(t => have.indexOf(t) >= 0)) { const first = campTechChoices(C.level)[0]; if (first) have.push(first); }
  if (P) { P.techs = have.slice(); P.level = next; }
  campDebugNote('end', { level: C.level, result: 'skip', why: 'debug', hull });
  return { ok: true, say: 'Debug: level ' + C.level + ' skipped, on to level ' + next + '.', go: { level: next, techs: have, via: 'skip' } };
}
