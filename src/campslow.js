// ---------- Campaign: command time (card space-game-command-slowtime; Troy, 21 Nov 2026) ----------
// Fights were not interactive and the escorts were boring: he wants to direct the fleet more. While the FLEET, SHIP or SYSTEMS panel, the Tab map or an order-call prompt is open, the battle runs
// at a quarter of its pace (CAMP.slow.scale, Homeworld style) and a sign on the screen says so; closing the panel, the map or the call returns it to pace. Nothing else is slowed: flying between
// places, with none of them open, is as it was. It is plain functions (tests/campslowtime.mjs runs them in Node); the scene calls them (src/campaignscene.js update).
//   campSlowOpen(S)      is something that takes a command open on this scene? S.mp (the map), S.pn.open (a panel), campCallOpen(C) (a pilot's call waits: src/camporders.js, card space-game-order-calls)
//   campSlowScale(S)     the share of the battle's pace now: 1, or CAMP.slow.scale while one is open (and the battle is on: not behind a card or the pause)
//   campSlowInstall(S)   the sign (made in create); campSlowPaint(S) shows it while the battle is slowed
// The scene sets C.timeScale to the scale each frame and steps the sim by dt times it, so a clock that must count the player's own seconds (the calls' 8 s) divides dt by C.timeScale.
function campSlowOpen(S) {
  if (!S || S.mode !== 'play') return false;
  return !!(S.mp || (S.pn && typeof S.pn.open === 'string' && S.pn.open) || (S.camp && typeof campCallOpen === 'function' && campCallOpen(S.camp)));
}
const campSlowScale = S => campSlowOpen(S) ? CAMP.slow.scale : 1;
let campSlowHinted = false; // the first time in a session the battle slows, a line says why (once: the sign is there every time after)
function campSlowInstall(S) {
  if (!S || !S.add) return;
  const W = 1280, G = CAMPSLOW_LOOK;
  S.slowSign = {
    frame: S.add.graphics().setScrollFactor(0).setDepth(G.depth),
    back: S.add.rectangle(W / 2, G.y, G.w, G.h, 0x02060d, 0.9).setStrokeStyle(2, 0x7fe9ff, 1).setScrollFactor(0).setDepth(G.depth + 1).setVisible(false),
    text: S.add.text(W / 2, G.y, '', uiFont(15, '#7fe9ff', { stroke: '#02060d', strokeThickness: 3 })).setOrigin(0.5).setScrollFactor(0).setDepth(G.depth + 2).setVisible(false),
    on: false
  };
}
const CAMPSLOW_LOOK = { depth: 300, y: 20, w: 250, h: 28, edge: 0.45 }; // above the map (150 to 154) and the panels: top, in the middle, where no gauge, pip or radar sits
function campSlowPaint(S) {
  const g = S && S.slowSign; if (!g) return;
  const on = campSlowScale(S) < 1 && typeof S.hudHides === 'function' && !S.hudHides();
  if (on !== g.on) {
    g.on = on; g.back.setVisible(on); g.text.setVisible(on); g.frame.clear();
    if (on) {
      g.text.setText(uiText('camp.slow.sign', { scale: CAMP.slow.scale }));
      g.frame.lineStyle(4, 0x7fe9ff, CAMPSLOW_LOOK.edge).strokeRect(2, 2, 1276, 716); // a thin cyan frame round the screen
      if (!campSlowHinted) { campSlowHinted = true; if (typeof toast === 'function') toast(S, uiText('camp.slow.hint'), '#9fe9ff'); }
    }
  }
}
