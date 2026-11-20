"""Perfboard layout for the ESP32 fade lamp: data, checks, SVG output.
Holes are (row, col), row 1..24 = A..X top->bottom, col 1..30 left->right (top view)."""
import json, sys, math
from collections import defaultdict

ROWS, COLS = 24, 30
def name(r, c): return f"{chr(64 + r)}{c}"

# ESP32 38-pin devkit, USB to the left. Top header row 13, bottom header row 23, cols 10..28.
TOP_PINS = ["5V","CMD","SD3","SD2","IO13","GND","IO12","IO14","IO27","IO26","IO25","IO33","IO32","IO35","IO34","IO39","IO36","EN","3V3"]
BOT_PINS = ["CLK","SD0","SD1","IO15","IO2","IO0","IO4","IO16","IO17","IO5","IO18","IO19","GND","IO21","RX0","TX0","IO22","IO23","GND"]
esp_top = {p: (13, 10 + i) for i, p in enumerate(TOP_PINS)}

# Component pins: part -> list of (pin label, (r,c), net)
PARTS = {
  "J1":  {"val": "24 V in", "pins": [("−", (2, 2), "GND"), ("+", (4, 2), "V24")]},
  "J2":  {"val": "LED strip", "pins": [("+", (7, 2), "V24"), ("−", (9, 2), "DRAIN")]},
  "C1":  {"val": "470µF 35V", "pins": [("−", (3, 6), "GND"), ("+", (5, 6), "V24")]},
  "Q1":  {"val": "logic MOSFET", "pins": [("S", (6, 9), "GND"), ("D", (7, 9), "DRAIN"), ("G", (8, 9), "GATE")]},
  "R2":  {"val": "10k", "pins": [("1", (6, 11), "GND"), ("2", (8, 11), "GATE")]},
  "R1":  {"val": "100Ω", "pins": [("1", (10, 10), "GATE"), ("2", (10, 12), "PWM")]},
  "JP1": {"val": "5V link", "pins": [("1", (11, 10), "V5"), ("2", (11, 11), "V5B")]},
  "J4":  {"val": "button", "pins": [("GND", (10, 21), "GND"), ("SW", (10, 22), "BTN")]},
  "C3":  {"val": "100nF", "pins": [("1", (11, 21), "GND"), ("2", (11, 22), "BTN")]},
  "J3":  {"val": "pot", "pins": [("GND", (10, 25), "GND"), ("W", (10, 26), "POT"), ("3V3", (10, 27), "V3")]},
  "C4":  {"val": "100nF", "pins": [("1", (11, 25), "GND"), ("2", (11, 26), "POT")]},
}
ESP_USED = {"5V": "V5", "IO13": "PWM", "GND": "GND", "IO32": "BTN", "IO36": "POT", "3V3": "V3"}

# Landing holes for the buck module's four flying wires
LANDINGS = {"IN+": ((6, 4), "V24"), "IN−": ((3, 12), "GND"), "OUT+": ((11, 12), "V5B"), "OUT−": ((11, 16), "GND")}

def run(a, b):
    (r1, c1), (r2, c2) = a, b
    if r1 == r2: return [(r1, c) for c in range(min(c1, c2), max(c1, c2) + 1)]
    assert c1 == c2, (a, b)
    return [(r, c1) for r in range(min(r1, r2), max(r1, r2) + 1)]

# Solder-side traces: net -> list of polylines (corner points)
TRACES = {
  "V24":  [[(4, 2), (7, 2)], [(5, 2), (5, 6)], [(5, 4), (6, 4)]],
  "GND":  [[(2, 2), (2, 15)], [(2, 6), (3, 6)], [(2, 9), (6, 9), (6, 11)], [(2, 12), (3, 12)],
           [(2, 15), (13, 15)], [(11, 15), (11, 16)], [(9, 15), (9, 25)], [(9, 21), (11, 21)], [(9, 25), (11, 25)]],
  "DRAIN":[[(7, 9), (7, 4), (9, 4), (9, 2)]],
  "GATE": [[(8, 9), (8, 11)], [(8, 9), (10, 9), (10, 10)]],
  "PWM":  [[(10, 12), (10, 14), (13, 14)]],
  "V5":   [[(11, 10), (13, 10)]],
  "V5B":  [[(11, 11), (11, 12)]],
  "BTN":  [[(13, 22), (10, 22)]],
  "POT":  [[(13, 26), (10, 26)]],
  "V3":   [[(13, 28), (11, 28), (11, 27), (10, 27)]],
}

def poly_holes(poly):
    out = []
    for a, b in zip(poly, poly[1:]):
        for h in run(a, b):
            if h not in out: out.append(h)
    return out

# ---------- checks ----------
errors = []
hole_net = {}
def claim(h, net, why):
    r, c = h
    if not (1 <= r <= ROWS and 1 <= c <= COLS): errors.append(f"{why} off board {h}")
    if h in hole_net and hole_net[h] != net: errors.append(f"short at {name(*h)}: {hole_net[h]} vs {net} ({why})")
    hole_net.setdefault(h, net)

nodes = defaultdict(set)  # net -> required holes
for p, d in PARTS.items():
    for lbl, h, net in d["pins"]:
        claim(h, net, f"{p}.{lbl}"); nodes[net].add(h)
for pin, (r, c) in esp_top.items():
    net = ESP_USED.get(pin)
    claim((r, c), net or f"ESP_{pin}_{c}", f"U2.{pin}")
    if net: nodes[net].add((r, c))
for i, p in enumerate(BOT_PINS):
    claim((23, 10 + i), f"ESPB_{p}_{i}", f"U2b.{p}")
for k, (h, net) in LANDINGS.items():
    claim(h, net, f"wire {k}"); nodes[net].add(h)
for net, polys in TRACES.items():
    for poly in polys:
        for h in poly_holes(poly): claim(h, net, f"trace {net}")

# connectivity per net via trace adjacency
for net, polys in TRACES.items():
    parent = {}
    def f(x):
        while parent.setdefault(x, x) != x: x = parent[x]
        return x
    for poly in polys:
        hs = poly_holes(poly)
        for a, b in zip(hs, hs[1:]): parent[f(a)] = f(b)
    roots = {f(h) for h in nodes[net]}
    if len(roots) != 1: errors.append(f"net {net} split into {len(roots)} groups: {[name(*h) for h in nodes[net]]}")
for net in nodes:
    if net not in TRACES: errors.append(f"net {net} has no trace")

# body overlap check (axis-aligned rects / circles approximated as rects), in hole units
BODIES = {
  "J1": (0.9, 0.5, 5.1, 3.5), "J2": (5.9, 0.5, 10.1, 3.5),
  "C1": (2.03, 4.03, 5.97, 7.97), "Q1": (5.0, 8.1, 9.0, 9.9),
  "R2": (6.0, 10.6, 8.0, 11.4), "R1": (9.6, 10.0, 10.4, 12.0),
  "JP1": (10.5, 9.5, 11.5, 11.5), "J4": (9.5, 20.5, 10.5, 22.5), "J3": (9.5, 24.5, 10.5, 27.5),
  "U1": (0.87, 13.53, 9.13, 30.47), "U2": (12.49, 8.37, 23.51, 29.63),
}
names = list(BODIES)
for i in range(len(names)):
    for j in range(i + 1, len(names)):
        a, b = BODIES[names[i]], BODIES[names[j]]
        if a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]:
            errors.append(f"body overlap {names[i]} / {names[j]}")
# landing holes must not sit under a body
for k, (h, _) in LANDINGS.items():
    for nm, (r0, c0, r1, c1) in BODIES.items():
        if r0 < h[0] < r1 and c0 < h[1] < c1: errors.append(f"landing {k} under {nm}")

if errors:
    print("\n".join(errors)); sys.exit(1)
print("OK: no shorts, every net connected, no body overlaps")
for net, polys in TRACES.items():
    print(net, "->", "; ".join(" → ".join(name(*p) for p in poly) for poly in polys))

# ---------- export ----------
json.dump({
  "parts": PARTS, "esp_top": esp_top, "esp_used": ESP_USED, "bot_pins": BOT_PINS,
  "landings": LANDINGS, "traces": TRACES, "bodies": BODIES,
}, open(sys.argv[1], "w"), ensure_ascii=False, default=list)
