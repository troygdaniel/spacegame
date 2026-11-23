// ---------- Campaign: a label is drawn again only when it changed (card perf-fights; Troy: "the big fights feel slow") ----------
// A Phaser Text is a small canvas that is painted and sent to the graphics card each time it is "updated". setText already does nothing when the words are the same, but setColor, setFontSize and setFontStyle
// paint and send it again EVERY call, same value or not, and the HUD sets the colour of its lines every frame (the missile count, the ore, the hull, the target, the dials' numbers): nine labels a frame were
// painted again in a fight with nothing new to show (docs/PERF-FIGHTS.md). Here those three calls do nothing when the value is the one the label already has. Nothing looks different: a label that changes is drawn
// as before. For the Campaign's scenes only; Long Haul's keep Phaser's own (it is not being changed).
//   campLabel(t, text, color)   set a label's words and colour, painting it only if one of them changed: for new drawing (a health bar's number, a ring's name), in any scene; text or color left out (undefined) is left as it is
//   CAMPTEXTGUARD.scenes   the scenes whose labels are guarded;   CAMPTEXTGUARD.skipped   how many paints were saved since the page loaded (for the measuring tools)
function campLabel(t, text, color) {
  if (!t) return t;
  if (color !== undefined && t.style && t.style.color !== color) t.setColor(color);
  if (text !== undefined) { const v = String(text); if (t.text !== v) t.setText(v); }
  return t;
}
const CAMPTEXTGUARD = { scenes: { Campaign: 1, CampHub: 1, CampWarp: 1 }, skipped: 0 };
(function () { // a page with no Phaser (a test in plain Node) has nothing to guard
  const T = typeof Phaser === 'object' && Phaser && Phaser.GameObjects && Phaser.GameObjects.Text; if (!T || T.prototype.__campGuard) return;
  const P = T.prototype, mine = t => !!(t.scene && t.scene.sys && CAMPTEXTGUARD.scenes[t.scene.sys.settings.key]);
  const guard = (name, same) => { const f = P[name]; if (typeof f !== 'function') return; P[name] = function (v) { if (arguments.length === 1 && this.style && mine(this) && same(this.style, v)) { CAMPTEXTGUARD.skipped++; return this; } return f.apply(this, arguments); }; };
  guard('setColor', (st, v) => st.color === v);
  guard('setFontStyle', (st, v) => st.fontStyle === v);
  guard('setFontSize', (st, v) => st.fontSize === (typeof v === 'number' ? v + 'px' : v));
  P.__campGuard = true;
})();
