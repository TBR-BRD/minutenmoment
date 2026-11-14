/* Minutenmoment – jede Minute eine Geschichte.
 * Reines Vanilla-JS, keine Abhängigkeiten. Läuft statisch (z. B. GitHub Pages).
 */
(() => {
  "use strict";

  // ------------------------------------------------------------ Einstellungen
  const STORE_KEY = "minutenmoment.v1";
  const DEFAULTS = {
    showDate: true,
    showWeather: true,
    showSeconds: false,
    rotate: 15,
    wake: false,
    color: "#ffb000",
    unit: "celsius",
    location: { name: "Berlin", lat: 52.52, lon: 13.405 },
    own: [], // { name, date: "YYYY-MM-DD" }
  };
  const COLORS = ["#ffb000", "#39ff6a", "#3ee6ff", "#ff3b30", "#ff4fd8", "#f2efe6"];

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch { return { ...DEFAULTS }; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(cfg)); } catch { /* privat / voll */ }
  }
  const cfg = load();

  const $ = (id) => document.getElementById(id);
  const el = {
    clock: $("clock"), seconds: $("seconds"), date: $("date"), weather: $("weather"),
    factBox: $("factBox"), kat: $("factKat"), year: $("factYear"), text: $("factText"), dots: $("dots"),
    settings: $("settings"),
  };

  // ------------------------------------------------------------ 7-Segment-Anzeige
  // Segmente: a b c d e f g
  const H = (y) => `12,${y} 16,${y - 4} 44,${y - 4} 48,${y} 44,${y + 4} 16,${y + 4}`;
  const V = (x, y1, y2) => `${x},${y1} ${x + 4},${y1 + 4} ${x + 4},${y2 - 4} ${x},${y2} ${x - 4},${y2 - 4} ${x - 4},${y1 + 4}`;
  const SEG = {
    a: H(8), b: V(52, 10, 50), c: V(52, 50, 90), d: H(92), e: V(8, 50, 90), f: V(8, 10, 50), g: H(50),
  };
  const MAP = {
    0: "abcdef", 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc", 5: "afgcd",
    6: "afgedc", 7: "abc", 8: "abcdefg", 9: "abcdfg",
  };
  const NS = "http://www.w3.org/2000/svg";

  function makeDigit() {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 60 100");
    svg.classList.add("digit");
    const segs = {};
    for (const [k, pts] of Object.entries(SEG)) {
      const p = document.createElementNS(NS, "polygon");
      p.setAttribute("points", pts);
      svg.appendChild(p);
      segs[k] = p;
    }
    return { svg, segs, set(n) { const on = MAP[n] || ""; for (const k in segs) segs[k].classList.toggle("on", on.includes(k)); } };
  }
  function makeColon() {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 16 100");
    svg.classList.add("colon");
    for (const cy of [32, 68]) {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", "8"); c.setAttribute("cy", cy); c.setAttribute("r", "5");
      svg.appendChild(c);
    }
    return svg;
  }
  const digits = [makeDigit(), makeDigit(), makeDigit(), makeDigit()];
  const colon = makeColon();
  el.clock.append(digits[0].svg, digits[1].svg, colon, digits[2].svg, digits[3].svg);

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function showDigits(str, scramble) {
    if (!scramble || reduceMotion) { str.split("").forEach((c, i) => digits[i].set(+c)); return; }
    const t0 = performance.now();
    const dur = [520, 640, 760, 880];
    (function frame(t) {
      let done = true;
      for (let i = 0; i < 4; i++) {
        if (t - t0 < dur[i]) { digits[i].set(Math.floor(Math.random() * 10)); done = false; }
        else digits[i].set(+str[i]);
      }
      if (!done) setTimeout(() => requestAnimationFrame(frame), 45);
    })(t0);
  }

  // ------------------------------------------------------------ Fakten
  let FACTS = {};
  const KAT = {
    Moment: "Genau jetzt", Geschichte: "Geschichte", Kalender: "Kalenderblatt", Zahl: "Zahlen",
    Vorwahl: "Vorwahl", Mathe: "Mathe", Konstante: "Konstanten", Muster: "Muster", Tag: "Tagesuhr",
    Eigen: "Dein Moment", Heute: "Heute", Hinweis: "Hinweis",
  };

  function yearLabel(y, nowY) {
    if (y == null) return "";
    const ys = y < 1000 ? `${y} n. Chr.` : String(y);
    const d = nowY - y;
    if (d > 0) return `${ys} · vor ${d.toLocaleString("de-DE")} Jahr${d === 1 ? "" : "en"}`;
    if (d < 0) return `${ys} · in ${-d} Jahr${d === -1 ? "" : "en"}`;
    return `${ys} · dieses Jahr`;
  }

  function factsFor(now) {
    const hh = now.getHours(), mm = now.getMinutes();
    const key = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    const list = [];
    const day = now.getDate(), mon = now.getMonth() + 1;

    // Eigene Momente
    for (const o of cfg.own) {
      const [Y, M, D] = o.date.split("-").map(Number);
      if (!Y) continue;
      if (hh === D && mm === M) {
        const alt = now.getFullYear() - Y;
        list.push({ k: "Eigen", t: `${String(D).padStart(2, "0")}.${String(M).padStart(2, "0")}. – ${o.name}` + (alt > 0 ? ` (${Y}, vor ${alt} Jahren)` : "") });
      }
      if (hh * 100 + mm === Y) list.push({ k: "Eigen", t: `${Y}: ${o.name}`, y: Y });
    }
    // Uhrzeit = heutiges Datum?
    if (hh === day && mm === mon) list.push({ k: "Heute", t: `Uhrzeit und Datum stimmen überein: Es ist ${key} am ${day}.${mon}.` });
    if (hh === mon && mm === day) list.push({ k: "Heute", t: `Amerikanisch gelesen ist ${key} heute das Datum: ${mon}/${day}.` });

    if (!FACTS) list.push({ k: "Hinweis", t: "Die Faktendatei data/facts.js konnte nicht geladen werden – ist der Ordner „data“ mit hochgeladen?" });
    return list.concat((FACTS && FACTS[key]) || []);
  }

  // Text-Scramble
  const GLYPHS = "▖▗▘▙▚▛▜▝▞▟░▒#%&*+=<>/0123456789";
  let scrambleTimer = null;
  function scrambleText(node, text) {
    clearInterval(scrambleTimer);
    if (reduceMotion) { node.textContent = text; return; }
    let frame = 0;
    const total = Math.min(28, 10 + Math.floor(text.length / 6));
    scrambleTimer = setInterval(() => {
      frame++;
      const reveal = Math.floor((frame / total) * text.length);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (i < reveal || ch === " ") out += escapeHtml(ch);
        else if (i < reveal + 12) out += `<span class="scr">${GLYPHS[(Math.random() * GLYPHS.length) | 0]}</span>`;
        else out += "&#8203;";
      }
      node.innerHTML = out;
      if (reveal >= text.length) { clearInterval(scrambleTimer); node.textContent = text; }
    }, 32);
  }
  function escapeHtml(s) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  let current = [], idx = 0, lastRotate = 0;
  function renderFact(animate = true) {
    const f = current[idx];
    if (!f) { el.kat.textContent = ""; el.year.textContent = ""; el.text.textContent = ""; el.dots.innerHTML = ""; return; }
    el.kat.textContent = KAT[f.k] || f.k;
    el.year.textContent = yearLabel(f.y, new Date().getFullYear());
    if (animate) scrambleText(el.text, f.t); else el.text.textContent = f.t;
    el.dots.innerHTML = current.length > 1 ? current.map((_, i) => `<i class="${i === idx ? "on" : ""}"></i>`).join("") : "";
  }
  function nextFact() {
    if (current.length < 2) return;
    idx = (idx + 1) % current.length;
    lastRotate = Date.now();
    renderFact();
  }
  el.factBox.addEventListener("click", nextFact);

  // ------------------------------------------------------------ Datum
  const fmtDate = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  function renderDate(now) {
    if (!cfg.showDate) { el.date.classList.add("hidden"); return; }
    el.date.classList.remove("hidden");
    const d = now.getDate(), m = now.getMonth() + 1;
    const special = cfg.own.filter((o) => { const [, M, D] = o.date.split("-").map(Number); return M === m && D === d; });
    el.date.innerHTML = escapeHtml(fmtDate.format(now)) +
      (special.length ? `<span class="special">★ ${special.map((o) => escapeHtml(o.name)).join(", ")}</span>` : "");
  }

  // ------------------------------------------------------------ Uhr-Takt
  let lastKey = "";
  function tick() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const key = hh + mm;
    const sec = now.getSeconds();

    colon.classList.toggle("dim", sec % 2 === 1);
    el.seconds.textContent = cfg.showSeconds ? String(sec).padStart(2, "0") : "";

    if (key !== lastKey) {
      const first = lastKey === "";
      lastKey = key;
      showDigits(key, !first);
      current = factsFor(now);
      idx = 0;
      lastRotate = Date.now();
      renderFact(true);
      renderDate(now);
      document.title = `${hh}:${mm} · Minutenmoment`;
    } else if (cfg.rotate > 0 && current.length > 1 && Date.now() - lastRotate >= cfg.rotate * 1000) {
      nextFact();
    }
    setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  }

  // ------------------------------------------------------------ Wetter (Open-Meteo, ohne API-Key)
  const WMO = {
    0: ["☀️", "klar"], 1: ["🌤️", "überwiegend klar"], 2: ["⛅", "teils bewölkt"], 3: ["☁️", "bedeckt"],
    45: ["🌫️", "Nebel"], 48: ["🌫️", "Reifnebel"],
    51: ["🌦️", "leichter Niesel"], 53: ["🌦️", "Nieselregen"], 55: ["🌧️", "starker Niesel"],
    56: ["🌧️", "gefrierender Niesel"], 57: ["🌧️", "gefrierender Niesel"],
    61: ["🌦️", "leichter Regen"], 63: ["🌧️", "Regen"], 65: ["🌧️", "starker Regen"],
    66: ["🌧️", "gefrierender Regen"], 67: ["🌧️", "gefrierender Regen"],
    71: ["🌨️", "leichter Schnee"], 73: ["🌨️", "Schnee"], 75: ["❄️", "starker Schnee"], 77: ["🌨️", "Schneegriesel"],
    80: ["🌦️", "Regenschauer"], 81: ["🌧️", "Regenschauer"], 82: ["⛈️", "heftige Schauer"],
    85: ["🌨️", "Schneeschauer"], 86: ["🌨️", "Schneeschauer"],
    95: ["⛈️", "Gewitter"], 96: ["⛈️", "Gewitter mit Hagel"], 99: ["⛈️", "Gewitter mit Hagel"],
  };
  let weatherTimer = null;
  async function loadWeather() {
    clearTimeout(weatherTimer);
    if (!cfg.showWeather) { el.weather.classList.add("hidden"); return; }
    el.weather.classList.remove("hidden");
    const { lat, lon, name } = cfg.location;
    const u = cfg.unit === "fahrenheit" ? "&temperature_unit=fahrenheit" : "";
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day` +
      `&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto${u}`;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      const c = j.current;
      let [icon, txt] = WMO[c.weather_code] || ["🌡️", ""];
      if (!c.is_day && c.weather_code <= 1) icon = "🌙";
      const t = Math.round(c.temperature_2m);
      const max = Math.round(j.daily.temperature_2m_max[0]);
      const min = Math.round(j.daily.temperature_2m_min[0]);
      el.weather.innerHTML =
        `<span class="w-icon">${icon}</span><span class="w-temp">${t}°</span>` +
        `<span class="w-range">${min}°/${max}°</span><span class="w-place">${escapeHtml(name)}</span>`;
      el.weather.title = `${name}: ${txt}, gefühlt ${Math.round(c.apparent_temperature)}°, Wind ${Math.round(c.wind_speed_10m)} km/h`;
    } catch (e) {
      el.weather.innerHTML = `<span class="w-place">Wetter nicht verfügbar</span>`;
    }
    weatherTimer = setTimeout(loadWeather, 15 * 60 * 1000);
  }
  el.weather.addEventListener("click", () => openSettings());

  // ------------------------------------------------------------ Bildschirm wach halten
  let wakeLock = null;
  async function applyWake() {
    try {
      if (cfg.wake && "wakeLock" in navigator && document.visibilityState === "visible") {
        if (!wakeLock) { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => (wakeLock = null)); }
      } else if (wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch { /* nicht unterstützt */ }
  }
  document.addEventListener("visibilitychange", applyWake);

  // ------------------------------------------------------------ Einstellungsdialog
  function applyColor() { document.documentElement.style.setProperty("--led", cfg.color); }

  const sw = $("swatches");
  COLORS.forEach((c) => {
    const b = document.createElement("button");
    b.type = "button"; b.style.background = c; b.title = c;
    b.addEventListener("click", () => { cfg.color = c; save(); applyColor(); markSwatch(); });
    sw.appendChild(b);
  });
  function markSwatch() { [...sw.children].forEach((b) => b.classList.toggle("sel", b.title === cfg.color)); }

  function bindCheck(id, key, after) {
    const i = $(id); i.checked = !!cfg[key];
    i.addEventListener("change", () => { cfg[key] = i.checked; save(); after && after(); });
  }
  bindCheck("optDate", "showDate", () => renderDate(new Date()));
  bindCheck("optWeather", "showWeather", loadWeather);
  bindCheck("optSeconds", "showSeconds");
  bindCheck("optWake", "wake", applyWake);
  const rot = $("optRotate"); rot.value = String(cfg.rotate);
  rot.addEventListener("change", () => { cfg.rotate = +rot.value; save(); });
  const unit = $("optUnit"); unit.value = cfg.unit;
  unit.addEventListener("change", () => { cfg.unit = unit.value; save(); loadWeather(); });

  function renderLoc() { $("locName").textContent = cfg.location.name; }
  function setLocation(loc) { cfg.location = loc; save(); renderLoc(); loadWeather(); $("locResults").innerHTML = ""; }

  async function searchLoc() {
    const q = $("locQuery").value.trim();
    const ul = $("locResults");
    if (!q) return;
    ul.innerHTML = "<li><small>Suche …</small></li>";
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=de&format=json`);
      const j = await r.json();
      ul.innerHTML = "";
      if (!j.results || !j.results.length) { ul.innerHTML = "<li><small>Nichts gefunden.</small></li>"; return; }
      for (const res of j.results) {
        const li = document.createElement("li");
        const b = document.createElement("button");
        b.type = "button";
        const sub = [res.admin1, res.country].filter(Boolean).join(", ");
        b.innerHTML = `${escapeHtml(res.name)} <small>${escapeHtml(sub)}</small>`;
        b.addEventListener("click", () => setLocation({ name: res.name, lat: res.latitude, lon: res.longitude }));
        li.appendChild(b); ul.appendChild(li);
      }
    } catch { ul.innerHTML = "<li><small>Suche fehlgeschlagen.</small></li>"; }
  }
  $("locSearchBtn").addEventListener("click", searchLoc);
  $("locQuery").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); searchLoc(); } });
  $("locGeo").addEventListener("click", () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setLocation({ name: "Mein Standort", lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) }),
      () => { $("locResults").innerHTML = "<li><small>Standort nicht freigegeben.</small></li>"; },
      { timeout: 10000 });
  });

  function renderOwn() {
    const ul = $("ownList"); ul.innerHTML = "";
    cfg.own.forEach((o, i) => {
      const li = document.createElement("li");
      const [Y, M, D] = o.date.split("-");
      li.innerHTML = `<span>${escapeHtml(o.name)} <small>${D}.${M}.${Y}</small></span>`;
      const del = document.createElement("button"); del.type = "button"; del.textContent = "×"; del.title = "Entfernen";
      del.addEventListener("click", () => { cfg.own.splice(i, 1); save(); renderOwn(); refreshMinute(); });
      li.appendChild(del); ul.appendChild(li);
    });
  }
  $("ownAdd").addEventListener("click", () => {
    const name = $("ownName").value.trim(), date = $("ownDate").value;
    if (!name || !date) return;
    cfg.own.push({ name, date }); save();
    $("ownName").value = ""; $("ownDate").value = "";
    renderOwn(); refreshMinute();
  });
  function refreshMinute() { lastKey = ""; }

  function openSettings() { if (typeof el.settings.showModal === "function") el.settings.showModal(); }
  $("btnSettings").addEventListener("click", openSettings);

  // ------------------------------------------------------------ Vollbild & Tastatur
  function toggleFull() {
    const d = document;
    if (!d.fullscreenElement) d.documentElement.requestFullscreen?.().catch(() => {});
    else d.exitFullscreen?.();
  }
  $("btnFull").addEventListener("click", toggleFull);
  document.addEventListener("keydown", (e) => {
    if (el.settings.open || e.target.matches("input,select")) return;
    if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); nextFact(); }
    else if (e.key === "f" || e.key === "F") toggleFull();
    else if (e.key === "s" || e.key === "S") openSettings();
  });

  // Mauszeiger & Bedienleiste ausblenden, wenn untätig
  let idleT;
  const wake = () => { document.body.classList.remove("idle"); clearTimeout(idleT); idleT = setTimeout(() => document.body.classList.add("idle"), 4000); };
  ["mousemove", "touchstart", "keydown"].forEach((ev) => document.addEventListener(ev, wake, { passive: true }));
  wake();

  // ------------------------------------------------------------ Start
  applyColor(); markSwatch(); renderLoc(); renderOwn();
  function start() { tick(); loadWeather(); applyWake(); }
  if (window.MINUTENMOMENT_FACTS) {
    FACTS = window.MINUTENMOMENT_FACTS;
    start();
  } else {
    fetch("data/facts.json")
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((j) => { FACTS = j; })
      .catch(() => { FACTS = null; })
      .finally(start);
  }

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
