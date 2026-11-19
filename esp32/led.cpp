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
// The page reads /state on open and when the tab becomes visible again,
// and polls it every second only while the timer is running.
const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE HTML>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sterowanie LED</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; background: #121212; color: #fff; margin-top: 30px; }
    .container { max-width: 400px; margin: auto; padding: 20px; background: #1e1e1e; border-radius: 12px; }
    input[type=range] { width: 100%; height: 25px; margin: 15px 0; accent-color: #f39c12; }
    input[type=range]:disabled { opacity: 0.4; }
    .val { font-size: 2em; font-weight: bold; color: #f39c12; }
    button { background: #f39c12; color: #000; border: 2px solid #f39c12; padding: 12px 20px; font-size: 1.1em; font-weight: bold; border-radius: 8px; cursor: pointer; width: 100%; margin-top: 10px; }
    button:hover { background: #e08b10; }
    button:disabled { background: #444; border-color: #444; color: #888; cursor: not-allowed; }
    button.secondary { background: transparent; color: #f39c12; }
    button.secondary:hover { background: #2a2a2a; }
    button[hidden] { display: none; }
    .section { margin-top: 25px; border-top: 1px solid #333; padding-top: 15px; }
    .status { min-height: 1.4em; margin-top: 12px; color: #aaa; }
    .status.running { color: #f39c12; font-size: 1.3em; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Jasność Taśmy LED</h2>
    <div class="val"><span id="procent">0</span>%</div>
    <input type="range" min="0" max="255" value="0" id="slider">

    <div class="section">
      <h3>Timer wygaszania</h3>
      <p>Czas: <span id="czas">15 min</span></p>
      <!-- 1 step = 30 s, so the range is 30 s to 60 min -->
      <input type="range" min="1" max="120" value="30" id="timerSlider">
      <button id="startBtn">START TIMER</button>
      <button id="cancelBtn" class="secondary" hidden>ANULUJ TIMER</button>
      <div id="status" class="status"></div>
    </div>
  </div>
  <script>
    const $ = (id) => document.getElementById(id);
    const slider = $("slider"), timerSlider = $("timerSlider");
    const startBtn = $("startBtn"), cancelBtn = $("cancelBtn"), statusEl = $("status");

    let dragging = false;   // don't overwrite the slider while the user is moving it
    let busy = false;       // a request is in flight
    let pendingVal = null;  // latest brightness waiting to be sent

    function fmtDuration(secs) {
      if (secs < 60) return secs + " s";
      const m = Math.floor(secs / 60), s = secs % 60;
      return s ? m + " min " + s + " s" : m + " min";
    }

    function fmtClock(ms) {
      const total = Math.ceil(ms / 1000);
      const m = Math.floor(total / 60), s = total % 60;
      return m + ":" + String(s).padStart(2, "0");
    }

    function showPercent(val) {
      $("procent").innerText = Math.round((val / 255) * 100);
    }

    function render(s) {
      timerRunning = s.timerActive;
      if (!dragging) {
        slider.value = s.brightness;
        showPercent(s.brightness);
      }
      timerSlider.disabled = s.timerActive;
      startBtn.hidden = s.timerActive;
      startBtn.disabled = s.brightness === 0;
      cancelBtn.hidden = !s.timerActive;

      if (s.timerActive) {
        statusEl.className = "status running";
        statusEl.innerText = "Gaśnie za " + fmtClock(s.remainingMs);
      } else {
        statusEl.className = "status";
        statusEl.innerText = s.brightness === 0 ? "Najpierw włącz taśmę" : "";
      }
    }

    async function request(url) {
      busy = true;
      try {
        const res = await fetch(url);
        render(await res.json());
      } catch (e) {
        statusEl.className = "status";
        statusEl.innerText = "Brak połączenia z ESP32";
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

    slider.addEventListener("pointerdown", () => { dragging = true; });
    window.addEventListener("pointerup", () => { dragging = false; });
    window.addEventListener("pointercancel", () => { dragging = false; });
    slider.addEventListener("input", () => {
      showPercent(slider.value);
      pendingVal = slider.value;
      flushBrightness();
    });

    timerSlider.addEventListener("input", () => {
      $("czas").innerText = fmtDuration(timerSlider.value * 30);
    });

    startBtn.addEventListener("click", () => request("/timer?secs=" + timerSlider.value * 30));
    cancelBtn.addEventListener("click", () => request("/cancel"));

    // Poll only while the timer runs; otherwise nothing changes on its own
    let timerRunning = false;
    function poll() {
      if (timerRunning && !busy && !dragging && pendingVal === null) request("/state");
    }
    setInterval(poll, 1000);

    // Load the state once on open, and again when the tab comes back into view
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
           "{\"brightness\":%d,\"timerActive\":%s,\"remainingMs\":%lu}",
           (int)(targetBrightness + 0.5),
           timerActive ? "true" : "false",
           remainingMs);
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
