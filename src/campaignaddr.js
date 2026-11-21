// ---------- Campaign: start at any level by the address (card space-game-campaign-tune; Troy, 19 Nov 2026) ----------
// Troy plays the Campaign to tune it and wants to open a level straight away, not play the ones before it. The address says which:
//     index.html?campaign=2        the Campaign, at level 2          index.html?campaign        the Campaign, at level 1
//     http://127.0.0.1:8787/?campaign=3
// This file only READS the address. It is pure (a string in, a plain answer out, no page, no Phaser) so a test can run it in Node. What starts the level is the
// Campaign's own code, which asks campaignAddrPage(levels) once when the page has loaded and, when it gets a level, goes there instead of the title screen.
//
// campaignAddr(search, levels) -> null           no "campaign" in the address: the game starts as it always does (Long Haul, the title screen)
//                              -> { level: N }   N is a whole number from 1 to levels; a bare "?campaign" or "?campaign=" is level 1
//                              -> { bad, say }   something else ("?campaign=7", "?campaign=two"): bad is the plain text that was given (cut and cleaned), say is a plain line for the
//                                                screen. The game then starts as it always does and shows the line: a wrong address is never a crash and never a silent surprise.
// levels: how many levels the Campaign has (its level table says; 3 until then). The first "campaign" in the address counts; the other parts of it are not read.
const CAMPAIGN_ADDR = { param: 'campaign', levels: 3, text: 12 };

function campaignAddr(search, levels) {
  try {
    const A = CAMPAIGN_ADDR, max = Number.isInteger(levels) && levels >= 1 ? levels : A.levels;
    if (typeof search !== 'string') return null;
    const parts = search.replace(/^[?#]/, '').split('&');
    for (let i = 0; i < parts.length; i++) {
      const eq = parts[i].indexOf('='), k = (eq < 0 ? parts[i] : parts[i].slice(0, eq));
      let key = k; try { key = decodeURIComponent(k.replace(/\+/g, ' ')); } catch (e) { key = k; }
      if (key.trim().toLowerCase() !== A.param) continue;
      let raw = eq < 0 ? '' : parts[i].slice(eq + 1); try { raw = decodeURIComponent(raw.replace(/\+/g, ' ')); } catch (e) { /* kept as it came */ }
      raw = raw.trim();
      if (raw === '') return { level: 1 };
      if (/^\d{1,3}$/.test(raw) && +raw >= 1 && +raw <= max) return { level: +raw };
      const bad = raw.replace(/[^\w .:+-]/g, '?').slice(0, A.text);
      return { bad, say: 'The address says campaign=' + bad + '. The Campaign has ' + (max === 1 ? 'one level' : 'levels 1 to ' + max) + ': try ?campaign=1' + (max > 1 ? ' to ?campaign=' + max : '') + '.' };
    }
    return null;
  } catch (e) { return null; /* an address nobody can read is the normal game */ }
}

// the page's own address, read once: null when there is no page (a test in Node) or no "campaign" in it. search: for a test, in place of the page's.
function campaignAddrPage(levels, search) {
  try { return campaignAddr(typeof search === 'string' ? search : (typeof location !== 'undefined' && location && typeof location.search === 'string' ? location.search : ''), levels); } catch (e) { return null; }
}

// ---------- the plan the Campaign follows when the address names a level (needs src/campaign.js: CAMP, campTechChoices) ----------
// campAddrPlan(search) -> null            no "campaign" in the address: nothing to do
//                      -> { bad, say }    a wrong address: the line to show; the game starts as it always does
//                      -> { level, techs, via: 'address', say? }   start this level now: campNew(plan.level, plan.techs, { via: plan.via }). techs are what a player would have by then: the first tech
//                                         each earlier level offers; ?campaign=2&tech=blink,bay2 names them instead (a plain list of tech ids; one that is not a tech is left out, and say says so)
// The number of levels is the level table's (CAMP.levels), so a level added there can be asked for the moment it is in.
function campAddrPlan(search) {
  try {
    const levels = Math.max(0, ...Object.keys(CAMP.levels).map(Number).filter(Number.isInteger)), a = campaignAddr(search, levels);
    if (!a) return null;
    if (a.bad) return { bad: a.bad, say: a.say };
    let techs = [], say = '';
    const q = String(search).replace(/^[?#]/, '').split('&').find(p => /^tech=/i.test(p));
    if (q) {
      let raw = q.slice(5); try { raw = decodeURIComponent(raw.replace(/\+/g, ' ')); } catch (e) { /* as it came */ }
      const want = raw.toLowerCase().split(/[\s,]+/).filter(Boolean), known = want.filter((t, i) => CAMP.tech[t] && want.indexOf(t) === i), unknown = want.filter(t => !CAMP.tech[t]);
      techs = known;
      if (unknown.length) say = 'The address names a tech that is not there: ' + unknown.slice(0, 3).map(t => t.replace(/[^\w.-]/g, '?').slice(0, 12)).join(', ') + '. Techs: ' + Object.keys(CAMP.tech).join(', ') + '.';
    } else for (let l = 1; l < a.level; l++) { const first = campTechChoices(l)[0]; if (first) techs.push(first); }
    return say ? { level: a.level, techs, via: 'address', say } : { level: a.level, techs, via: 'address' };
  } catch (e) { return null; }
}
// the page's own address (a test passes one)
function campAddrPlanPage(search) {
  try { return campAddrPlan(typeof search === 'string' ? search : (typeof location !== 'undefined' && location && typeof location.search === 'string' ? location.search : '')); } catch (e) { return null; }
}

// ---------- the debug switch (card space-game-debug-keys-off; Troy, 20 Nov 2026) ----------
// The tune kit's keys (src/campdebug.js) are off in the normal game: one slip on the backslash ended Troy's Mission 1. The address turns them on:
//     index.html?campaign=1&debug=1       (also ?debug, ?debug=on, ?debug=true, ?debug=yes; anything else, ?debug=0 among it, is off)
// campDebugAddr(search) -> true or false, pure. campDebugAddrPage(search) is the page's own address (false when there is no page, in a test in Node); campDebugOn() asks it once.
const CAMP_DEBUG_PARAM = 'debug';

function campDebugAddr(search) {
  try {
    if (typeof search !== 'string') return false;
    const parts = search.replace(/^[?#]/, '').split('&');
    for (let i = 0; i < parts.length; i++) {
      const eq = parts[i].indexOf('='), k = (eq < 0 ? parts[i] : parts[i].slice(0, eq));
      let key = k; try { key = decodeURIComponent(k.replace(/\+/g, ' ')); } catch (e) { key = k; }
      if (key.trim().toLowerCase() !== CAMP_DEBUG_PARAM) continue;
      let raw = eq < 0 ? '' : parts[i].slice(eq + 1); try { raw = decodeURIComponent(raw.replace(/\+/g, ' ')); } catch (e) { /* kept as it came */ }
      raw = raw.trim().toLowerCase();
      return raw === '' || raw === '1' || raw === 'on' || raw === 'true' || raw === 'yes';
    }
    return false;
  } catch (e) { return false; /* an address nobody can read is the normal game: the keys stay off */ }
}

function campDebugAddrPage(search) {
  try { return campDebugAddr(typeof search === 'string' ? search : (typeof location !== 'undefined' && location && typeof location.search === 'string' ? location.search : '')); } catch (e) { return false; }
}
