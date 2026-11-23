#include <WiFi.h>
#include <WebServer.h>

const char *ssid = "network";
const char *password = "password";

// Pin connected to the MOSFET gate (GPIO 17 / TX2)
const int LED_PIN = 17;

// PWM settings: 5000 Hz prevents COB strip flicker,
// 12 bits (0–4095) gives smooth dimming at low brightness
const int PWM_FREQ = 5000;
const int PWM_RES = 12;
const int PWM_MAX = (1 << PWM_RES) - 1; // 4095

// Gamma correction: 2.2–2.8. Higher = faster drop at the start, slower at the end
const float GAMMA = 2.2;

// Minimum duty at which the strip still lights up (0 = disabled).
// If the strip goes dark before the timer ends, raise it to e.g. 20–60.
const int MIN_DUTY = 0;

// Timer length limits in seconds
const int TIMER_MIN_SECS = 1;
const int TIMER_MAX_SECS = 60 * 60;

// Perceived brightness 0–255 (what the eye sees), NOT the PWM duty
float targetBrightness = 0;
float currentBrightness = 0;
float initialBrightnessAtStart = 0;

// Timer
unsigned long timerDurationMs = 0;
unsigned long timerStartTime = 0;
bool timerActive = false;

WebServer server(80);

// Web page with a brightness slider and a timer panel.
// The page reads /state on open and when the tab becomes visible again.
// While the timer runs it polls every 2 s and draws the countdown locally in between.
const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE HTML>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#121014">
  <title>Lampka</title>
  <style>
    :root { --bg: #121014; --card: #1b191e; --line: #2d2a31; --ink: #f3eee7; --muted: #9d958c;
            --amber: #ffb547; --on-amber: #1f1405; --ok: #6fd39a; --bad: #ff7a6b; --b: 0; color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: var(--bg); color: var(--ink);
           font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; }
    body::before { content: ""; position: fixed; inset: 0; pointer-events: none;
           background: radial-gradient(60% 45% at 50% 22%, rgba(255, 170, 60, calc(var(--b) * .28)), transparent 70%); }
    main { position: relative; width: 100%; max-width: 420px; padding: 20px 16px 40px; display: grid; gap: 18px; }
    header { display: flex; align-items: center; justify-content: space-between; }
    h1 { margin: 0; font-size: 22px; letter-spacing: -.01em; }
    h2 { margin: 0; font-size: 12px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
    .conn { font-size: 13px; color: var(--muted); display: inline-flex; align-items: center; gap: 7px; }
    .conn::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--muted); }
    .conn.ok::before { background: var(--ok); box-shadow: 0 0 0 3px rgba(111, 211, 154, .18); }
    .conn.off { color: var(--bad); }
    .conn.off::before { background: var(--bad); }

    .lamp { position: relative; width: min(250px, 70vw); aspect-ratio: 1; margin: 6px auto 4px; display: grid; place-items: center; }
    .lamp svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
    .track, .ring { fill: none; stroke-width: 5; }
    .track { stroke: var(--line); }
    .ring { stroke: var(--amber); stroke-linecap: round; opacity: 0; transition: opacity .3s; }
    .lamp.running .ring { opacity: 1; }
    .bulb { width: 74%; aspect-ratio: 1; border-radius: 50%; display: grid; place-items: center; text-align: center;
            border: 1px solid rgba(255, 190, 110, calc(.12 + var(--b) * .5));
            background: radial-gradient(circle at 50% 38%,
              rgba(255, 222, 165, calc(.06 + var(--b) * .94)),
              rgba(255, 168, 60, calc(.04 + var(--b) * .7)) 62%,
              rgba(255, 140, 30, calc(var(--b) * .55)) 100%);
            box-shadow: 0 0 calc(var(--b) * 90px) calc(var(--b) * 14px) rgba(255, 165, 55, calc(var(--b) * .55)); }
    .big { font-size: 46px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; letter-spacing: -.02em; }
    .small { margin-top: 6px; font-size: 13px; color: var(--muted); }
    .lamp.lit .big { color: var(--on-amber); }
    .lamp.lit .small { color: rgba(31, 20, 5, .7); }

    .card { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 16px; display: grid; gap: 14px; }
    .row { display: flex; align-items: baseline; justify-content: space-between; }
    .value { font-weight: 700; font-variant-numeric: tabular-nums; }

    input[type=range] { -webkit-appearance: none; appearance: none; width: 100%; height: 32px; margin: 0; background: transparent; --fill: 0%; }
    input[type=range]::-webkit-slider-runnable-track { height: 10px; border-radius: 99px;
           background: linear-gradient(90deg, var(--amber) var(--fill), var(--line) var(--fill)); }
    input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 28px; height: 28px; margin-top: -9px; border-radius: 50%;
           background: var(--ink); border: 4px solid var(--amber); box-shadow: 0 2px 8px rgba(0, 0, 0, .5); }
    input[type=range]::-moz-range-track { height: 10px; border-radius: 99px; background: var(--line); }
    input[type=range]::-moz-range-progress { height: 10px; border-radius: 99px; background: var(--amber); }
    input[type=range]::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: var(--ink); border: 4px solid var(--amber); }
    input[type=range]:disabled { opacity: .35; }

    .chips { display: flex; gap: 8px; }
    .chips button { flex: 1; min-width: 0; padding: 9px 0; border-radius: 10px; border: 1px solid var(--line); background: transparent;
           color: var(--ink); font: inherit; font-size: 14px; cursor: pointer; font-variant-numeric: tabular-nums; }
    .chips button.on { border-color: var(--amber); color: var(--amber); background: rgba(255, 181, 71, .08); }
    .chips button:disabled { opacity: .35; cursor: default; }

    .primary, .ghost { width: 100%; padding: 15px; border-radius: 14px; font: inherit; font-weight: 700; cursor: pointer; }
    .primary { border: 0; background: var(--amber); color: var(--on-amber); }
    .primary:disabled { background: var(--line); color: var(--muted); cursor: not-allowed; }
    .ghost { background: transparent; border: 1px solid var(--line); color: var(--ink); }
    [hidden] { display: none !important; }
    .hint { margin: 0; min-height: 1.4em; font-size: 13px; color: var(--muted); text-align: center; }
    button:focus-visible, input:focus-visible { outline: 2px solid var(--amber); outline-offset: 3px; }
    @media (prefers-reduced-motion: no-preference) {
      .bulb { transition: box-shadow .25s, background .25s; }
      .chips button, .primary { transition: background .15s, border-color .15s, color .15s; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Lampka</h1>
      <span class="conn" id="conn">łączenie…</span>
    </header>

    <div class="lamp" id="lamp">
      <svg viewBox="0 0 240 240" aria-hidden="true">
        <circle class="track" cx="120" cy="120" r="114"/>
        <circle class="ring" id="ring" cx="120" cy="120" r="114"/>
      </svg>
      <div class="bulb" aria-live="polite">
        <div><div class="big" id="big">–</div><div class="small" id="small">jasność</div></div>
      </div>
    </div>

    <section class="card">
      <div class="row"><h2>Jasność</h2><span class="value" id="bVal">0%</span></div>
      <input type="range" min="0" max="255" value="0" id="slider" aria-label="Jasność">
      <div class="chips" id="bChips">
        <button data-v="0">Wył.</button><button data-v="64">25%</button><button data-v="128">50%</button>
        <button data-v="191">75%</button><button data-v="255">100%</button>
      </div>
    </section>

    <section class="card">
      <div class="row"><h2>Wygaszanie</h2><span class="value" id="tVal">15 min</span></div>
      <!-- 1 step = 1 min, so the range is 1 to 60 min -->
      <input type="range" min="1" max="60" value="15" id="timerSlider" aria-label="Czas wygaszania">
      <div class="chips" id="tChips">
        <button data-v="5">5 min</button><button data-v="10">10 min</button><button data-v="15">15 min</button>
        <button data-v="30">30 min</button><button data-v="60">60 min</button>
      </div>
      <button id="startBtn" class="primary">Zacznij wygaszanie</button>
      <button id="cancelBtn" class="ghost" hidden>Przerwij wygaszanie</button>
      <p id="status" class="hint"></p>
    </section>
  </main>
  <script>
    const $ = (id) => document.getElementById(id);
    const root = document.documentElement, lamp = $("lamp"), ring = $("ring");
    const slider = $("slider"), timerSlider = $("timerSlider"), bChips = $("bChips"), tChips = $("tChips");
    const startBtn = $("startBtn"), cancelBtn = $("cancelBtn"), statusEl = $("status");
    const CIRC = 2 * Math.PI * 114;
    ring.style.strokeDasharray = CIRC;

    let s = { brightness: 0, timerActive: false, remainingMs: 0, durationMs: 0 };
    let syncedAt = 0;       // performance.now() of the last /state answer
    let dragging = false;   // don't overwrite the slider while the user is moving it
    let busy = false;       // a request is in flight
    let pendingVal = null;  // latest brightness waiting to be sent
    let raf = 0, lastEndCheck = 0;

    const fmtMinutes = (m) => m + " min";
    function fmtClock(ms) {
      const t = Math.ceil(ms / 1000);
      return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");
    }
    const pct = (v) => Math.round((v / 255) * 100);
    const fill = (el) => el.style.setProperty("--fill", ((el.value - el.min) / (el.max - el.min)) * 100 + "%");
    const markChip = (box, v) => box.querySelectorAll("button").forEach((b) => b.classList.toggle("on", +b.dataset.v === +v));

    function setConn(ok) {
      const c = $("conn");
      c.className = "conn " + (ok ? "ok" : "off");
      c.textContent = ok ? "połączono" : "brak połączenia";
    }

    function showLevel(v) {
      root.style.setProperty("--b", (v / 255).toFixed(3));
      lamp.classList.toggle("lit", v > 140);
      $("bVal").textContent = pct(v) + "%";
    }

    function hint() {
      if (s.timerActive) statusEl.textContent = "Ruszenie suwaka jasności przerwie wygaszanie.";
      else if (s.brightness === 0) statusEl.textContent = "Najpierw włącz lampkę.";
      else statusEl.textContent = "Lampka będzie się ściemniać przez " + fmtMinutes(timerSlider.value) + ", aż zgaśnie.";
    }

    // Draws the lamp; while the timer runs it interpolates between /state answers
    function draw() {
      raf = 0;
      if (s.timerActive) {
        const rem = Math.max(0, s.remainingMs - (performance.now() - syncedAt));
        const level = s.remainingMs > 0 ? s.brightness * (rem / s.remainingMs) : 0;
        if (!dragging) { showLevel(level); slider.value = Math.round(level); fill(slider); }
        $("big").textContent = fmtClock(rem);
        $("small").textContent = "do zgaszenia";
        ring.style.strokeDashoffset = CIRC * (1 - (s.durationMs ? rem / s.durationMs : 0));
        const now = performance.now();
        if (rem === 0 && !busy && now - lastEndCheck > 800) { lastEndCheck = now; request("/state"); }
        raf = requestAnimationFrame(draw);
      } else {
        const v = dragging ? +slider.value : s.brightness;
        showLevel(v);
        $("big").textContent = pct(v) + "%";
        $("small").textContent = v > 0 ? "jasność" : "wyłączona";
      }
    }

    function render(next) {
      s = next;
      syncedAt = performance.now();
      setConn(true);
      if (!dragging) { slider.value = s.brightness; fill(slider); markChip(bChips, s.brightness); }
      timerSlider.disabled = s.timerActive;
      tChips.querySelectorAll("button").forEach((b) => (b.disabled = s.timerActive));
      startBtn.hidden = s.timerActive;
      startBtn.disabled = s.brightness === 0;
      cancelBtn.hidden = !s.timerActive;
      lamp.classList.toggle("running", s.timerActive);
      hint();
      if (!raf) draw();
    }

    async function request(url) {
      busy = true;
      try {
        const res = await fetch(url);
        render(await res.json());
      } catch (e) {
        setConn(false);
        statusEl.textContent = "Nie mogę połączyć się z lampką. Sprawdź, czy telefon jest w tej samej sieci Wi‑Fi.";
      } finally {
        busy = false;
      }
    }

    // Send only the newest slider value instead of queueing dozens of requests
    async function flushBrightness() {
      if (busy) return;
      while (pendingVal !== null) {
        const v = pendingVal;
        pendingVal = null;
        await request("/set?val=" + v);
      }
    }
    function setBrightness(v) {
      slider.value = v; fill(slider); markChip(bChips, v);
      showLevel(+v);
      $("big").textContent = pct(v) + "%";
      pendingVal = v;
      flushBrightness();
    }

    slider.addEventListener("pointerdown", () => { dragging = true; });
    window.addEventListener("pointerup", () => { dragging = false; });
    window.addEventListener("pointercancel", () => { dragging = false; });
    slider.addEventListener("input", () => setBrightness(slider.value));
    bChips.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) setBrightness(b.dataset.v); });

    function updateTimer() {
      $("tVal").textContent = fmtMinutes(timerSlider.value);
      fill(timerSlider); markChip(tChips, timerSlider.value); hint();
    }
    timerSlider.addEventListener("input", updateTimer);
    tChips.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { timerSlider.value = b.dataset.v; updateTimer(); } });

    startBtn.addEventListener("click", () => request("/timer?secs=" + timerSlider.value * 60));
    cancelBtn.addEventListener("click", () => request("/cancel"));

    // Poll only while the timer runs; the countdown in between is drawn locally
    setInterval(() => {
      if (s.timerActive && !busy && !dragging && pendingVal === null) request("/state");
    }, 2000);

    // Load the state once on open, and again when the tab comes back into view
    updateTimer();
    request("/state");
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && !busy) request("/state");
    });
  </script>
</body>
</html>
)rawliteral";

// Perceived brightness (0–255) -> gamma-corrected PWM duty
void writeLed(float level)
{
  if (level <= 0)
  {
    ledcWrite(LED_PIN, 0);
    return;
  }
  float norm = level / 255.0;
  int duty = MIN_DUTY + (int)(pow(norm, GAMMA) * (PWM_MAX - MIN_DUTY) + 0.5);
  ledcWrite(LED_PIN, duty);
}

// Respond with the current state as JSON; every endpoint uses this
void sendState()
{
  unsigned long remainingMs = 0;
  if (timerActive)
  {
    unsigned long elapsed = millis() - timerStartTime;
    if (elapsed < timerDurationMs)
    {
      remainingMs = timerDurationMs - elapsed;
    }
  }

  char json[128];
  snprintf(json, sizeof(json),
           "{\"brightness\":%d,\"timerActive\":%s,\"remainingMs\":%lu,\"durationMs\":%lu}",
           (int)(targetBrightness + 0.5),
           timerActive ? "true" : "false",
           remainingMs,
           timerActive ? timerDurationMs : 0UL);
  server.send(200, "application/json", json);
}

void handleRoot()
{
  server.send(200, "text/html", index_html);
}

void handleState()
{
  sendState();
}

void handleSet()
{
  if (server.hasArg("val"))
  {
    targetBrightness = constrain(server.arg("val").toInt(), 0, 255);
    timerActive = false; // Cancel the timer when the slider is moved
  }
  sendState();
}

void handleTimer()
{
  if (server.hasArg("secs") && currentBrightness > 0)
  {
    int secs = constrain(server.arg("secs").toInt(), TIMER_MIN_SECS, TIMER_MAX_SECS);
    timerDurationMs = (unsigned long)secs * 1000UL;
    timerStartTime = millis();
    initialBrightnessAtStart = currentBrightness;
    timerActive = true;
  }
  sendState();
}

void handleCancel()
{
  if (timerActive)
  {
    timerActive = false;
    targetBrightness = currentBrightness; // Stay at the brightness reached so far
  }
  sendState();
}

void setup()
{
  Serial.begin(115200);

  ledcAttach(LED_PIN, PWM_FREQ, PWM_RES);
  ledcWrite(LED_PIN, 0);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected!");
  Serial.print("Open in browser: http://");
  Serial.println(WiFi.localIP());

  server.on("/", handleRoot);
  server.on("/state", handleState);
  server.on("/set", handleSet);
  server.on("/timer", handleTimer);
  server.on("/cancel", handleCancel);
  server.begin();
}

void loop()
{
  server.handleClient();

  // 1. Timer: linear in perceived brightness (gamma in writeLed() does the rest)
  if (timerActive)
  {
    unsigned long elapsed = millis() - timerStartTime;
    if (elapsed < timerDurationMs)
    {
      float progress = (float)elapsed / timerDurationMs; // 0.0 -> 1.0
      targetBrightness = initialBrightnessAtStart * (1.0 - progress);
    }
    else
    {
      targetBrightness = 0;
      timerActive = false;
    }
  }

  // 2. Smooth brightness transition
  if (currentBrightness != targetBrightness)
  {
    if (currentBrightness < targetBrightness)
    {
      currentBrightness = min(currentBrightness + 0.5f, targetBrightness);
    }
    else
    {
      currentBrightness = max(currentBrightness - 0.5f, targetBrightness);
    }
    writeLed(currentBrightness);
  }

  delay(10);
}
