// ---------- Fuel: the tank, the pump at a station, the price of a jump, the fuel ranger (docs/UNIVERSE.md section 3) ----------
// Every ship carries its own fuel (rec.fuel in the fleet record, saved by meta.js); its tank is shipStat('tank') (src/fleet.js).
// A jump will cost distLy x shipStat('fuelPerLy') units (jumpCost below); nothing spends fuel yet, so for now it only changes at
// the pump: a terminal in the Station scene sells it by the unit, at the price in the station's data (dock.fuel in
// src/data_systems.js; a station with no dock.fuel has no pump). Troy's rule: fuel is a real decision, never a soft lock, so
// there is a fuel ranger for a pilot stranded in a system with no pump: it arrives in 45 s, brings 10 units (more when
// the ship's cheapest jump out of the system costs more), charges three times the home price and never more than all your credits.
//   fuelTank(rec) fuelHave(rec) fuelFrac(rec) fuelState(rec)   the numbers and 'ok' | 'low' | 'crit'; rec defaults to the active ship
//   fuelPrice(stationId)                          credits a unit, or null when the station has no pump
//   jumpCost(from, to, rec)                       units a jump between two systems burns, or null when one is not known
//   jumpCheapestOut(from, rec)                    the least a jump out of a system costs this ship, to a star it knows and can reach; null when none
//   jumpCheck(from, to, rec)                      { ok, why: 'unknown' | 'range' | 'fuel' | null, cost, have, short, ly }
//   pumpQuote(stationId, rec)                     what the terminal offers: half a tank, a full tank, what each costs
//   pumpBuy(mode, stationId, rec)                 'half' or 'full': pays and fills as far as credits allow
//   fuelBurn(units, rec)                          a jump's fuel, taken when its charge completes (src/jump.js)
//   rangerUnits(rec)                              what the ranger brings: 10 units, or the ship's cheapest jump out of here when that costs more
//   rangerCall(now) / rangerTick(now)             the fuel ranger, driven by the Space scene (src/jump.js)
//   buildPump(s) openPump(s) closePump(s) pumpFrame(s)   the terminal in the Station scene

const FUEL = {
  low: 0.25, crit: 0.10,                    // the chip turns amber under a quarter of the tank and red and beating under a tenth
  homePrice: 8,                             // credits a unit at Halcyon (section 3); the ranger's price is a multiple of it
  ranger: { secs: 45, units: 10, mult: 3 }  // wait, units delivered, price multiple
};

// ---------- the numbers ----------
const fuelTank = rec => shipStat('tank', rec);
function fuelHave(rec) { rec = rec || activeShip(); return Math.max(0, Math.min(rec.fuel, fuelTank(rec))); }
function fuelFrac(rec) { const t = fuelTank(rec); return t > 0 ? fuelHave(rec) / t : 0; }
const fuelRound = v => Math.round(v * 10) / 10; // fuel is kept to a tenth of a unit
// 'ok', 'low' (under a quarter of the tank) or 'crit' (under a tenth): the chip's colour and the warning level
function fuelState(rec) { const f = fuelFrac(rec); return f < FUEL.crit ? 'crit' : f < FUEL.low ? 'low' : 'ok'; }

// the station a pump belongs to, found in any system; { body, system } or null
function fuelStation(stationId) {
  for (const id of Object.keys(SYSTEMS)) {
    const b = SYSTEMS[id].bodies.find(x => x.type === 'station' && x.id === stationId);
    if (b) return { body: b, system: id };
  }
  return null;
}
function fuelPrice(stationId) {
  const f = fuelStation(stationId);
  return f && f.body.dock && f.body.dock.fuel > 0 ? f.body.dock.fuel : null;
}
// does this system have a pump anywhere in it?
const fuelSystemHasPump = sysId => (SYSTEMS[sysId] ? SYSTEMS[sysId].bodies : []).some(b => b.type === 'station' && b.dock && b.dock.fuel > 0);

// ---------- what a jump costs ----------
function distLy(a, b) { // light years between two systems on the galaxy map; null when either is not known (src/universe.js has no other table of positions)
  const A = SYSTEMS[a], B = SYSTEMS[b];
  return A && B && A.ly && B.ly ? Math.hypot(A.ly[0] - B.ly[0], A.ly[1] - B.ly[1]) : null;
}
function jumpCost(from, to, rec) {
  const ly = distLy(from, to);
  return ly === null ? null : fuelRound(ly * shipStat('fuelPerLy', rec));
}
function jumpCheck(from, to, rec) {
  rec = rec || activeShip();
  const ly = distLy(from, to), have = fuelHave(rec);
  if (ly === null) return { ok: false, why: 'unknown', cost: null, have, short: 0, ly: null };
  const cost = jumpCost(from, to, rec);
  if (ly > shipStat('range', rec) + 1e-9) return { ok: false, why: 'range', cost, have, short: 0, ly };
  if (cost > have + 1e-9) return { ok: false, why: 'fuel', cost, have, short: fuelRound(cost - have), ly };
  return { ok: true, why: null, cost, have, short: 0, ly };
}

// the least a jump out of `from` costs this ship, to a star it knows and can reach (G.known, within its range); null when there is none
function jumpCheapestOut(from, rec) {
  rec = rec || activeShip();
  let best = null;
  (G.known || []).forEach(id => {
    if (id === from) return;
    const ly = distLy(from, id);
    if (ly === null || ly > shipStat('range', rec) + 1e-9) return;
    const c = jumpCost(from, id, rec);
    if (c !== null && (best === null || c < best)) best = c;
  });
  return best;
}

// ---------- the pump ----------
const pumpCost = (units, price) => Math.ceil(units * price - 1e-9);
function pumpQuote(stationId, rec) {
  rec = rec || activeShip();
  const price = fuelPrice(stationId);
  if (price === null) return null;
  const tank = fuelTank(rec), room = fuelRound(tank - fuelHave(rec));
  const half = fuelRound(Math.min(room, tank / 2));
  return { price, tank, have: fuelHave(rec), room, half: { units: half, cost: pumpCost(half, price) }, full: { units: room, cost: pumpCost(room, price) } };
}
// buys half a tank or fills it. With too few credits it buys as much as they pay for (to a tenth of a unit), as the repair bay does
function pumpBuy(mode, stationId, rec) {
  rec = rec || activeShip();
  const q = pumpQuote(stationId, rec);
  if (!q) return { ok: false, why: 'nopump', units: 0, cost: 0 };
  const want = mode === 'half' ? q.half.units : q.full.units;
  if (want <= 0) return { ok: false, why: 'full', units: 0, cost: 0 };
  if (G.credits < q.price * 0.1) return { ok: false, why: 'broke', units: 0, cost: 0, need: pumpCost(Math.min(want, 0.1), q.price) };
  const afford = fuelRound(Math.floor(G.credits / q.price * 10) / 10), units = Math.min(want, afford), cost = pumpCost(units, q.price);
  G.credits -= cost; rec.fuel = fuelRound(Math.min(fuelTank(rec), fuelHave(rec) + units));
  return { ok: true, why: null, units, cost, partial: units < want };
}

// a jump burns its fuel when the charge completes (src/jump.js); a tank never goes below 0 and the sum is rounded as everything else here is
function fuelBurn(units, rec) {
  rec = rec || activeShip();
  rec.fuel = fuelRound(Math.max(0, fuelHave(rec) - Math.max(0, units)));
  return rec.fuel;
}

// ---------- the fuel ranger ----------
const FUELST = { rangerAt: 0 }; // when the ranger arrives, on the caller's clock (ms); 0 = nobody called. Not saved: a reload cancels the call
// What the ranger brings, and the level under which it comes: 10 units, or the cheapest jump out of this system for this ship when that costs
// more (a Bastion burns 2 units a ly, Kestrel to Halcyon is 12.5: ten units would leave it short and the next call refused). 10 when no jump is known.
function rangerUnits(rec) {
  rec = rec || activeShip();
  const out = jumpCheapestOut(G.system, rec);
  return out === null ? FUEL.ranger.units : Math.max(FUEL.ranger.units, out);
}
// Allowed when this system has no pump, you hold less than the ranger brings (rangerUnits), and nobody has been called yet. now: the caller's clock, ms.
function rangerCall(now) {
  const rec = activeShip();
  if (FUELST.rangerAt) return { ok: false, why: 'called', eta: Math.max(0, FUELST.rangerAt - now) };
  if (fuelSystemHasPump(G.system)) return { ok: false, why: 'pump' };
  if (fuelHave(rec) >= rangerUnits(rec)) return { ok: false, why: 'enough' };
  FUELST.rangerAt = now + FUEL.ranger.secs * 1000;
  const q = rangerQuote(rec);
  return { ok: true, why: null, eta: FUEL.ranger.secs * 1000, units: q.units, cost: q.cost };
}
function rangerQuote(rec) {
  rec = rec || activeShip();
  const units = fuelRound(Math.min(rangerUnits(rec), fuelTank(rec) - fuelHave(rec))), price = FUEL.homePrice * FUEL.ranger.mult;
  return { units, price, cost: Math.min(pumpCost(units, price), Math.max(0, G.credits)) }; // never more than all your credits
}
// Once per frame while in space. Returns { units, cost } on the frame the ranger arrives, else null.
function rangerTick(now) {
  if (!FUELST.rangerAt || now < FUELST.rangerAt) return null;
  FUELST.rangerAt = 0;
  const rec = activeShip(), q = rangerQuote(rec);
  G.credits -= q.cost; rec.fuel = fuelRound(Math.min(fuelTank(rec), fuelHave(rec) + q.units)); // even at 0 credits it brings the fuel: nobody is left stranded
  return { units: q.units, cost: q.cost };
}

// ---------- the terminal in the Station scene ----------
const PUMP = { x: 785, y: 170, w: 100, h: 44, color: 0x9fe9ff, css: '#9fe9ff' }; // the upper deck, between the repair bay and the hangar wall

function buildPump(s) {
  s.pumpOpen = false;
  s.pumpKeys = s.input.keyboard.addKeys('ONE,TWO,ESC');
  const st = fuelStation(G.lastDock);
  if (!st || !(st.body.dock && st.body.dock.fuel > 0)) return; // no pump at this station
  s.pumpStation = st.body.id;
  const r = rectWall(s, PUMP.x - PUMP.w / 2, PUMP.y - 22, PUMP.w, PUMP.h, 0x0d2a3f, PUMP.color); s.walls.push(r);
  label(s, PUMP.x, PUMP.y + 18, 'FUEL PUMP', PUMP.css, 11); // the nameplate on the front of the desk, as the other terminals have
  drawPump(s);
  s.spots.push({ x: PUMP.x, y: PUMP.y, text: 'FUEL PUMP', key: 'pump', prompt: 'Buy fuel', color: PUMP.css, dy: 74 });
  s.pumpUI = panel(s, { w: 760, h: 380, title: 'FUEL PUMP  -  ' + st.body.name.toUpperCase(), color: PUMP.color, dim: true, depth: 160 });
  s.pumpBox = s.pumpUI.box.setVisible(false); s.pumpObjs = [];
  s.pumpMsg = s.add.text(0, 118, '', uiFont(16, '#ffd37a')).setOrigin(0.5);
  s.pumpBox.add(s.pumpMsg);
  s.pumpUI.setHints([['1', 'Half tank'], ['2', 'Fill tank'], ['Esc', 'Close']]);
}

// the pump on its desk: a tank with a glowing cell, a gauge, a hose to a nozzle (shapes only, like the rest of the interior)
function drawPump(s) {
  const g = s.add.graphics().setDepth(2), x = PUMP.x, y = PUMP.y + 6;
  g.fillStyle(0x06121e, 1); g.fillRoundedRect(x - 40, y - 34, 28, 36, 6);        // the tank
  g.fillStyle(PUMP.color, 0.16); g.fillRoundedRect(x - 44, y - 38, 36, 44, 8);   // its glow
  g.fillStyle(PUMP.color, 0.75); g.fillRoundedRect(x - 35, y - 26, 18, 22, 3);   // the cell
  g.fillStyle(0xffffff, 0.3); g.fillRect(x - 35, y - 26, 18, 5);
  g.lineStyle(2, PUMP.color, 1); g.strokeRoundedRect(x - 40, y - 34, 28, 36, 6);
  g.lineStyle(2, 0x5b7a92, 1); g.strokeCircle(x + 4, y - 22, 9);                  // the gauge
  g.lineStyle(2, AMBER, 1); g.lineBetween(x + 4, y - 22, x + 9, y - 27);
  g.lineStyle(4, 0x2a4a66, 1); g.beginPath(); g.moveTo(x - 12, y - 8); g.lineTo(x + 12, y - 8); g.lineTo(x + 20, y - 18); g.strokePath(); // the hose
  g.fillStyle(0xb6c6d6, 1); g.fillRect(x + 16, y - 26, 10, 12);                  // the nozzle
  g.fillStyle(PUMP.color, 1); g.fillRect(x + 22, y - 24, 4, 4);
  return g;
}

function openPump(s) {
  if (!s.pumpBox) return;
  hideTalk(s); s.prompt.setText(''); s.pumpOpen = true; s.panel = true; s.pumpBox.setVisible(true); // s.panel: the pause menu ignores Esc while a terminal is open
  s.pumpMsg.setText('Pay by the unit. It goes in at once.').setColor('#ffd37a');
  refreshPump(s); sfx('click');
}
function closePump(s) {
  s.pumpOpen = false; s.panel = false;
  if (s.pumpBox) s.pumpBox.setVisible(false);
  (s.pumpObjs || []).forEach(o => o.destroy()); s.pumpObjs = [];
}

function refreshPump(s, paid) {
  (s.pumpObjs || []).forEach(o => o.destroy()); s.pumpObjs = [];
  const q = pumpQuote(s.pumpStation);
  crTag(s, s.pumpUI, G.credits, paid); // src/ui.js: coin and gold N CR
  const add = o => { s.pumpBox.add(o); s.pumpObjs.push(o); return o; };
  const txt = (x, y, str, size, color, style, ox) => add(s.add.text(x, y, str, uiFont(size, color, style)).setOrigin(ox === undefined ? 0 : ox, 0.5));
  const frac = q.tank > 0 ? q.have / q.tank : 0, col = frac < FUEL.crit ? RED : frac < FUEL.low ? AMBER : CYAN;
  // the tank
  txt(-330, -128, 'TANK', 11, '#5b7a92');
  const g = add(s.add.graphics()); hudBar(g, -330, -112, 520, 18, frac, col, 40);
  txt(210, -103, q.have.toFixed(1) + ' / ' + q.tank + ' units', 16, '#e8f6ff', { fontStyle: 'bold' });
  txt(-330, -76, q.price + ' cr a unit', 14, '#9fe9ff');
  txt(330, -76, 'A full tank at the pump never costs more than ' + Math.ceil(q.tank * q.price) + ' cr', 12, '#5b7a92', null, 1);
  // two offers
  [['half', 'HALF TANK', q.half, 1], ['full', 'FILL TANK', q.full, 2]].forEach(([mode, name, o, n], i) => {
    const cx = (i - 0.5) * 330, cy = 18, w = 310, h = 150, L = cx - w / 2 + 16;
    const none = o.units <= 0, can = !none && G.credits >= o.cost, part = !none && !can && G.credits >= q.price * 0.1;
    const edge = none ? 0x3a5a78 : can ? AMBER : part ? AMBER : 0x3a5a78;
    const gg = add(s.add.graphics());
    hudPanel(gg, cx - w / 2, cy - h / 2, w, h, 14, 1, edge);
    const cap = keyCap(s, String(n), can || part ? AMBER : CYAN); cap.setPosition(L + cap.kw / 2, cy - h / 2 + 26); add(cap);
    txt(L + cap.kw + 10, cy - h / 2 + 26, name, 16, none ? '#6b8296' : '#ffd37a', { fontStyle: 'bold' });
    txt(L, cy - h / 2 + 62, none ? 'Tank is full' : '+' + o.units.toFixed(1) + ' units', 18, none ? '#6dff9c' : '#cfefff');
    if (!none) {
      txt(L, cy - h / 2 + 104, o.cost + ' cr', 28, can ? '#ffb454' : part ? '#ffb454' : '#ff4d6d', { fontStyle: 'bold' });
      if (!can) txt(L + 120, cy - h / 2 + 108, part ? 'as much as you can pay for' : 'Need ' + (o.cost - G.credits) + ' more', 12, part ? '#ffd37a' : '#ff4d6d');
    }
    const z = add(s.add.rectangle(cx, cy, w, h, 0x000000, 0.001).setInteractive({ useHandCursor: true }));
    z.on('pointerdown', () => buyFuel(s, mode));
  });
}

function buyFuel(s, mode) {
  const r = pumpBuy(mode, s.pumpStation), say = (m, c) => s.pumpMsg.setText(m).setColor(c);
  if (!r.ok) {
    if (r.why === 'full') say('The tank is already full.', '#9fe9ff');
    else say('You have no credits for fuel.', '#ff4d6d');
    beep(r.why === 'full' ? 260 : 140, r.why === 'full' ? 0.08 : 0.15, r.why === 'full' ? 'square' : 'sawtooth', 0.03, r.why === 'full' ? 0 : -40);
  } else {
    say((r.partial ? 'Partly filled: ' : 'Filled: ') + '+' + r.units.toFixed(1) + ' units (-' + r.cost + ' cr).', '#6dff9c'); sfx('fuelPump');
  }
  refreshPump(s, r.ok && r.cost > 0);
}

// once per frame from Station.update; true = the pump panel owns this frame
function pumpFrame(s) {
  if (!s.pumpOpen) return false;
  const JD = Phaser.Input.Keyboard.JustDown, k = s.pumpKeys;
  s.player.setVelocity(0, 0);
  if (JD(k.ESC)) closePump(s);
  else if (JD(k.ONE)) buyFuel(s, 'half');
  else if (JD(k.TWO)) buyFuel(s, 'full');
  return true;
}
