// ---------- The cruiser's boost, the pure half (card space-game-cruiser-boost-flames; Troy, 26 Nov 2026) ----------
// Hold Shift with thrust and the cruiser surges above its top speed while an energy store drains; the store refills after a pause; empty locks the boost until a quarter is back. Modelled on the Long Haul's src/boost.js
// (BOOST: drain, pause, back; its `fall`: the top speed comes down at a rate, never a wall), with the heavy ship's own numbers in CAMP.boost (src/campaign.js). No dodge dash. The turn rate, the plain thrust and the top speed
// are not touched when the boost is off: campBoostStep answers { top: 1, acc: 1 } and the cruiser's step multiplies by 1. No Phaser here (tests/campboost.mjs runs it in Node).
//   campBoostNew()             the state: { en (the store), locked, on (boosting now), until (ms: the refill waits for it), top (the top speed's multiplier now: 1 to CAMP.boost.speed), th (the thrust, smoothed), flare (0 to 1, a brief flare when thrust starts), fx (0 to 1, the boost's flame, smoothed) }
//   campBoostStep(C, th, dt)   once a frame from campCarrier: C.input.boost is the key; th the thrust 0 to 1; dt seconds; -> { top, acc } multipliers of the top speed and the thrust
//   campBoostStatus(C)         what the page HUD shows: { frac (the store 0 to 1), on, locked }
//   campFlameState(C)          what the engine flames show: { th (0 to 1), boost (0 to 1), flare (0 to 1) }
const campBoostNew = () => ({ en: CAMP.boost.max, locked: false, on: false, until: 0, top: 1, th: 0, flare: 0, fx: 0 });
function campBoostStep(C, th, dt) {
  const B = CAMP.boost, S = C.boost || (C.boost = campBoostNew());
  const want = !!B.on && !!C.input.boost && th > 0 && !(C.nav && C.nav.on); // the autopilot's own burn is not the boost
  const ok = want && !S.locked && S.en > 0;
  S.on = ok;
  if (ok) {
    S.en = Math.max(0, S.en - B.drain * dt); S.until = C.t + B.pause;
    if (S.en <= 0) { S.locked = true; C.events.push({ type: 'boost', stage: 'dry' }); } // empty: locked until a quarter is back (the scene plays the dry click)
  } else if (C.t >= S.until) S.en = Math.min(B.max, S.en + B.regen * dt);
  if (S.locked && S.en >= B.max * B.back) S.locked = false;
  const target = ok ? B.speed : 1;
  S.top = target >= S.top ? target : Math.max(target, S.top - B.fall / CAMP.carrier.speed * dt); // up at once, down at `fall` px/s each second
  S.flare = th > 0 && S.th <= 0.02 ? 1 : Math.max(0, S.flare - dt * 3); // a brief flare when thrust starts (about a third of a second)
  S.th += (th - S.th) * Math.min(1, dt * 8);
  S.fx += ((ok ? 1 : 0) - S.fx) * Math.min(1, dt * 10);
  return { top: S.top, acc: ok ? B.accel : 1 };
}
const campBoostStatus = C => { const S = C && C.boost, B = CAMP.boost; return { frac: S ? Math.max(0, Math.min(1, S.en / B.max)) : 1, on: !!(S && S.on), locked: !!(S && S.locked) }; };
const campFlameState = C => { const S = C && C.boost; return { th: S ? S.th : 0, boost: S ? S.fx : 0, flare: S ? S.flare : 0 }; };
