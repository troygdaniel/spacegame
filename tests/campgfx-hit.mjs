// smoke: when the carrier is hit its picture blinks red for a moment and the blink is cleared; a hit on another ship does not blink the carrier (plain Node, no Chrome)
// [night] graphics, the blind critic's picture 07: the only sign of damage was a thin bar going red. The scene is Phaser's: onEvent is called on a stand-in that records the tint, the clock calls and the camera shake.
// Run: node tests/campgfx-hit.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e})`));
const run = J(`(() => {
  const sprite = () => ({ tint: null, setTint(c) { this.tint = c; return this; }, clearTint() { this.tint = null; return this; } });
  const carrier = sprite(), other = sprite(), later = [], shakes = [], booms = [];
  const sc = { camp: { carrier: { id: 'c1', x: 5, y: 6 } }, sp: { c1: carrier, f2: other }, cameras: { main: { shake: (...a) => shakes.push(a) } }, boom: { explode: (...a) => booms.push(a) },
    time: { delayedCall: (ms, fn) => later.push({ ms, fn }) }, flash: Campaign.prototype.flash };
  Campaign.prototype.onEvent.call(sc, { type: 'hit', id: 'c1', x: 5, y: 6 });
  const afterHit = { tint: carrier.tint, queued: later.map(l => l.ms), shakes: shakes.length, booms: booms.length };
  later.forEach(l => l.fn()); const afterClear = carrier.tint;
  Campaign.prototype.onEvent.call(sc, { type: 'hit', id: 'f2', x: 9, y: 9 });
  const fighterHit = { carrier: carrier.tint, fighter: other.tint, queued: later.length - 1, booms: booms.length };
  const gone = (() => { try { Campaign.prototype.onEvent.call({ ...sc, sp: {} }, { type: 'hit', id: 'c1', x: 1, y: 1 }); return 'ok'; } catch (e) { return e.message; } })();
  const dead = sprite(); dead.clearTint = () => { throw new Error('touched a destroyed picture'); }; const dsc = { ...sc, sp: { c1: dead }, time: { delayedCall: (ms, fn) => { dead.active = false; try { fn(); dead.result = 'ok'; } catch (e) { dead.result = e.message; } } } };
  Campaign.prototype.onEvent.call(dsc, { type: 'hit', id: 'c1', x: 1, y: 1 });
  return { afterHit, afterClear, fighterHit, gone, destroyed: dead.result };
})()`);
const c = run.afterHit.tint;
check('a hit on the carrier tints it red (red channel full, green and blue lower)', typeof c === 'number' && ((c >> 16) & 255) === 255 && ((c >> 8) & 255) < 200 && (c & 255) < 200, String(c && c.toString(16)));
check('the blink is short: one timer, 150 ms or less', run.afterHit.queued.length === 1 && run.afterHit.queued[0] <= 150, run.afterHit.queued.join(','));
check('the old effects are still there: the camera shakes and a spark is drawn', run.afterHit.shakes === 1 && run.afterHit.booms === 1);
check('when the timer runs the tint is cleared', run.afterClear === null);
check('a hit on another ship does not blink the carrier and queues no blink', run.fighterHit.carrier === null && run.fighterHit.fighter === null && run.fighterHit.queued === 0);
check('a hit on a ship whose picture is gone does not throw', run.gone === 'ok', run.gone);
check('a picture destroyed within the 90 ms (the carrier died) is left alone when the timer runs', run.destroyed === 'ok', run.destroyed);
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);
