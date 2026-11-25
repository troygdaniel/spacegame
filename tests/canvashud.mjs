// not in the smoke: the boot helper's address rule for the canvas HUD and today's ship pictures (plain Node, no browser); tests/camppagehud.mjs section P and tests/shiplook.mjs run it
// The Campaign's page HUD is ON for every player (card space-game-page-hud-default-on, 25 Nov 2026) and so is the new ship look (card space-game-ship-look-default-on, 25 Nov 2026), and the boot tests were written for the canvas HUD and today's
// pictures, which are still in the code: every address gets ?pagehud=0, ?shiplook=0 and ?worldlook=0 (the new world look, card space-game-world-w5-shield-hit) unless it names them itself (a test of the page HUD says ?pagehud=1, a test of the new look ?shiplook=1, and one that flips the switch in the page says
// ?shiplook=flag, a value that is neither on nor off, so the flag decides). The query goes before the #hash ('#space' becomes '?pagehud=0&shiplook=0&worldlook=0#space'); an address of another shape is left as it is.
export function canvasHudAddr(h = '') {
  h = String(h || ''); const i = h.indexOf('#'), q = i < 0 ? h : h.slice(0, i), frag = i < 0 ? '' : h.slice(i);
  const add = name => (new RegExp('(^\\?|&)' + name + '(=|&|$)', 'i').test(q) ? '' : name + '=0');
  const more = [add('pagehud'), add('shiplook'), add('worldlook')].filter(Boolean).join('&');
  if (!more) return h;
  if (q === '') return '?' + more + frag;
  return q.charAt(0) === '?' ? q + '&' + more + frag : h;
}
