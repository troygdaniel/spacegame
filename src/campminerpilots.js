// ---------- 1.2: taking the stick sends the other two pilots to guard a miner each (card space-game-b12-c10-12-pilots-guard-miners; Troy, 27 Nov 2026: yes; the cloud's BRIEF 12 chunk 10, docs/next-chunks.html) ----------
// In 1.2 the pilots mine and the raiders go for the two miners. When the player takes the stick of one pilot (C, src/campcockpit.js campCockpitTake) the other two used to stay with the cruiser. Now, in a mission whose row says
// pilotsGuardMiners, each of the other two pilots that is out goes to guard one miner (the first to Miner 1, the second to Miner 2, by squad order red, green, yellow): the game's own guard order (campWingOrder 'guard' on a squad and a
// ship), so they fly beside it, meet what comes near it and go back to the cruiser when it is safe or lost (campWingGuardStep, src/campwing.js). It is done only while the player has given NO pilot an order since the mission began:
// an order of his (attack, escort, guard, recall, mine, fetch, hold) is his say, and a take then leaves the pilots where he put them.
//   campPilotOrdersGiven(C)   the pilots' orders the player (or a bot) has given so far: the counters of C.orders for those verbs. This file's own orders are taken back out of the counter, so they are never "an order of his"
//   campMinerPilots(C)         the rule, called once by campCockpitTake after the stick is taken; returns the number of pilots sent. Notes them in C.minerPilotsNote ({ at, items: [{ who, target }] }) for the sentence line
//   campMinerPilotsLine(C, t)  the sentence line's words for the note (src/camporderline.js campOrderLineNow): each order for CAMP.orderLine.each ms in turn, "Kara  guard  Miner 1  ✓", or null when it is over
// Pure rule, no Phaser: tests/campminerpilots.mjs.
const CAMP_PILOT_VERBS = ['attack', 'escort', 'guard', 'recall', 'mine', 'fetch', 'hold']; // the orders that address pilots (a launch, a power change or the cruiser's own orders do not)
const campPilotOrdersGiven = C => C && C.orders ? CAMP_PILOT_VERBS.reduce((n, k) => n + (C.orders[k] | 0), 0) : 0;
function campMinerPilots(C) {
  if (!C || !C.L || !C.L.pilotsGuardMiners || !CAMP.flags.pilotsguard || C.result || campPilotOrdersGiven(C) > 0) return 0;
  const squads = (CAMP.wing && CAMP.wing.squads) || ['red', 'green', 'yellow'];
  const pilots = C.ships.filter(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0 && !u.cockpit && !u.docked && u.squad).sort((a, b) => squads.indexOf(a.squad) - squads.indexOf(b.squad)); // the pilots that are out, but not the one he flies
  const miners = C.ships.filter(u => u.team === 'neutral' && u.kind === 'miner' && u.hp > 0).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const items = [];
  for (let i = 0; i < pilots.length && i < miners.length; i++) {
    const p = pilots[i], m = miners[i], r = campWingOrder(C, p.squad, 'guard', m.id, 'auto', false);
    if (!r || !r.ok) continue;
    C.orders.guard = Math.max(0, (C.orders.guard | 0) - 1); // not an order of his: the counter (it brings the squares back, ends the nudges, shows the sentence's check) is as it was
    items.push({ who: typeof campSelLabel === 'function' ? campSelLabel(CAMP_SELPILOT + p.squad) : p.squad, target: String(m.cname || m.name || m.id) }); // (the miners' own words: cname, "Miner 1", as the friends' list says it)
  }
  C.minerPilotsNote = items.length ? { at: +C.t || 0, items } : null;
  return items.length;
}
function campMinerPilotsLine(C, t) { // the line for the note now, or null (see campOrderLineNow)
  const N = C && C.minerPilotsNote; if (!N || !N.items.length) return null;
  const each = CAMP.orderLine.each, age = t - N.at, i = Math.floor(age / each); if (!(age >= 0) || i >= N.items.length) return null;
  const it = N.items[i], last = i === N.items.length - 1, left = each - (age - i * each), fade = CAMP.mark.fade; // the last one fades out as the others' strength is kept
  return { who: { t: it.who, ghost: false }, verb: { t: String(uiText('camp.corner.enter.guard')).toLowerCase(), kind: 'guard' }, target: { t: it.target, ghost: false, kind: 'friendly' }, ok: true, why: '', pick: true, alt: null, swapped: false, tip: { id: '', text: '' },
    a: last && left < fade ? Math.max(0, left / fade) : 1, check: true };
}
