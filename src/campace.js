// ---------- Campaign: the battle pace, the player's setting (card space-game-campaign-pace; Troy, 20 Nov 2026) ----------
// The small ships' fights are good but a bit fast. The numbers are CAMP.pace (src/campaign.js: Calm 0.7, Normal 0.85, Brisk 1 = the table as it was; the sim scales the small ships only);
// this file keeps which one the player picked, as src/handling.js keeps the flight feel: in this browser (localStorage), not in the save, so Reset game keeps it. Normal until a player picks.
//   campPaceLoad()        read the choice (once, and again after a change elsewhere); the setting's id
//   campPaceNow()         the row of CAMP.pace.modes the player has: { id, name, mult }
//   campPaceChoose(id)    set it and keep it; the id
//   campPaceStep(d)       the next (d 1) or the last (d -1) setting, wrapping; the row
//   campPaceLine()        "Pace: Normal", for the pause card and the H page
// The Campaign scene passes campPaceNow().id to campNew and the B key calls campPaceStep, then campPaceSet(C, id) on the battle that is running. Settings > Game has the row (src/settings.js).
const CAMPACE_STORE = 'longhaul.campaign.pace';
let campPaceId = '';

function campPaceLoad() { // storage is optional: every call is wrapped
  let v = ''; try { v = localStorage.getItem(CAMPACE_STORE) || ''; } catch (e) { v = ''; }
  campPaceId = CAMP.pace.modes.some(m => m.id === v) ? v : CAMP.pace.start;
  return campPaceId;
}
function campPaceNow() {
  if (!campPaceId) campPaceLoad();
  return CAMP.pace.modes.find(m => m.id === campPaceId) || CAMP.pace.modes[0];
}
function campPaceChoose(id) {
  campPaceId = CAMP.pace.modes.some(m => m.id === id) ? id : CAMP.pace.start;
  try { localStorage.setItem(CAMPACE_STORE, campPaceId); } catch (e) { /* storage is optional */ }
  return campPaceId;
}
function campPaceStep(d) {
  const ms = CAMP.pace.modes, i = ms.findIndex(m => m.id === campPaceNow().id);
  campPaceChoose(ms[(i + (d || 1) + ms.length) % ms.length].id);
  return campPaceNow();
}
const campPaceLine = () => uiText('camp.pace.line', { pace: campPaceNow().name });
