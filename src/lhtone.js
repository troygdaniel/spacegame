// ---------- The new Long Haul: the Campaign's colour rules on the flight's marks (PROMPT 23, piece 9 of docs/longhaul-earth.html; behind ?longhaul=new, src/lhnew.js) ----------
// The Campaign's colours each mean one thing (src/shiplook.js SLOOK.C): hostile pink, yours pale blue, a ship you protect amber, your fire mint, a goal gold. Long Haul's flight marks were made before that rule:
// a hostile is red, a wanted one amber, a gunship's radar dot orange, the approach ring round a dock green when you are slow enough and amber when you are too fast. With the switch on:
//   every HOSTILE mark is the Campaign's pink: the ticks round a pirate in view, the lock's brackets, ring, name and hull cells (a wanted pirate and the Reaver too), a pirate's dot on the radar, the HOSTILE CONTACT and
//     INTERDICTED banners
//   every REACH ring is the Campaign's blue: the approach ring round a dock or a world, whatever your speed (it is bright inside the ring, as before; the words under it still say whether the speed is right)
// so amber is never a locked or a warned state of a hostile: it is the freighter you escort (src/lhlook.js) and Long Haul's own stores (credits, cargo). The colours are read from the Campaign's table, not written here.
// Pure: tests/lhtone.mjs. Each caller asks first and keeps its own colour as the other branch.
//   lhTone(color, role)   the colour a mark takes: role 'foe' the Campaign's hostile pink, 'ring' its blue; `color` unchanged with the switch off or for a role it does not know
function lhTone(color, role) {
  if (typeof lhNewOn !== 'function' || !lhNewOn() || typeof SLOOK !== 'object' || typeof slookInt !== 'function') return color;
  return role === 'foe' ? slookInt(SLOOK.C.foe) : role === 'ring' ? slookInt(SLOOK.C.friendHi) : color;
}
