# Not part of the build. How the star map of the mods/sol pack was made (card space-game-near-stars-pack, docs/NEAR-STARS.md):
# the real positions of the fourteen stars (right ascension, declination, distance: catalogue values written from memory, to be checked),
# flattened to the galaxy map so that every star keeps its true distance from Sol. Run: python3 tools/near-stars-flatten.py 2 300
# (the weight on false shortcuts, and how many starts). It prints the offsets from Sol and the errors, and writes near-stars-flat.json beside itself.
import math, itertools, json, random
# id, name, RA (h m s), Dec (deg arcmin, sign), distance ly, game star type, spectral type(s)   -- catalogue values from memory (J2000), to be checked
S = [
 ('alpha-centauri','Alpha Centauri',(14,39,36),(-60,50),4.37,'G','G2V + K1V, with Proxima M5.5Ve'),
 ('barnard','Barnard\'s Star',(17,57,48),(4,42),5.96,'M','M4V'),
 ('wolf-359','Wolf 359',(10,56,29),(7,1),7.86,'M','M6V'),
 ('lalande-21185','Lalande 21185',(11,3,20),(35,58),8.31,'M','M2V'),
 ('sirius','Sirius',(6,45,9),(-16,43),8.60,'A','A1V + white dwarf DA2'),
 ('luyten-726-8','Luyten 726-8',(1,39,1),(-17,57),8.73,'M','M5.5V + M6V (UV Ceti)'),
 ('ross-154','Ross 154',(18,49,49),(-23,50),9.69,'M','M3.5V'),
 ('ross-248','Ross 248',(23,41,55),(44,10),10.30,'M','M5.5V'),
 ('epsilon-eridani','Epsilon Eridani',(3,32,56),(-9,27),10.47,'K','K2V'),
 ('lacaille-9352','Lacaille 9352',(23,5,52),(-35,51),10.72,'M','M0.5V'),
 ('ross-128','Ross 128',(11,47,44),(0,48),11.01,'M','M4V'),
 ('procyon','Procyon',(7,39,18),(5,13),11.46,'F','F5IV-V + white dwarf DQZ'),
 ('61-cygni','61 Cygni',(21,6,54),(38,45),11.40,'K','K5V + K7V'),
 ('tau-ceti','Tau Ceti',(1,44,4),(-15,56),11.91,'G','G8V'),
]
def xyz(ra, dec, d):
    a = math.radians((ra[0] + ra[1]/60 + ra[2]/3600) * 15)
    sgn = -1 if dec[0] < 0 else 1
    de = math.radians(sgn * (abs(dec[0]) + dec[1]/60))
    return (d*math.cos(de)*math.cos(a), d*math.cos(de)*math.sin(a), d*math.sin(de))
P = {s[0]: xyz(s[2], s[3], s[4]) for s in S}
ids = [s[0] for s in S]; D = {s[0]: s[4] for s in S}
def d3(a, b): return math.dist(P[a], P[b])
real = {(a, b): d3(a, b) for a, b in itertools.combinations(ids, 2)}
# flatten: every star keeps its true distance from Sol (a ring of that radius); only its angle on the map is free.
# choose the angles that keep the distances between stars closest to real, counting near pairs more (weight 1/d^2).
import sys
W_SHORT = float(sys.argv[1]) if len(sys.argv) > 1 else 0.6
def pos(ang): return {i: (D[i]*math.cos(ang[i]), D[i]*math.sin(ang[i])) for i in ids}
def stress(ang):
    p = pos(ang); s = 0
    for (a, b), r in real.items():
        m = math.dist(p[a], p[b]); s += ((m - r) / r) ** 2 / r
        if r > 8 and m < 8.4: s += W_SHORT * (((8.4 - m) / 8) ** 2 + 0.03) * min(3, r / 8)     # a false shortcut: worse the further apart they really are
        if r > 9.2 and m < 9.4: s += W_SHORT * (((9.4 - m) / 9) ** 2 + 0.03) * min(3, r / 9)   # the same for the 9 ly ship
        if 8 < r <= 9 and m > 8.9: s += W_SHORT * (((m - 8.9) / 9) ** 2 + 0.03)
        if r <= 8 and m > 7.8: s += W_SHORT * (((m - 7.8) / 8) ** 2 + 0.03)    # a real hop lost
    return s
best = None
rnd = random.Random(1859)
for start in range(int(sys.argv[2]) if len(sys.argv) > 2 else 160):
    if start == 0: ang = {i: math.atan2(P[i][1], P[i][0]) for i in ids}          # the right ascension as the first guess
    else: ang = {i: rnd.uniform(0, 2*math.pi) for i in ids}
    cur = stress(ang); step = 0.6
    while step > 1e-4:
        moved = False
        for i in ids:
            for dlt in (step, -step):
                t = dict(ang); t[i] = ang[i] + dlt; s = stress(t)
                if s < cur - 1e-12: ang, cur, moved = t, s, True
        if not moved: step /= 2
    if best is None or cur < best[0]: best = (cur, ang)
cur, ang = best
SOL = (26, 27)
SHIPPED = {'Halcyon': (20, 22), 'Kestrel': (25.5, 19), 'Meridian': (29, 24.5), 'Brass Reach': (14, 26.5), 'The Hollow': (13.5, 17.5), 'Lethe': (7.5, 30), 'Ember': (34, 31), "Reaver's Roost": (37, 15)}   # content/systems/*.md, ly
bestr = None
for mirror in (1, -1):
    for k in range(720):
        rot = k * math.pi / 360
        a2 = {i: mirror * ang[i] + rot for i in ids}; p = pos(a2)
        clear = min(math.dist((SOL[0] + p[i][0], SOL[1] + p[i][1]), v) for i in ids for v in SHIPPED.values())
        inmap = min(min(SOL[0] + p[i][0], SOL[1] + p[i][1]) for i in ids)
        score = clear if inmap >= 1 else clear - 10
        if bestr is None or score > bestr[0]: bestr = (score, a2, clear, mirror, k / 2)
ang = bestr[1]; p = pos(ang)
print('turn', bestr[4], 'deg, mirror', bestr[3], ': nearest a star comes to a shipped system:', round(bestr[2], 2), 'ly')
out = {'stress': cur, 'stars': []}
for s in S:
    out['stars'].append({'id': s[0], 'name': s[1], 'ly': s[4], 'type': s[5], 'spec': s[6], 'dx': round(p[s[0]][0], 2), 'dy': round(p[s[0]][1], 2), 'mapx': round(SOL[0] + p[s[0]][0], 1), 'mapy': round(SOL[1] + p[s[0]][1], 1), 'xyz': [round(v, 2) for v in P[s[0]]]})
pairs = []
for (a, b), r in real.items():
    m = math.dist(p[a], p[b]); pairs.append((r, m, a, b))
pairs.sort()
out['pairs'] = [{'a': a, 'b': b, 'real': round(r, 2), 'map': round(m, 2)} for r, m, a, b in pairs]
json.dump(out, open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), 'near-stars-flat.json'), 'w'), indent=1)
print('stress', round(cur, 4))
for s in out['stars']: print(f"{s['id']:16} {s['ly']:5.2f} ly  map offset ({s['dx']:6.2f}, {s['dy']:6.2f})")
print('nearest 22 pairs: real -> map')
for r, m, a, b in pairs[:22]: print(f"  {a:16} {b:16} {r:5.2f} -> {m:5.2f}  ({(m-r):+.2f})")
near = [(r, m) for r, m, a, b in pairs if r <= 8]
print('pairs within 8 ly real:', len(near), 'mean abs err', round(sum(abs(m-r) for r, m in near)/len(near), 2), 'worst', round(max(abs(m-r) for r, m in near), 2))
allp = [(r, m) for r, m, a, b in pairs]
print('all pairs mean abs err', round(sum(abs(m-r) for r, m in allp)/len(allp), 2), 'worst', round(max(abs(m-r) for r, m in allp), 2))
flip = [(a, b, round(r,2), round(m,2)) for r, m, a, b in pairs if (r <= 8) != (m <= 8)]
print('pairs that cross the 8 ly line between real and map:', flip)
