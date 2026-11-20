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
