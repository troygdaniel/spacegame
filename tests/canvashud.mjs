// not in the smoke: the boot helper's address rule for the canvas HUD (plain Node, no browser); tests/camppagehud.mjs section P runs it
// The Campaign's page HUD is ON for every player (card space-game-page-hud-default-on, 25 Nov 2026), and the boot tests were written for the canvas HUD, which is still in the code: every address gets ?pagehud=0 unless it names
// pagehud itself (a test of the page HUD says ?pagehud=1). The query goes before the #hash ('#space' becomes '?pagehud=0#space'); an address of another shape is left as it is.
export function canvasHudAddr(h = '') {
  h = String(h || ''); const i = h.indexOf('#'), q = i < 0 ? h : h.slice(0, i), frag = i < 0 ? '' : h.slice(i);
  if (/(^\?|&)pagehud(=|&|$)/i.test(q)) return h;
  if (q === '') return '?pagehud=0' + frag;
  return q.charAt(0) === '?' ? q + '&pagehud=0' + frag : h;
}
