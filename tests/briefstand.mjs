// not in the smoke: a library the scene tests import (campbrief, camphubscene, campdock, campreplay), not a test
// the stand-in the scene tests add so the ready room can open its big briefing without Phaser (card space-game-campaign-briefing; src/campbriefdraw.js)
// Pass the scene to __briefStand(s) after its own s.add is set: it gives every object setScrollFactor and a size, and adds s.add.graphics (a recorder: any call is kept in g.calls and answers the recorder itself) and s.add.rectangle that takes setInteractive.
export const BRIEF_STAND = `
  window.__briefStand = s => {
    const add = s.add, wrap = f => (...a) => { const o = f(...a); if (o && typeof o === 'object') { o.setScrollFactor = o.setScrollFactor || function () { return o; }; o.width = o.width || 60; o.height = o.height || 14; o.setOrigin = o.setOrigin || function () { return o; }; o.setDepth = o.setDepth || function () { return o; }; o.setInteractive = function () { return o; }; o.setTint = o.setTint || function () { return o; }; o.setScale = o.setScale || function () { return o; }; o.setRotation = o.setRotation || function () { return o; }; o.setAlpha = o.setAlpha || function () { return o; }; o.setText = o.setText || function (v) { o.t = v; return o; }; o.setPosition = o.setPosition || function (x, y) { o.x = x; o.y = y; return o; }; o.destroy = function () { o.gone = true; if (window.__rec && __rec.texts) { const i = __rec.texts.indexOf(o); if (i >= 0) __rec.texts.splice(i, 1); } }; } return o; };
    if (add.rectangle) add.rectangle = wrap(add.rectangle); if (add.text) add.text = wrap(add.text); if (add.image) add.image = wrap(add.image);
    add.graphics = () => { const calls = []; const g = new Proxy({ calls, destroy() { g.gone = true; } }, { get: (t, k) => (k in t ? t[k] : (k === 'setScrollFactor' || k === 'setDepth' ? () => g : (...a) => { calls.push(String(k)); return g; })) }); return g; };
    window.__graphics = []; const mk = add.graphics; add.graphics = () => { const g = mk(); __graphics.push(g); return g; };
    return s;
  };
`;
