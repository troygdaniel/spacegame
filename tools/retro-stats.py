#!/usr/bin/env python3
"""The numbers behind docs/RETRO.md: how the Long Haul work went, from the board, its chat, the git history and the test logs.

    python3 tools/retro-stats.py [--board DIR] [--repo DIR] [--logs DIR] [--prefix space-game] [--section NAME ...]

Read-only. --board is an agentboard folder (default: $AGENTBOARD_DIR, else the board next to this checkout's parent); its tasks.json holds the cards and,
with its hourly backups/tasks-*.json.gz, the whole chat (the live file keeps the last 500 lines). --repo is this game's git checkout. --logs is a folder
searched for test logs that recorded "test lock: waiting" lines (the lock prints one every 30 s a run waits). Prints Markdown tables to stdout; a section it
cannot compute (no logs, no git) says so and the rest still prints. Times are the board's local clock; hours are wall-clock hours, nights included.
Sections: window, timing, big, agents, blocked, merges, conflicts, size, fit, tests, chat, waste, models."""
import argparse
import collections
import glob
import gzip
import json
import os
import re
import statistics as st
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path

ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
ap.add_argument("--board", default=os.environ.get("AGENTBOARD_DIR") or str(Path(__file__).resolve().parents[2] / "agentboard" / ".agentboard"))
ap.add_argument("--repo", default=str(Path(__file__).resolve().parents[1]))
ap.add_argument("--logs", default=None)
ap.add_argument("--prefix", default="space-game")
ap.add_argument("--section", nargs="*", default=[])
A = ap.parse_args()
BOARD, REPO = Path(A.board).expanduser(), Path(A.repo).expanduser()
WANT = set(A.section)


def want(name):
    return not WANT or name in WANT


def P(s):
    return datetime.fromisoformat(str(s)[:19])


def hrs(a, b):
    return (b - a).total_seconds() / 3600


def pct(v, q):
    v = sorted(v)
    return v[min(len(v) - 1, max(0, int(round(q * (len(v) - 1)))))] if v else float("nan")


def stats(v):
    return f"n={len(v)}, median {st.median(v):.2f} h, mean {st.mean(v):.2f} h, p90 {pct(v, .9):.2f} h, max {max(v):.1f} h" if v else "n=0"


def table(head, rows):
    out = ["| " + " | ".join(head) + " |", "|" + "|".join("---" for _ in head) + "|"]
    out += ["| " + " | ".join(str(c) for c in r) + " |" for r in rows]
    print("\n".join(out) + "\n")


def h2(t):
    print(f"## {t}\n")


def git(*a, cwd=None):
    r = subprocess.run(["git", *a], cwd=cwd or REPO, capture_output=True, text=True)
    return r.stdout


# ----------------------------------------------------------------------------------------------------- the board
try:
    DATA = json.loads((BOARD / "tasks.json").read_text())
except (OSError, ValueError) as e:
    sys.exit(f"retro-stats: cannot read {BOARD}/tasks.json: {e}")
TASKS = DATA["tasks"]
ALL = {t["id"]: t for t in TASKS}
CARDS = [t for t in TASKS if str(t.get("id", "")).startswith(A.prefix) and not t.get("parent_id")]
SUBS = collections.Counter(t.get("parent_id") for t in TASKS if t.get("parent_id"))


def text_of(e):
    return e.get("text") or ""


def events(t):
    """created, claim, first review, last done, review count, done count, simpler asks, spec edits, reopens."""
    log = t.get("log") or []
    cl = [P(e["at"]) for e in log if text_of(e).startswith(("Claimed by", "Started by", "Added to doing", "BuildBot announced"))]
    rv = [P(e["at"]) for e in log if text_of(e).startswith("Ready for review")]
    dn = [P(e["at"]) for e in log if text_of(e).startswith(("Marked done", "Moved to done"))]
    reopen, was_done = 0, False
    for e in log:   # a card that leaves Done after it was in it was reopened
        if e.get("status") == "done":
            was_done = True
        elif was_done and e.get("status") in ("todo", "doing"):
            reopen += 1
            was_done = False
    return dict(id=t["id"], agent=t.get("agent"), status=t["status"], created=P(t["created"]), claim=min(cl) if cl else None, review=min(rv) if rv else None,
                done=max(dn) if dn else None, nrev=len(rv), simpler=sum(1 for e in log if text_of(e).startswith("Be simpler")),
                spec=sum(1 for e in log if text_of(e).startswith(("Description changed", "Title changed"))), reopen=reopen, subs=SUBS.get(t["id"], 0),
                blocked_by=list(t.get("blocked_by") or []), title=t.get("title", ""), result=t.get("result") or "")


EV = [events(t) for t in CARDS]
DONE = [e for e in EV if e["status"] == "done" and e["done"]]
KIND = lambda e: ("universe" if re.search(r"-u-[a-f]\d", e["id"]) else "markdown content" if re.search(r"-m\d", e["id"]) else "bug" if "-bug" in e["id"] else
                  "npc chat" if "-npc-chat" in e["id"] else "playtest" if "playtest" in e["id"] else "other feature")

print(f"# Long Haul retrospective numbers ({A.prefix}-*)\n")
print(f"Board `tasks.json`: {len(TASKS)} cards, {len(CARDS)} of them `{A.prefix}-*` ({', '.join(f'{v} {k}' for k, v in collections.Counter(e['status'] for e in EV).most_common())}).\n")

# ----------------------------------------------------------------------------------------------------- window
if want("window") and DONE:
    h2("Window and throughput")
    t0, t1 = min(e["created"] for e in EV), max(e["done"] for e in DONE)
    print(f"First card created {t0:%a %d %b %H:%M}, last card done {t1:%a %d %b %H:%M}: {hrs(t0, t1):.1f} wall-clock hours; {len(DONE)} cards done "
          f"({len(DONE) / hrs(t0, t1):.2f} an hour; {sum(1 for e in DONE if e['subs'])} of them with subtasks, median {st.median([e['subs'] for e in DONE if e['subs']] or [0]):.0f}).\n")
    day = collections.Counter(f"{e['done']:%a %d %b}" for e in DONE)
    table(["day", "cards done"], sorted(day.items(), key=lambda kv: datetime.strptime(kv[0] + " 2026", "%a %d %b %Y")))
    hour = collections.Counter(e["done"].hour for e in DONE)
    quiet = [h for h in range(24) if hour[h] == 0]
    print(f"Cards done by hour of day: busiest {max(hour, key=hour.get)}:00 ({hour[max(hour, key=hour.get)]}); no card finished in the hours {quiet}.\n")

# ----------------------------------------------------------------------------------------------------- timing
if want("timing") and DONE:
    h2("Time per card")
    ordered = [e for e in DONE if e["claim"] and (e["claim"] - e["created"]).total_seconds() >= 60]   # made in Todo, claimed later
    own = [e for e in DONE if e["claim"] and (e["claim"] - e["created"]).total_seconds() < 60]          # started by the agent that does it
    table(["step", "cards", "median", "mean", "p90", "max"], [
        (name, len(v), f"{st.median(v):.2f} h", f"{st.mean(v):.2f} h", f"{pct(v, .9):.2f} h", f"{max(v):.1f} h") for name, v in (
            ("waiting in Todo (made by ORCH, claimed later)", [hrs(e["created"], e["claim"]) for e in ordered]),
            ("build: claim to first review", [hrs(e["claim"], e["review"]) for e in DONE if e["claim"] and e["review"]]),
            ("review to done (the owner closes it)", [hrs(e["review"], e["done"]) for e in DONE if e["review"] and e["done"] >= e["review"]]),
            ("whole card, created to done", [hrs(e["created"], e["done"]) for e in DONE]))])
    print(f"Cards made in Todo and claimed later: {len(ordered)}; cards the agent started itself: {len(own)}; cards closed with no review event: "
          f"{sum(1 for e in DONE if not e['review'])}.\n")
    b = [hrs(e["claim"], e["review"]) for e in DONE if e["claim"] and e["review"]]
    tot = sum(b)
    bands = [("under 30 min", 0, .5), ("30 min to 1 h", .5, 1), ("1 to 3 h", 1, 3), ("over 3 h", 3, 1e9)]
    table(["build time", "cards", "share of cards", "build hours", "share of build hours"],
          [(n, sum(1 for x in b if lo <= x < hi), f"{100 * sum(1 for x in b if lo <= x < hi) / len(b):.0f}%", f"{sum(x for x in b if lo <= x < hi):.1f}",
            f"{100 * sum(x for x in b if lo <= x < hi) / tot:.0f}%") for n, lo, hi in bands])
    kinds = collections.defaultdict(list)
    for e in DONE:
        if e["claim"] and e["review"]:
            kinds[KIND(e)].append(hrs(e["claim"], e["review"]))
    table(["kind of card", "cards", "median build", "p90 build", "build hours"], [(k, len(v), f"{st.median(v):.2f} h", f"{pct(v, .9):.2f} h", f"{sum(v):.1f}") for k, v in sorted(kinds.items(), key=lambda kv: -sum(kv[1]))])
    print(f"Rework markers on the board: {sum(1 for e in DONE if e['nrev'] > 1)} cards reviewed more than once, {sum(e['simpler'] for e in DONE)} \"Be simpler\" "
          f"replies, {sum(e['reopen'] for e in DONE)} reopenings, {sum(e['spec'] for e in DONE)} title or description edits on {sum(1 for e in DONE if e['spec'])} cards.\n")

# ----------------------------------------------------------------------------------------------------- big
if want("big") and DONE:
    h2("The slowest builds")
    rows = sorted([e for e in DONE if e["claim"] and e["review"]], key=lambda e: -hrs(e["claim"], e["review"]))[:10]
    table(["card", "agent", "build", "reviews", "spec edits", "subtasks"], [(e["id"][len(A.prefix) + 1:], e["agent"] or "-", f"{hrs(e['claim'], e['review']):.1f} h", e["nrev"], e["spec"], e["subs"]) for e in rows])

# ----------------------------------------------------------------------------------------------------- agents
if want("agents") and DONE:
    h2("Agents: busy and idle")
    t0, t1 = min(e["created"] for e in EV), max(e["done"] for e in DONE)
    per = collections.defaultdict(list)
    for e in DONE:
        if e["agent"] and e["claim"]:
            per[e["agent"]].append((e["claim"], max(e["review"] or e["done"], e["claim"]), e))
    rows, idle_all = [], []
    for ag, iv in sorted(per.items(), key=lambda kv: -len(kv[1])):
        iv.sort(key=lambda x: x[0])
        busy, cur = 0.0, None
        for a, b, _ in iv:   # union of the intervals the agent held a card (claim to review)
            if cur and a <= cur[1]:
                cur = (cur[0], max(cur[1], b))
            else:
                if cur:
                    busy += hrs(*cur)
                cur = (a, b)
        busy += hrs(*cur)
        gaps = [hrs(iv[i][1], iv[i + 1][0]) for i in range(len(iv) - 1) if iv[i + 1][0] > iv[i][1]]
        span = hrs(iv[0][0], max(x[1] for x in iv))
        long_gaps = [g for g in gaps if 0.5 <= g <= 8]   # between half an hour and eight (longer is the owner's night)
        idle_all += long_gaps
        b = [hrs(x[0], x[2]["review"]) for x in iv if x[2]["review"]]
        rows.append((ag, len(iv), f"{busy:.1f} h", f"{span:.1f} h", f"{100 * busy / span:.0f}%", len(long_gaps), f"{sum(long_gaps):.1f} h", f"{st.median(b):.2f} h" if b else "-",
                     sum(1 for x in iv if x[2]['nrev'] > 1)))
    table(["agent", "cards", "holding a card (union)", "first claim to last review", "share", "gaps of 0.5-8 h", "hours in those gaps", "median build", "re-reviewed"], rows)
    print(f"Between-card gaps of half an hour to eight hours, all agents: {len(idle_all)} gaps, {sum(idle_all):.1f} hours (the board cannot say whether an agent was waiting for "
          "an assignment, for the test lock or for the owner; the chat and test-log sections say more).\n")
    night = day_ = 0.0
    for ag, iv in per.items():
        iv.sort(key=lambda x: x[0])
        for i in range(len(iv) - 1):
            a, b = iv[i][1], iv[i + 1][0]
            if b > a and 0.5 <= hrs(a, b) <= 8:
                t = a
                while t < b:   # split the gap by the clock: 00:00-08:00 counts as night
                    step = min(b, t + timedelta(minutes=10))
                    if t.hour < 8:
                        night += hrs(t, step)
                    else:
                        day_ += hrs(t, step)
                    t = step
    print(f"Of those gap hours, {night:.1f} fall between midnight and 08:00 and {day_:.1f} in the day.\n")
    # how many agents held a card at once, hour by hour
    t = t0.replace(minute=0, second=0)
    n, counts = 0, []
    while t < t1:
        counts.append(sum(1 for ag, iv in per.items() if any(a <= t < b for a, b, _ in iv)))
        t += timedelta(hours=1)
    print(f"Agents holding a card at the same time, hour by hour over the window: mean {st.mean(counts):.1f}, most {max(counts)}, hours with none {sum(1 for c in counts if c == 0)} of {len(counts)}.\n")

# ----------------------------------------------------------------------------------------------------- queue / blocked
if want("blocked"):
    h2("Blocked cards")
    bl = [e for e in EV if e["blocked_by"]]
    rows = []
    for e in bl:
        ds = [ev for ev in (next((x for x in EV if x["id"] == b), None) for b in e["blocked_by"]) if ev and ev["done"]]
        if not ds or not e["claim"]:
            continue
        free = max(d["done"] for d in ds)
        rows.append((e["id"], e["created"], free, e["claim"], hrs(e["created"], max(free, e["created"])), max(0.0, hrs(free, e["claim"]))))
    print(f"{len(bl)} of {len(EV)} cards named a blocker; for the {len(rows)} whose blockers and own claim are on the board: waiting for the blocker "
          f"(card made to blocker done) {stats([r[4] for r in rows])}; claimed after the blocker was done {stats([r[5] for r in rows])}.\n")
    chains = collections.Counter(e["blocked_by"][0] for e in bl)
    table(["blocker", "cards it held up"], chains.most_common(8))

# ----------------------------------------------------------------------------------------------------- git
MERGES = []
if (REPO / ".git").exists() or (REPO / ".git").is_file():
    for l in git("log", "--merges", "--format=%H\t%P\t%an\t%aI\t%s").splitlines():
        h, ps, an, at, s = l.split("\t", 4)
        MERGES.append(dict(h=h, p=ps.split(), an=an, at=P(at), s=s))


def kind_of(m):
    s = m["s"]
    if re.match(r"Merge (branch '(?!main)|space-game)", s):
        return "branch into main (ORCH)"
    if re.match(r"Merge (branch 'main'|main)", s):
        return "main into a branch (its agent)"
    return "other"


def replay(m):
    if len(m["p"]) != 2:
        return None
    r = subprocess.run(["git", "merge-tree", "--write-tree", "--name-only", m["p"][0], m["p"][1]], cwd=REPO, capture_output=True, text=True)
    if r.returncode == 0:
        return []
    return r.stdout.split("\n\n")[0].splitlines()[1:]   # --name-only: the tree id, then the files in conflict; the messages come after a blank line


CONFLICTS = None
if MERGES and (want("merges") or want("conflicts")):
    CONFLICTS = {m["h"]: replay(m) for m in MERGES}

if want("merges") and MERGES:
    h2("Merges")
    k = collections.Counter(kind_of(m) for m in MERGES)
    print(f"{len(MERGES)} merge commits in {len(git('log', '--format=%h').split())} commits.\n")
    rows = []
    for name in k:
        ms = [m for m in MERGES if kind_of(m) == name and CONFLICTS.get(m["h"]) is not None]
        c = [m for m in ms if CONFLICTS[m["h"]]]
        rows.append((name, len(ms), len(c), f"{100 * len(c) / len(ms):.0f}%" if ms else "-"))
    table(["kind of merge", "merges", "with real conflicts (replayed with git merge-tree)", "share"], rows)
    # review -> merge on main
    cards = {e["id"]: e for e in EV}
    lat = []
    for m in MERGES:
        mm = re.match(r"Merge (?:branch ')?(" + re.escape(A.prefix) + r"[\w-]*)", m["s"])
        if mm and kind_of(m).startswith("branch into main") and mm.group(1) in cards and cards[mm.group(1)]["review"]:
            d = hrs(cards[mm.group(1)]["review"], m["at"])
            if -1 < d < 48:
                lat.append(max(d, 0))
    if lat:
        print(f"Card marked ready for review to its merge commit on main: {stats(lat)}; merged within 10 minutes: {sum(1 for x in lat if x <= 1 / 6)} of {len(lat)}.\n")
    synced = collections.Counter(re.search(r"into (" + re.escape(A.prefix) + r"[\w-]*)", m["s"]).group(1) for m in MERGES if kind_of(m).startswith("main into") and re.search(r"into (" + re.escape(A.prefix) + r"[\w-]*)", m["s"]))
    print(f"Branches that had main merged into them {len(synced)}; more than once: {sum(1 for v in synced.values() if v > 1)}; most: "
          f"{', '.join(f'{k[len(A.prefix) + 1:]} x{v}' for k, v in synced.most_common(5))}.\n")

if want("conflicts") and CONFLICTS:
    h2("Which files conflict")
    files = collections.Counter(f for fs in CONFLICTS.values() if fs for f in set(fs))
    nconf = sum(1 for fs in CONFLICTS.values() if fs)
    print(f"{nconf} of {len(CONFLICTS)} merges conflicted. Files in conflict (a merge counts a file once):\n")
    table(["file", "merges", "share of conflicting merges"], [(f, n, f"{100 * n / nconf:.0f}%") for f, n in files.most_common(12)])

# ----------------------------------------------------------------------------------------------------- size and fit
if want("size") and MERGES and DONE:
    h2("Size of a card against its build time")
    cards = {e["id"]: e for e in EV}
    rows = []
    for m in MERGES:
        mm = re.match(r"Merge (?:branch ')?(" + re.escape(A.prefix) + r"[\w-]*)", m["s"])
        if not mm or len(m["p"]) != 2 or mm.group(1) not in cards or not kind_of(m).startswith("branch into main"):
            continue
        e = cards[mm.group(1)]
        if not (e["claim"] and e["review"]):
            continue
        out = git("diff", "--shortstat", m["p"][0], m["h"])
        nums = [int(x) for x in re.findall(r"(\d+) (?:insertion|deletion)", out)]
        rows.append((e, sum(nums), hrs(e["claim"], e["review"]), CONFLICTS and CONFLICTS.get(m["h"])))
    if rows:
        bands = [("under 100 lines", 0, 100), ("100 to 499", 100, 500), ("500 to 1,999", 500, 2000), ("2,000 and more", 2000, 10 ** 9)]
        table(["lines changed by the branch", "cards", "median build", "p90 build", "build hours"],
              [(n, len(v), f"{st.median(v):.2f} h", f"{pct(v, .9):.2f} h", f"{sum(v):.1f}") for n, lo, hi in bands for v in [[r[2] for r in rows if lo <= r[1] < hi]] if v])
        print(f"{len(rows)} merged cards; the largest: " + ", ".join(f"{r[0]['id'][len(A.prefix) + 1:]} ({r[1]:,} lines, {r[2]:.1f} h)" for r in sorted(rows, key=lambda r: -r[1])[:5]) + ".\n")

if want("fit") and DONE:
    h2("Which agent did which kind of card")
    cell = collections.defaultdict(list)
    for e in DONE:
        if e["agent"] and e["claim"] and e["review"]:
            cell[(KIND(e), e["agent"])].append(hrs(e["claim"], e["review"]))
    agents = sorted({a for _, a in cell})
    kinds_ = sorted({k for k, _ in cell}, key=lambda k: -sum(len(v) for (kk, _), v in cell.items() if kk == k))
    table(["kind (median build in hours, cards)"] + agents, [[k] + [f"{st.median(cell[(k, a)]):.2f} ({len(cell[(k, a)])})" if cell.get((k, a)) else "" for a in agents] for k in kinds_])

# ----------------------------------------------------------------------------------------------------- test logs
if want("tests"):
    h2("Test runs and the Chrome lock")
    if not A.logs or not os.path.isdir(A.logs):
        print("(no --logs folder given: pass the folder that holds the agents' test output files to measure lock waits)\n")
    else:
        W = re.compile(r"test lock: waiting for another Long Haul test run: pid \d+, (\S+), running (\d+) s")
        per, holders, passes, fails, failsteps = [], collections.Counter(), 0, 0, collections.Counter()
        smoke_runs = []   # (wall hours from the file's birth to its last write, wait lines) of every finished smoke
        for root, _, fs in os.walk(A.logs):
            for f in fs:
                if not f.endswith((".txt", ".output", ".log")):
                    continue
                try:
                    s = open(os.path.join(root, f), errors="ignore").read()
                except OSError:
                    continue
                if "test lock: waiting" not in s:
                    continue
                w = W.findall(s)
                per.append(len(w))
                holders.update(os.path.basename(x[0]) for x in w)
                passes += "SMOKE PASS" in s
                fails += "SMOKE FAIL" in s
                if "SMOKE PASS" in s or "SMOKE FAIL" in s:
                    stt = os.stat(os.path.join(root, f))
                    born = getattr(stt, "st_birthtime", None)
                    if born and stt.st_mtime > born:
                        smoke_runs.append(((stt.st_mtime - born) / 3600, len(w)))
                failsteps.update(m.group(1) for m in re.finditer(r"^([A-Z][A-Z0-9 ]+) FAIL", s, re.M) if m.group(1) != "SMOKE")
        if per:
            print(f"{len(per)} test logs recorded waiting for the one Chrome lock: {sum(per)} wait lines, 30 s each = about {sum(per) * 30 / 3600:.1f} hours of runs queued "
                  f"(per log: median {st.median(per) * 30 / 60:.1f} min, p90 {pct(per, .9) * 30 / 60:.0f} min, max {max(per) * 30 / 3600:.1f} h). Smoke runs that finished: "
                  f"{passes} passed, {fails} failed.\n")
            if smoke_runs:
                full = [r for r in smoke_runs if r[0] > 0.1]
                own = [max(h - n * 30 / 3600, 0) for h, n in full]
                print(f"The {len(full)} full smoke runs whose log shows when it started and ended took {stats([h for h, _ in full])} wall-clock; "
                      f"{sum(n for _, n in full) * 30 / 3600:.1f} h of that was waiting for the lock, so the tests themselves took about {st.median(own):.2f} h (median) per run.\n")
            table(["test script holding the lock", "wait lines it caused", "about"], [(h, n, f"{n * 30 / 3600:.1f} h") for h, n in holders.most_common(8)])
            table(["failing step", "runs"], failsteps.most_common())
        else:
            print("(no log under --logs mentioned the test lock)\n")

# ----------------------------------------------------------------------------------------------------- chat
if want("chat"):
    h2("The board chat")
    chat = {}
    for f in sorted(glob.glob(str(BOARD / "backups" / "tasks-*.json.gz"))):
        try:
            for m in json.load(gzip.open(f)).get("chat", []):
                chat[m["seq"]] = m
        except (OSError, ValueError):
            pass
    for m in DATA.get("chat", []):
        chat[m["seq"]] = m
    t0 = min(e["created"] for e in EV).isoformat()
    lines = sorted((m for m in chat.values() if m["at"] >= t0), key=lambda m: m["seq"])
    if not lines:
        print("(no chat in the window)\n")
    else:
        sender = collections.Counter(m.get("sender") for m in lines)
        print(f"{len(lines)} chat lines in the window (#{lines[0]['seq']} to #{lines[-1]['seq']}, none missing from the snapshots): "
              + ", ".join(f"{k} {v}" for k, v in sender.most_common()) + ".\n")
        orch = [m for m in lines if (m.get("sender") or "").upper() == "ORCH"]
        print(f"ORCH wrote {len(orch)} ({100 * len(orch) / len(lines):.0f}%); {sum(1 for m in orch if not m.get('to'))} with no recipient (every agent's inbox), "
              f"{sum(1 for m in orch if re.search(r'(?i)status check', m['text']))} were status checks from the owner, "
              f"{sum(1 for m in orch if re.search(r'(?i)(merged|is merged|merges)', m['text']))} announce a merge, "
              f"{sum(1 for m in orch if re.search(r'(?i)(next:|next for you|claim |take |is yours|you are free)', m['text']))} hand out work.\n")
        # the wait for the next assignment: an agent's review line to ORCH's next line addressed to it
        cards = {e["id"]: e for e in EV}
        gaps = []
        for e in DONE:
            if not e["agent"] or not e["review"]:
                continue
            nxt = [m for m in orch if (m.get("to") or "").lower() == e["agent"].lower() and P(m["at"]) > e["review"] and re.search(r"(?i)(next|claim|take|yours|free|assign)", m["text"])]
            if nxt:
                gaps.append(hrs(e["review"], P(nxt[0]["at"])))
        gaps = [g for g in gaps if g < 6]
        if gaps:
            print(f"From a card's review to ORCH's next line to that agent that hands out work: {stats(gaps)} (lines within 6 hours only; {len(gaps)} cards).\n")
        dup = collections.Counter((m.get("sender"), re.sub(r"\W+", " ", m["text"].lower())[:90]) for m in lines)
        print(f"Lines the same sender wrote twice or more with the same opening: {sum(1 for v in dup.values() if v > 1)}.\n")

# ----------------------------------------------------------------------------------------------------- waste
if want("waste"):
    h2("Duplicated, wasted and badly aimed work")
    twins = [e["id"] for e in EV if re.search(r"-\d$", e["id"])]
    again = sum(1 for t in CARDS for e in (t.get("log") or []) if "announced this work again" in text_of(e))
    nope = [e for e in EV if re.search(r"(?i)(not reproduced|not a duplicate|was headless chrome|not the game|already (on|in) main|nothing to fix|no change needed)", e["result"] + " " + e["title"])]
    print(f"Cards whose id ends in a number (a twin or a numbered follow-up): {len(twins)} ({', '.join(twins)}). Times an agent announced work on a card again and the board kept the one card: {again}.\n")
    print(f"Cards whose result says the premise was wrong or the work was already done: {len(nope)}.\n")
    specs = [e for e in EV if e["spec"]]
    print(f"Cards whose title or description was edited after they were made: {len(specs)} ({', '.join(f'{e[chr(105)+chr(100)][len(A.prefix) + 1:]} x{e[chr(115)+chr(112)+chr(101)+chr(99)]}' for e in sorted(specs, key=lambda e: -e['spec'])[:8])}); "
          f"\"Be simpler\" replies from the owner: {sum(e['simpler'] for e in EV)} on {sum(1 for e in EV if e['simpler'])} cards.\n")
    table(["card", "result (first 110 characters)"], [(e["id"][len(A.prefix) + 1:], e["result"][:110].replace("|", "/")) for e in nope[:8]])

# ----------------------------------------------------------------------------------------------------- models
if want("models") and MERGES:
    h2("Models and agents")
    models = collections.Counter(re.sub(r"\s*<.*", "", l.split(":", 1)[1]).strip() for l in git("log", "--format=%b").splitlines() if l.lower().startswith("co-authored-by:"))
    print("Commits by `Co-Authored-By` model: " + ", ".join(f"{k} {v}" for k, v in models.most_common()) + ".\n")
    cards = {e["id"]: e for e in EV}
    by_agent = collections.defaultdict(collections.Counter)
    for m in MERGES:
        mm = re.match(r"Merge (?:branch ')?(" + re.escape(A.prefix) + r"[\w-]*)", m["s"])
        if not mm or len(m["p"]) != 2 or mm.group(1) not in cards or not kind_of(m).startswith("branch into main"):
            continue
        for body in git("log", "--format=%b%x00", f"{m['p'][0]}..{m['p'][1]}").split("\x00"):
            for l in body.splitlines():
                if l.lower().startswith("co-authored-by:"):
                    by_agent[cards[mm.group(1)]["agent"] or "-"][re.sub(r"\s*<.*", "", l.split(":", 1)[1]).strip()] += 1
    table(["agent (holder of the merged cards)", "commits by model"], [(a, ", ".join(f"{k} {v}" for k, v in c.most_common())) for a, c in sorted(by_agent.items())])
