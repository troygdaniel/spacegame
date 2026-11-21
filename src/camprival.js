// ---------- Campaign: the rival ship (card space-game-rival-duel; Troy, 21 Nov 2026) ----------
// An enemy ship the cruiser's size, with a hull and a shield of its own, that duels the cruiser. The pure half (no Phaser, no page; tests/camprival.mjs runs it in Node). The numbers are CAMP.rival in src/campaign.js.
// THE HOOK for a mission row (card space-game-l1-1-beats uses it for the pirate leader at the end of mission 1.1):
//   rivals: [{ id: 'leader', kind: 'pirateleader', at: 240 | on: { cue: 'beat4' }, from: [x, y] | ahead: 2000 (+ along: 'h1'), escorts: { skiff: 2 }, goal: 'carrier' | 'convoy:t1', prey, say: 'camp.say.rival.leader' }]
//   at / on  when it comes: the seconds of the mission clock, or any condition of a wave (scanned, delivered, t, lane, cue, cleared); the same rules as a wave row.
//   from     where it comes from (an absolute point); ahead: it comes that many px in front of a convoy (along names it), as a wave's does; with neither it comes 2,600 px from the carrier.
//   escorts  pirates that come with it, as a wave's `ships` ({ skiff: 2 }), with the same goal and prey.
//   goal     'carrier' (the default) or 'convoy:<id>': what it goes for.        say: the line the ship says when it comes (words in content/text/campaign-rival.md).
// An OBJECTIVE of the mission: { type: 'kill', what: 'rival:leader' } is met when the rival is dead or has got away (a rival that runs for good is gone, as a pirate that runs away is).
// CUES it fires (campCue, so a wave or a cue of the row can start on them: on: { cue: 'rival:leader:dead' }):
//   rival:<id>:appear   it came        rival:<id>:charge   it began to charge a broadside        rival:<id>:down    its shields dropped       rival:<id>:ram    it turned to ram
//   rival:<id>:run      it turned to run                   rival:<id>:dead     it was destroyed         rival:<id>:gone    it got away for good
//   campRivalOf(C, id)  the ship (alive) or null         campRivalDone(C, id)  true when it is dead or gone         C.rivalEnd[id]  'dead' | 'gone' once it is over
//   campRivalMake(C, u, kind)   campSpawn builds a rival's ship with this     campRivals(C, dt)   the tick: the rows whose time has come     campRivalDied(C, u)   what campKill does when it dies

const campRivalOf = (C, id) => C.ships.find(u => u.rival && u.rival.id === id && u.hp > 0) || null;
const campRivalDone = (C, id) => !!(C.rivalEnd && C.rivalEnd[id]);
const campRivalCue = (C, u, what) => campCue(C, 'rival:' + u.rival.id + ':' + what);

// campSpawn calls this for a ship of a rival kind: the hull, the size and the way of flying and shooting of the kind (the stub flies as its base pirate; the phases are the card's next step)
function campRivalMake(C, u, kind) {
  const k = CAMP.rival.kinds[kind], d = Object.assign({}, PIRATES[k.base], { hp: k.hull, dmg: k.dmg, radar: k.color });
  Object.assign(u, { team: 'alien', faction: 'pirate', def: d, hp: k.hull * C.hpS, r: CAMP.size[kind].hit, vmax: d.max, accel: d.speed, turn: d.turn * 60, breakAt: -1 });
  u.rival = { id: '', kind, name: k.name, sh: k.shield * C.hpS, shMax: k.shield * C.hpS };
  return u;
}

// every tick: the rows whose time has come bring their rival (and its escorts)
function campRivals(C, dt) {
  const rows = C.L.rivals; if (!rows || !rows.length || C.arrivedAt == null) return;
  if (!C.rivalSt) { C.rivalSt = rows.map(() => ({ started: false })); C.rivalEnd = {}; }
  const sec = campMissionClock(C);
  rows.forEach((r, i) => {
    const st = C.rivalSt[i]; if (st.started || !CAMP.rival.kinds[r.kind]) return;
    if (!(r.on ? campWaveOn(C, r.on) : sec >= (r.at || 0))) return;
    st.started = true;
    const ahead = r.ahead != null ? campAhead(C, r) : null, car = C.carrier, org = ahead ? [ahead.x, ahead.y] : (r.from || [car.x + CAMP.rival.comeFrom, car.y]);
    const goal = r.goal || 'carrier', u = campSpawn(C, r.kind, org[0], org[1]); if (!u) return;
    u.rival.id = r.id; u.goal = goal; u.prey = r.prey || 'carrier'; u.rot = Math.atan2(car.y - u.y, car.x - u.x); u.nextShot = C.t + 1500;
    Object.keys(r.escorts || {}).forEach(kind => { for (let n = 0; n < r.escorts[kind]; n++) { const e = campSpawn(C, kind, org[0] + campBetween(C, -260, 260), org[1] + campBetween(C, -260, 260)); if (e) { e.goal = goal; e.prey = u.prey; e.rot = u.rot; e.rivalEscort = r.id; } } });
    C.events.push({ type: 'rival', stage: 'appear', id: r.id, x: u.x, y: u.y });
    campCue(C, 'rival:' + r.id + ':appear'); campSay(C, r.say, { name: u.rival.name });
  });
}
function campRivalDied(C, u) {
  if (!C.rivalEnd) C.rivalEnd = {}; C.rivalEnd[u.rival.id] = 'dead';
  C.events.push({ type: 'rival', stage: 'dead', id: u.rival.id, x: u.x, y: u.y });
  campRivalCue(C, u, 'dead'); campSay(C, 'camp.say.rival.dead', { name: u.rival.name });
}
