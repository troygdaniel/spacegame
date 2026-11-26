// ---------- Campaign: what the lose card says (card space-game-night-ux, finding 3; docs/night/ux.md) ----------
// The lose card was one line, "The carrier is lost." or "Earth's shield has failed.", and "Enter try again". A retry costs nothing, so the missing half was the advice, and how far
// the player got. campLoseLines(C, why) is the card's lines, pure (the battle in, plain words out): what happened, how long it lasted and how far (the wave, the aliens down), and one
// thing to try. A reason with no tip of its own (the debug key's) has the first two lines only; a reason with no words at all is said as "lost", never as a raw key.
//   campLoseLines(C, why) -> [cause, reached, tip?]       src/campaignscene.js showLost shows them all and says the cause and the tip (the numbers are for reading)
const campClock = ms => { const t = Math.max(0, Math.round(ms / 1000)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
function campLoseLines(C, why, fill) { // fill (optional): extra words for the tip's placeholders (the new look cuts the tip at its key chips: src/scrcards.js scrTipSegments)
  const has = k => uiText(k) !== k, w = String(why || '').replace(/[^a-z]/g, '');
  const word = ((C && C.L && C.L.objectives) || []).map(o => o.word).find(Boolean) || '', key = k => word && has(k + '.' + word) ? k + '.' + word : k; // a mission that delivers one named ship says so (1.1's transport): camp.lose.convoy.transport before camp.lose.convoy, and the tip the same way
  const out = [has('camp.lose.' + w) ? uiText(key('camp.lose.' + w)) : uiText('camp.lose.other')];
  try {
    const L = (C.L || CAMP.levels[C.level]);
    out.push(uiText('camp.lose.reached', { time: campClock(C.t), wave: typeof campWaveCount === 'function' ? campWaveCount(C).n : C.waves.filter(x => x.started).length, total: typeof campWaveCount === 'function' ? campWaveCount(C).total : L.waves.length, kills: C.kills }));
  } catch (e) { /* no battle: the cause alone */ }
  const towers = w === 'carrier' && C && ((C.L || CAMP.levels[C.level]) || {}).win === 'towers'; // the tower missions: the tip that helps against towers
  if (towers && has('camp.lose.tip.towers')) out.push(uiText('camp.lose.tip.towers', fill));
  else if (has('camp.lose.tip.' + w)) out.push(uiText(key('camp.lose.tip.' + w), fill));
  return out;
}
