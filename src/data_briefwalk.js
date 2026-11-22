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
    ]
  }
};
