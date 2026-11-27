// ---------- The tag under the fighter you fly: what the other two pilots are doing (card space-game-chunk10-enter-forms-on-you; Troy, 26 Nov 2026: yes, the cloud's BRIEF 8, decision 8) ----------
// While a fighter is flown, Enter with nothing picked forms the other two pilots on it (src/camptarget.js campSelOrder), and one small word sits under the fighter: "Form up" (they guard the fighter you fly), "Guard" (they guard something
// else: the cruiser, a ship, a place), "Attack" (they are on an enemy). Nothing else in the wing's orders gets a tag (a recall, a mine, a fetch): the tag is for the three words a player gives with one key. The words are the Enter chip's own
// (camp.corner.formup, camp.corner.enter.attack, camp.corner.enter.guard): no new line.
//   campWingTag(C)        '' or the key of the word: 'camp.corner.formup' | 'camp.corner.enter.guard' | 'camp.corner.enter.attack' (pure: tests/campwingtag.mjs runs it in Node)
//   campWingTagSync(scene)  the scene half: one small text under the flown fighter, kept in scene.hud (the scene's objects go with it); called by campaignscene every frame
const CAMP_WINGTAG = { font: 11, color: '#9fe3ff', gap: 26, depth: 6 }; // the size, the pale blue of the ring that is shrunk onto a fighter taken, px of gap under the ship (on the screen), the depth over the ships (4 and 5)
function campWingTag(C) {
  const f = typeof campCockpitFlown === 'function' ? campCockpitFlown(C) : null; if (!f) return '';
  const rest = C.ships.filter(u => u.team === 'earth' && u.hp > 0 && u.kind === 'fighter' && u.id !== f.id && !u.docked && u.order);
  if (!rest.length) return '';
  if (rest.some(u => u.order.type === 'attack')) return 'camp.corner.enter.attack';
  const g = rest.filter(u => u.order.type === 'guard'); if (!g.length) return '';
  return g.every(u => u.order.at && u.order.at.id === f.id) ? 'camp.corner.formup' : 'camp.corner.enter.guard';
}
function campWingTagSync(scene) {
  const C = scene.camp, cam = scene.cameras && scene.cameras.main; if (!C || !cam || !scene.hud) return;
  const key = scene.mode === 'play' && !scene.mp ? campWingTag(C) : '', f = key ? campCockpitFlown(C) : null, sp = f && scene.sp ? scene.sp[f.id] : null;
  let t = scene.hud.wingTag; if (!key || !sp) { if (t) t.setVisible(false); return; }
  if (!t) t = scene.hud.wingTag = scene.add.text(0, 0, '', uiFont(CAMP_WINGTAG.font, CAMP_WINGTAG.color, { stroke: '#02060d', strokeThickness: 3 })).setOrigin(0.5, 0).setDepth(CAMP_WINGTAG.depth);
  const z = cam.zoom > 0 ? cam.zoom : 1, word = uiText(key);
  if (typeof campLabel === 'function') campLabel(t, word, CAMP_WINGTAG.color); else if (t.text !== word) t.setText(word); // (set only when the word changes)
  t.setScale(1 / z).setPosition(f.x, f.y + CAMP_WINGTAG.gap / z).setVisible(true); // the same size on the screen at any zoom
}
