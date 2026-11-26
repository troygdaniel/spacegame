// not in the smoke: the boot helper's address rule for the canvas HUD and today's ship pictures (plain Node, no browser); tests/camppagehud.mjs section P and tests/shiplook.mjs run it
// The Campaign's page HUD is ON for every player (card space-game-page-hud-default-on, 25 Nov 2026) and so is the new ship look (card space-game-ship-look-default-on, 25 Nov 2026), and the boot tests were written for the canvas HUD and today's
// pictures, which are still in the code: every address gets ?pagehud=0, ?shiplook=0 and ?worldlook=0 unless it names them itself (a test of the page HUD says ?pagehud=1, a test of the new look ?shiplook=1, and one that flips the switch in the page says
// ?shiplook=flag, a value that is neither on nor off, so the flag decides). The query goes before the #hash ('#space' becomes '?pagehud=0&shiplook=0#space'); an address of another shape is left as it is.
// A BOOT TEST (tests/*-boot.mjs) IS RUN WITH WHAT A PLAYER HAS (card space-game-boots-after-looks): the address is left as it is, so the page HUD, the new ship look and the world look are on; a boot that is about the old canvas names ?pagehud=0
// (or ?shiplook=0, ?worldlook=0) in its own address, which wins as above. The environment says otherwise for a run: CAMP_LOOKS=old is the rule above for a boot too, CAMP_LOOKS=defaults is the same as a boot's own, CAMP_LOOKS=screens is the defaults
// with ?screens=1 added (the new screens around the flight: what the screens' default-on will be). Every other test that opens the page (the playtests, the picture checks) keeps the rule above.
// CAMP_LOOKS is a list of words, comma between: `old` (a boot gets the rule above too), `defaults` (the address as it is: what a boot has), `screens` (adds ?screens=1: the new screens around the flight) and `fill` (adds ?fill=1: the flight takes the window's shape);
// `screens,fill` is both (card space-game-boots-fill-screens: both switches are to become the default, so the boots must pass with them on). An address that names one of them keeps its own.
export function canvasHudAddr(h = '') {
  const boot = typeof process !== 'undefined' && process.argv && /-boot\.mjs$/.test(String(process.argv[1] || '')); // a boot test (tests/*-boot.mjs) is run with what a player has: the defaults, unless CAMP_LOOKS says otherwise
  const env = typeof process !== 'undefined' && process.env && process.env.CAMP_LOOKS ? String(process.env.CAMP_LOOKS) : '';
  const words = (env || (boot ? 'defaults' : '')).split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
  const oldRule = !words.length || words.indexOf('old') >= 0;
  h = String(h || ''); const i = h.indexOf('#'), q = i < 0 ? h : h.slice(0, i), frag = i < 0 ? '' : h.slice(i);
  const named = name => new RegExp('(^\\?|&)' + name + '(=|&|$)', 'i').test(q);
  const more = (oldRule ? ['pagehud', 'shiplook', 'worldlook'].filter(k => !named(k)).map(k => k + '=0') : []).concat(['screens', 'fill'].filter(k => words.indexOf(k) >= 0 && !named(k)).map(k => k + '=1')).join('&');
  if (!more) return h;
  if (q === '') return '?' + more + frag;
  return q.charAt(0) === '?' ? q + '&' + more + frag : h;
}
