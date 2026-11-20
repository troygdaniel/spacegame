// ---------- Campaign: what the lose card says (card space-game-night-ux, finding 3; docs/night/ux.md) ----------
// The lose card was one line, "The carrier is lost." or "Earth's shield has failed.", and "Enter try again". A retry costs nothing, so the missing half was the advice, and how far
// the player got. campLoseLines(C, why) is the card's lines, pure (the battle in, plain words out): what happened, how long it lasted and how far (the wave, the aliens down), and one
// thing to try. A reason with no tip of its own (the debug key's) has the first two lines only; a reason with no words at all is said as "lost", never as a raw key.
//   campLoseLines(C, why) -> [cause, reached, tip?]       src/campaignscene.js showLost shows them all and says the cause and the tip (the numbers are for reading)
const campClock = ms => { const t = Math.max(0, Math.round(ms / 1000)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
function campLoseLines(C, why) {
  const has = k => uiText(k) !== k, w = String(why || '').replace(/[^a-z]/g, '');
  const out = [has('camp.lose.' + w) ? uiText('camp.lose.' + w) : uiText('camp.lose.other')];
  try {
    const L = CAMP.levels[C.level];
    out.push(uiText('camp.lose.reached', { time: campClock(C.t), wave: C.waves.filter(x => x.started).length, total: L.waves.length, kills: C.kills }));
  } catch (e) { /* no battle: the cause alone */ }
  if (has('camp.lose.tip.' + w)) out.push(uiText('camp.lose.tip.' + w));
  return out;
}
