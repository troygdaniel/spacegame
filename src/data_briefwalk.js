// ---------- Campaign: the briefing's walk, as data (card space-game-briefing-map-walk; Troy, 22 Nov 2026) ----------
// Troy: "the mission map should be used for each page of the briefing, zoomed as needed, with my own craft walking through the plan". A mission with a row here has a briefing that is the MAP on all three pages: the cruiser, its wing and the
// convoy walk the road from stop to stop, and at each stop a line of words says what happens there (src/campbriefwalk.js is the pure half, src/campbriefwalkdraw.js draws it). A mission with no row keeps the three-screen briefing of src/campbriefdraw.js.
// The key is "<level>.<mission number>", as the briefing's words are (camp.bf.1.1.s1). A mission row of the campaign may carry its own `walk` (the same shape) and then needs nothing here: a pack's mission brings its walk with it.
//
//   convoy   the convoy whose road is walked (its id in the mission's `convoys`; the first when it says nothing): from its place to its place, in a straight line
//   steps[]  the stops, in order. Each is
//     page   0, 1 or 2: the briefing's page it is on (the page names are the old ones: where and why, what to do, how). A page shows its stops one after the other by itself; Enter or Right goes on to the next stop (or page), Left back
//     key    the words: camp.bf.<level>.<mission>.<key>, one curt line (src/campbriefwalk.js fills {from} {to} {km} {mins} {name} and the keys of the key table)
//     at     where the party (the cruiser, the wing and the convoy) stands. A place is one of
//              { road: 0.31 }          a share (0 to 1) of the road from where the convoy starts to where it goes, the share the mission's `on: { lane: f }` rows use; { road: 0.31, side: 400 } is 400 px to the side of it
//              { place: 'ceres' }      a place of the level, by id
//              { spot: 'dm' }          a neutral ship of the mission's `traffic`, by id (the miner that is jumped)
//              { rival: 'leader' }     where a rival ship of the mission's `rivals` waits (its `on: { lane }` share plus its `ahead`)
//              { x, y }                a point of the world
//     zoom   what the map shows at this stop: 'road' (the whole road), { fit: [places], margin: px } (all of them, with px round them), { on: place, span: px } (px of the world from the top of the map to its foot, about the place)
//     marks  what is on the map from this stop on (dimmer once the party has gone past it): { kind: 'help' | 'threat' | 'goal', at: place, r: px of the world, label: 'camp.bw.m.help' (words, optional) }. A mark is a HINT where a thing is likely, never a
//            fact about a surprise: a threat is a dashed ring "pirates may be here", not a list of ships
//     with   other ships that stand somewhere else at this stop: { patrol: place } (the patrol of 1.1 sees the transport off, then turns back to the base)
const CAMPWALKS = {
  '1.1': {
    convoy: 't1',
    steps: [
      { page: 0, key: 's1', at: { road: 0 }, zoom: 'road', with: { patrol: { road: 0 } } },                                                       // leave Luna with the patrol
      { page: 0, key: 's2', at: { road: 0.12 }, zoom: 'road', with: { patrol: { place: 'luna' } } },                                           // the patrol peels off at 12 percent of the road (the row's `escort.until`) and goes home
      { page: 1, key: 's3', at: { road: 0.31 }, zoom: { fit: [{ road: 0.31 }, { spot: 'dm' }], margin: 1500 }, marks: [{ kind: 'help', at: { spot: 'dm' }, r: 420, label: 'camp.bw.m.help' }] }, // a distress call may come from the miner off the road
      { page: 1, key: 's4', at: { road: 0.52 }, zoom: { on: { road: 0.56 }, span: 6200 }, marks: [{ kind: 'threat', at: { road: 0.56 }, r: 1500, label: 'camp.bw.m.threat' }] }, // pirates ambush somewhere along the middle of the road
      { page: 2, key: 's5', at: { road: 0.75 }, zoom: { fit: [{ road: 0.75 }, { rival: 'leader' }, { place: 'ceres' }], margin: 900 }, marks: [{ kind: 'threat', at: { rival: 'leader' }, r: 1000, label: 'camp.bw.m.leader' }] }, // the pirate leader waits near Ceres
      { page: 2, key: 's6', at: { place: 'ceres' }, zoom: { fit: [{ place: 'ceres' }], margin: 1700 }, marks: [{ kind: 'goal', at: { place: 'ceres' }, r: 260, label: 'camp.bw.m.goal' }] } // arrive
    ],
    // THE FOUR MOMENTS of the one-page briefing (card space-game-screens-b-briefing; src/scrbrief.js campBriefMoments): where on the road each happens and what colour its marker is (mute: news, help: a call, threat: a danger), in the order they come.
    // The words are scr.bf.<level>.<mission>.<key>, two or three words each. A mission with moments and no steps has no walk (campWalkData answers null): the other eight missions' rows are piece f's.
    moments: [
      { key: 'm1', kind: 'mute', at: { road: 0.12 } },       // the patrol leaves (it peels off at 12 percent of the road)
      { key: 'm2', kind: 'help', at: { spot: 'dm' } },       // a miner may call for help, off the road
      { key: 'm3', kind: 'threat', at: { road: 0.56 } },     // pirates ambush somewhere along the middle of the road
      { key: 'm4', kind: 'threat', at: { rival: 'leader' } } // the pirate leader waits near Ceres
    ]
  },
  // ---- the other eight missions: their FOUR MOMENTS (card space-game-screens-f-briefings; Troy approved the words on 25 Nov 2026). A row with `moments` and no `steps` has no stepped walk (campWalkData answers null): it is only for the one-page briefing.
  // Where each is comes from the mission's own row (src/scrbrief.js scrMomentWhere: its rocks, waves, guards, towers, scan points, relic, caches, or a share of the convoy's road), and the numbers in the words too (scrMomentVars), so none can go stale.
  // kind: mute (news), help (a call, or what helps), threat (a danger), goal (what you are there for). The words are scr.bf.<level>.<mission>.m1 to m4.
  '1.2': { moments: [
    { key: 'm1', kind: 'goal', at: { rocks: true } },                             // the rock fields round Ceres
    { key: 'm2', kind: 'threat', at: { wave: 0 } },                                // the raids come in from the first wave's side
    { key: 'm3', kind: 'threat', at: { waveWith: 'tboat' } },                      // the torpedo boats
    { key: 'm4', kind: 'help', at: { place: 'ceres', off: [180, -140] } }          // the Works: it keeps its doors shut while a pirate is near
  ] },
  '1.3': { convoy: 'h1', moments: [
    { key: 'm1', kind: 'mute', at: { road: 0.02 } },                               // the haulers leave Ceres
    { key: 'm2', kind: 'threat', at: { wave: 2 } },                                // the pirates keep coming along the road
    { key: 'm3', kind: 'threat', at: { waveWith: 'tboat' } },                      // a torpedo boat
    { key: 'm4', kind: 'threat', at: { road: 0.8 } }                               // something else: a hint of where, never what
  ] },
  '2.1': { moments: [
    { key: 'm1', kind: 'goal', at: { caches: true } },                             // the caches
    { key: 'm2', kind: 'mute', at: { start: true, off: [450, -350] } },            // any ship of yours that flies close picks one up
    { key: 'm3', kind: 'threat', at: { wave: 0 } },                                // the aliens come from the west
    { key: 'm4', kind: 'threat', at: { place: 'alpha-cen-b', off: [380, 260] } }   // and all of them must die
  ] },
  '2.2': { moments: [
    { key: 'm1', kind: 'threat', at: { guards: true } },                           // the guards
    { key: 'm2', kind: 'threat', at: { wave: 0 } },                                // reinforcements
    { key: 'm3', kind: 'help', at: { guards: true, off: [-500, -380] } },          // missiles help against the heavy ones
    { key: 'm4', kind: 'goal', at: { place: 'proxima-d', off: [320, -300] } }      // clear them all
  ] },
  '2.3': { moments: [
    { key: 'm1', kind: 'goal', at: { relic: true } },                              // fly into the ring
    { key: 'm2', kind: 'goal', at: { relic: true, off: [330, 220] } },             // hold it
    { key: 'm3', kind: 'threat', at: { relic: true, off: [-380, 280] } },          // keep the aliens off
    { key: 'm4', kind: 'threat', at: { wave: 0 } }                                 // they arrive fast
  ] },
  '3.1': { moments: [
    { key: 'm1', kind: 'goal', at: { scan: 0 } },                                  // fly to each ring
    { key: 'm2', kind: 'goal', at: { scan: 1 } },                                  // a scan takes seconds
    { key: 'm3', kind: 'threat', at: { wave: 0 } },                                // the aliens answer
    { key: 'm4', kind: 'threat', at: { scan: 2 } }                                 // kill every alien
  ] },
  '3.2': { moments: [
    { key: 'm1', kind: 'goal', at: { tower: 0 } },                                 // the towers
    { key: 'm2', kind: 'mute', at: { mid: [{ start: true }, { tower: 0 }] } },     // the wing goes first
    { key: 'm3', kind: 'threat', at: { wave: 0 } },                                // reinforcements
    { key: 'm4', kind: 'threat', at: { tower: 0, off: [260, -240] } }              // the towers are tough
  ] },
  '3.3': { moments: [
    { key: 'm1', kind: 'goal', at: { tower: 0 } },                                 // the towers
    { key: 'm2', kind: 'threat', at: { wave: 0 } },                                // two waves come
    { key: 'm3', kind: 'mute', at: { mid: [{ start: true }, { tower: 0 }] } },     // the wing goes first
    { key: 'm4', kind: 'threat', at: { wave: 1 } }                                 // the last battle
  ] }

};
