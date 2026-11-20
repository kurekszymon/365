import json, sys
D = json.load(open("layout.json")); V = json.load(open("views.json"))
sch = open("schematic.svg").read().replace('viewBox="0 0 1000 560"', 'viewBox="0 0 1030 560"')
def nm(h): return f"{chr(64 + h[0])}{h[1]}"

NET_INFO = [
  ("V24", "+24 V", "adapter → LED strip +, C1, buck input", True),
  ("GND", "GND", "adapter −, MOSFET source, ESP32, controls", True),
  ("DRAIN", "LED −", "MOSFET drain → strip −", True),
  ("GATE", "Gate", "Q1 gate, R1, R2 pull-down", False),
  ("PWM", "IO13", "ESP32 PWM → R1", False),
  ("V5B", "5 V buck", "buck OUT+ → JP1", False),
  ("V5", "5 V", "JP1 → ESP32 5V pin", False),
  ("BTN", "IO32", "button, C3", False),
  ("POT", "IO36", "pot wiper, C4", False),
  ("V3", "3V3", "ESP32 3V3 → pot", False),
]
rows = []
for key, label, what, hc in NET_INFO:
    runs = " · ".join(" → ".join(nm(p) for p in poly) for poly in D["traces"][key])
    wire = "1 mm bare copper" if hc else "0.5 mm wire or solder bridge"
    rows.append(f'<tr data-net="{key}"><td><span class="chip n-{key}"></span>{label}</td><td>{what}</td><td class="mono">{runs}</td><td>{wire}</td></tr>')
legend = "".join(f'<button type="button" class="leg" data-net="{k}" id="leg-{k}"><span class="chip n-{k}"></span>{l}</button>' for k, l, *_ in NET_INFO)

tpl = open("page.html").read()
html = (tpl.replace("{{SCHEMATIC}}", sch).replace("{{TOP}}", V["top"]).replace("{{BOTTOM}}", V["bottom"])
           .replace("{{TRACE_ROWS}}", "\n".join(rows)).replace("{{LEGEND}}", legend))
open(sys.argv[1], "w").write(html)
print(len(html))
