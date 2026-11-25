// ---------- Important radio lines stay up (card space-game-price-line-held; ORCH for Troy, 24 Nov 2026: "in 1.1 the radio line that tells the price of sending pilots to the miner is overwritten within seconds by Contact and Torpedo down. Give important lines a least hold, about 5 s") ----------
// Pure, no Phaser. The ship's radio lines (the sim's 'say' events) are shown as a toast, and a toast is one box: the next line replaces it. Most lines are only news, but a few are what the player must read and
// decide on: the miner's call, the price of answering it (src/campminer.js), the warning that a ship has strayed (src/campstray.js). Those are the KEEP list (CAMP.sayhold.keep, a list of content keys).
//   A kept line stays up for CAMP.sayhold.ms (5 s; the N panel's "Radio line hold" row). Any other radio line that comes in that time waits, and is shown (and said) when the hold is over, in the order it came:
//   nothing is lost, only late. At most CAMP.sayhold.queue wait (a stale line is not worth keeping; the oldest line that is not a kept one goes first).
//   The toasts of the player's own keys ("Missile away.") are not radio lines: they answer a press and still show at once.
//   campSayKeep(key)            true when that line is a kept one
//   campSayNew()                the state: { until: when the hold ends, wait: [the lines that wait] }
//   campSayOffer(R, now, line)  a line comes in ({ text, keep }): the lines to show NOW (a list: the line itself, or nothing while a kept line is up and this one waits)
//   campSayDue(R, now)          the waiting lines that can be shown now (the hold is over): the scene asks each frame of the battle
const campSayKeep = key => ((CAMP.sayhold && CAMP.sayhold.keep) || []).indexOf(key) >= 0;
const campSayNew = () => ({ until: 0, wait: [] });
function campSayDue(R, now) {
  const out = []; if (!R) return out;
  while (R.wait.length && now >= R.until) { const l = R.wait.shift(); out.push(l); if (l.keep) R.until = now + Math.max(0, CAMP.sayhold.ms); }
  return out;
}
function campSayOffer(R, now, line) {
  if (!R) return [line];
  R.wait.push(line);
  while (R.wait.length > Math.max(1, CAMP.sayhold.queue | 0)) { const i = R.wait.findIndex(l => !l.keep); R.wait.splice(i < 0 ? 0 : i, 1); }
  return campSayDue(R, now);
}
