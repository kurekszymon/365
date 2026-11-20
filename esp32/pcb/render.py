"""Render perfboard views (top + solder side) and schematic as SVG strings."""
import json, sys
D = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
P = 20            # px per hole
OX, OY = 34, 30   # origin offset for axis labels
ROWS, COLS = 24, 30
NETS = ["V24", "GND", "DRAIN", "GATE", "PWM", "V5", "V5B", "BTN", "POT", "V3"]

def xy(r, c, mirror=False):
    cc = COLS + 1 - c if mirror else c
    return OX + (cc - 0.5) * P, OY + (r - 0.5) * P

def rect_body(r0, c0, r1, c1, mirror=False):
    x0, y0 = xy(r0, c0, mirror)
    x1, y1 = xy(r1, c1, mirror)
    return min(x0, x1), y0, abs(x1 - x0), y1 - y0

def poly_pts(poly, mirror):
    return " ".join(f"{xy(r, c, mirror)[0]:.1f},{xy(r, c, mirror)[1]:.1f}" for r, c in poly)

def board(view):
    m = view == "bottom"
    W, H = OX + COLS * P + 12, OY + ROWS * P + 12
    s = [f'<svg viewBox="0 0 {W} {H}" class="pb" role="img" aria-label="{"Solder side" if m else "Component side"} perfboard layout">']
    s.append(f'<rect class="board" x="{OX - 6}" y="{OY - 6}" width="{COLS * P + 12}" height="{ROWS * P + 12}" rx="6"/>')
    for c in range(1, COLS + 1):
        x, _ = xy(1, c, m)
        if c % 2:
            s.append(f'<text class="ax" x="{x:.1f}" y="{OY - 12}">{c}</text>')
    for r in range(1, ROWS + 1):
        _, y = xy(r, 1)
        s.append(f'<text class="ax" x="{OX - 16}" y="{y + 3.5:.1f}">{chr(64 + r)}</text>')
    for r in range(1, ROWS + 1):
        for c in range(1, COLS + 1):
            x, y = xy(r, c, m)
            s.append(f'<circle class="hole" cx="{x:.1f}" cy="{y:.1f}" r="3.2"/>')

    def traces(cls):
        for net, polys in D["traces"].items():
            for poly in polys:
                s.append(f'<polyline class="{cls} n-{net}" points="{poly_pts(poly, m)}"/>')

    if m:
        traces("tr")
        # every soldered pad
        pads = []
        for p, d in D["parts"].items():
            pads += [(h, net) for _, h, net in d["pins"]]
        for pin, h in D["esp_top"].items():
            pads.append((h, D["esp_used"].get(pin)))
        for i in range(19):
            pads.append(((23, 10 + i), None))
        for k, (h, net) in D["landings"].items():
            pads.append((h, net))
        for (r, c), net in pads:
            x, y = xy(r, c, m)
            cls = f"pad n-{net}" if net else "pad idle"
            s.append(f'<circle class="{cls}" cx="{x:.1f}" cy="{y:.1f}" r="5.2"/>')
        # light ghost of the big modules for orientation
        for nm, lab in (("U2", "ESP32 (on the other side)"), ("U1", "buck module (other side)")):
            r0, c0, r1, c1 = D["bodies"][nm]
            x, y, w, h = rect_body(r0, c0, r1, c1, m)
            s.append(f'<rect class="ghost" x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="4"/>')
            ty = y + 16 if nm == "U1" else y + h / 2
            s.append(f'<text class="ghostlab" x="{x + w / 2:.1f}" y="{ty:.1f}">{lab}</text>')
        s.append("</svg>")
        return "".join(s)

    # ---------- top view ----------
    traces("xr")
    B = D["bodies"]
    # buck module zone
    r0, c0, r1, c1 = B["U1"]
    x, y, w, h = rect_body(r0, c0, r1, c1)
    s.append(f'<rect class="mod" x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="5"/>')
    s.append(f'<text class="modlab" x="{x + w / 2:.1f}" y="{y + h / 2 - 6:.1f}">U1 · buck 24→5 V</text>')
    s.append(f'<text class="modsub" x="{x + w / 2:.1f}" y="{y + h / 2 + 10:.1f}">LM2596-size, on foam tape</text>')
    pad_pos = {"IN+": (2.4, 14.4), "IN−": (7.6, 14.4), "OUT+": (2.4, 29.6), "OUT−": (7.6, 29.6)}
    for k, (rr, cc) in pad_pos.items():
        px, py = xy(rr, cc)
        s.append(f'<circle class="modpad" cx="{px:.1f}" cy="{py:.1f}" r="4"/>')
        anchor = "start" if "IN" in k else "end"
        dx = 8 if "IN" in k else -8
        s.append(f'<text class="padlab" text-anchor="{anchor}" x="{px + dx:.1f}" y="{py + 4:.1f}">{k}</text>')
    # ESP32
    r0, c0, r1, c1 = B["U2"]
    x, y, w, h = rect_body(r0, c0, r1, c1)
    s.append(f'<rect class="esp" x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="5"/>')
    ux, uy = xy(18, 8.6)
    s.append(f'<rect class="usb" x="{ux - 10:.1f}" y="{uy - 9:.1f}" width="14" height="18" rx="2"/>')
    s.append(f'<text class="esplab" x="{x + w / 2:.1f}" y="{y + h / 2 + 2:.1f}">U2 · ESP32 DevKit 38-pin</text>')
    s.append(f'<text class="espsub" x="{x + w / 2:.1f}" y="{y + h / 2 + 18:.1f}">USB faces left · sits in two 19-pin female headers</text>')
    for pin, (r, c) in D["esp_top"].items():
        px, py = xy(r, c)
        net = D["esp_used"].get(pin)
        s.append(f'<rect class="hdr {"n-" + net if net else "idle"}" x="{px - 5:.1f}" y="{py - 5:.1f}" width="10" height="10" rx="1.5"/>')
        if net:
            s.append(f'<text class="pinlab" transform="rotate(90 {px:.1f} {py + 10:.1f})" x="{px:.1f}" y="{py + 10 + 3:.1f}">{pin}</text>')
    for i in range(19):
        px, py = xy(23, 10 + i)
        s.append(f'<rect class="hdr idle" x="{px - 5:.1f}" y="{py - 5:.1f}" width="10" height="10" rx="1.5"/>')
    # small parts
    def label(txt, x, y, cls="plab", anchor="middle"):
        s.append(f'<text class="{cls}" text-anchor="{anchor}" x="{x:.1f}" y="{y:.1f}">{txt}</text>')
    for nm in ("J1", "J2", "JP1", "J3", "J4"):
        r0, c0, r1, c1 = B[nm]
        x, y, w, h = rect_body(r0, c0, r1, c1)
        s.append(f'<rect class="{"term" if nm in ("J1", "J2") else "conn"}" x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="2"/>')
    # C1 circle
    cx, cy = xy(4, 6)
    s.append(f'<circle class="cap" cx="{cx:.1f}" cy="{cy:.1f}" r="{1.97 * P:.1f}"/>')
    s.append(f'<path class="capband" d="M{cx - 1.97 * P + 3:.1f},{cy - 10:.1f} A{1.97 * P},{1.97 * P} 0 0 1 {cx + 1.97 * P - 3:.1f},{cy - 10:.1f}" />')
    # Q1
    r0, c0, r1, c1 = B["Q1"]
    x, y, w, h = rect_body(r0, c0, r1, c1)
    s.append(f'<rect class="fet" x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="2"/>')
    # resistors (capsules)
    for nm in ("R1", "R2"):
        (_, a, _), (_, b, _) = D["parts"][nm]["pins"]
        (ax, ay), (bx, by) = xy(*a), xy(*b)
        s.append(f'<line class="lead" x1="{ax:.1f}" y1="{ay:.1f}" x2="{bx:.1f}" y2="{by:.1f}"/>')
        mx, my = (ax + bx) / 2, (ay + by) / 2
        if ay == by:
            s.append(f'<rect class="res" x="{mx - 11:.1f}" y="{my - 5:.1f}" width="22" height="10" rx="5"/>')
        else:
            s.append(f'<rect class="res" x="{mx - 5:.1f}" y="{my - 11:.1f}" width="10" height="22" rx="5"/>')
    for nm in ("C3", "C4"):
        (_, a, _), (_, b, _) = D["parts"][nm]["pins"]
        (ax, ay), (bx, by) = xy(*a), xy(*b)
        mx, my = (ax + bx) / 2, (ay + by) / 2
        s.append(f'<rect class="cer" x="{mx - 9:.1f}" y="{my - 7:.1f}" width="18" height="14" rx="6"/>')
    # pins of small parts
    for p, d in D["parts"].items():
        for lbl, (r, c), net in d["pins"]:
            px, py = xy(r, c)
            s.append(f'<circle class="pin n-{net}" cx="{px:.1f}" cy="{py:.1f}" r="4.4"/>')
    # landing holes for flying wires + wires
    for k, ((r, c), net) in D["landings"].items():
        px, py = xy(r, c)
        rr, cc = pad_pos[k]
        qx, qy = xy(rr, cc)
        s.append(f'<circle class="land n-{net}" cx="{px:.1f}" cy="{py:.1f}" r="5.5"/>')
        midx = (px + qx) / 2
        s.append(f'<path class="wire n-{net}" d="M{qx:.1f},{qy:.1f} C{midx:.1f},{qy:.1f} {midx:.1f},{py:.1f} {px:.1f},{py:.1f}"/>')
    # labels
    J1x, J1y = xy(3, 2); label("J1", J1x, J1y + 4, "ref")
    label("−", J1x - 12, xy(2, 2)[1] + 4, "pm"); label("+", J1x - 12, xy(4, 2)[1] + 4, "pm")
    J2x, J2y = xy(8, 2); label("J2", J2x, J2y + 4, "ref")
    label("+", J2x - 12, xy(7, 2)[1] + 4, "pm"); label("−", J2x - 12, xy(9, 2)[1] + 4, "pm")
    label("C1", cx, cy + 3, "ref")
    qx, qy = xy(5.4, 9); label("Q1", qx, qy + 4, "ref inv")
    for lbl, (r, c), _ in D["parts"]["Q1"]["pins"]:
        px, py = xy(r, c); label(lbl, px - 13, py + 4, "pinmini")
    label("R2", xy(7, 11)[0] + 12, xy(7, 11)[1] + 4, "ref", "start")
    label("R1", xy(10, 11)[0], xy(10, 11)[1] - 9, "ref")
    label("JP1", xy(11, 10)[0] - 12, xy(11, 10)[1] + 4, "ref", "end")
    for nm, (r, c), txt in (("J4", (10, 21.5), "button"), ("J3", (10, 26), "pot")):
        px, py = xy(r, c); label(nm, px, py - 12, "ref")
    for nm, (r, c) in (("C3", (11, 21.5)), ("C4", (11, 25.5))):
        px, py = xy(r, c); label(nm, px, py + 3, "cerlab")
    s.append("</svg>")
    return "".join(s)

top = board("top")
bottom = board("bottom")
json.dump({"top": top, "bottom": bottom}, open(OUT, "w"))
