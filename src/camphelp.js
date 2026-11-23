// ---------- Campaign: plain questions answered without a model (card space-game-night-ux, finding 2; docs/night/ux.md) ----------
// In the Campaign the words that need no chat key were only the five fleet orders (src/campaign.js campIntent). "help", "what do I do", "what keys", "how do I fire", "show the map" and
// "how is the carrier" fell through to "The ship's computer needs a chat key: Settings > Keys", and a new player has no key yet. campHelp answers four kinds of plain question from the
// battle itself: the goal, the keys, the map, the status. It is pure (the battle and the words in, a line out), runs in plain Node, costs nothing and works with no key.
//   campHelp(text, C) -> the reply line, or null when the words are not one of these questions (the model reads them, as before, or the strip says it needs a key)
// The whole phrase must be the question (anchored), so "what should I do about the gunships" is never taken for "what do I do". The words are camp.help.* in content/text/ui.md.
// src/shipcomputer.js shipcompIntent asks it after campIntent, in the Campaign only.
const CAMPHELP = {
  filler: /^(?:(?:please|hey|ok|okay|computer|ship|athena|tell me|can you tell me|could you tell me|i need|i want to know|quick|so|um|uh)\s+)+/,
  goal: /^(?:what(?: is|s)? (?:my |the |our )?(?:goal|objective|mission|aim|task|job|plan)|what (?:do|should|can|must) (?:i|we) do(?: now| next| first)?|what now|what next|what are we doing|what am i (?:supposed|meant) to do|where do i start|how do i (?:win|win this|win this level|finish|beat this|beat this level)|objective|goal|mission|my goal)$/,
  keys: /^(?:help(?: me)?|keys|controls|the keys|the controls|what keys|what are the (?:keys|controls)|what (?:keys|buttons) do i (?:press|use)|how do i (?:play|play this|fly|steer|move|fire|shoot|fire the gun|use the guns?|give orders|command the (?:wing|fighters|ships)|control (?:the|my) (?:ship|carrier))|how does this work|what can i do|what can i say|what are the orders|orders|commands|the orders|what are my orders)$/,
  map: /^(?:(?:show|open|bring up|pull up) (?:me )?(?:the )?map|map|the map|how do i (?:see|open|show|use) (?:the )?map|where is (?:earth|everything|everyone|everybody|the (?:mothership|convoy|convoys|aliens|enemy))|where (?:are|is) the (?:aliens|convoys|convoy|enemy|enemies|mothership|ships)|where am i|where are we)$/,
  status: /^(?:status|report|status report|sitrep|situation|how am i doing|how are we doing|how is (?:the |my )?(?:carrier|hull|ship|earth|shield|wing|fleet|battle|fight)|how bad is it|how are (?:my|the) (?:ships|fighters|wing)|how many (?:fighters|ships|ships are out|are left|do i have)|carrier (?:hull|status)|hull|earth shield|earth s shield|shield)$/
};

function campHelp(text, C) {
  try {
    if (!C || !C.carrier) return null;
    let q = String(text == null ? '' : text).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/'/g, ' ').replace(/\s+/g, ' ').trim();
    q = q.replace(CAMPHELP.filler, '').replace(/\s+(please|already)$/, '').trim();
    if (!q) return null;
    const H = CAMPHELP, wing = (typeof campWing === 'function' ? campWing(C).length : 0), bay = (C.bay ? C.bay.fighters : 0);
    if (H.goal.test(q)) return uiText(bay > 0 && wing === 0 && !C.launchQ.length ? 'camp.help.goalbay' : 'camp.help.goal', { goal: campObjective(C) });
    if (H.keys.test(q)) return uiText('camp.help.keys');
    if (H.map.test(q)) return uiText('camp.help.map');
    if (H.status.test(q)) return uiText(C.earth ? 'camp.help.status' : 'camp.help.status2', { hull: Math.round(C.carrier.hp), max: Math.round(C.carrier.maxHp), earth: C.earth ? Math.round(C.earth.shield / C.earth.max * 100) : 0, out: wing, bay });
    return null;
  } catch (e) { return null; }
}
