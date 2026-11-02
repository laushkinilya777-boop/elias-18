// Общие помощники для всех игр
const $ = id => document.getElementById(id);

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
// Склонение русских имён по падежу: "в" винительный, "р" родительный, "д" дательный, "т" творительный.
// Простые правила для частых окончаний; непонятные имена (латиница и т.п.) не трогаем.
function decline(name, c) {
  if (!c || !/[а-яё]$/i.test(name)) return name;
  const low = name.toLowerCase(), stem = name.slice(0, -1), last = low.slice(-1), prev = low.slice(-2, -1);
  const hush = "жшчщц", velar = "гкхжшчщ";
  if (low.endsWith("ия")) return stem + { в: "ю", р: "и", д: "и", т: "ей" }[c];
  if (last === "а") return stem + { в: "у", р: velar.includes(prev) ? "и" : "ы", д: "е", т: hush.includes(prev) ? "ей" : "ой" }[c];
  if (last === "я") return stem + { в: "ю", р: "и", д: "е", т: "ей" }[c];
  if (last === "й" || last === "ь") return stem + { в: "я", р: "я", д: "ю", т: "ем" }[c];
  if ("бвгджзклмнпрстфхцчшщ".includes(last)) return name + { в: "а", р: "а", д: "у", т: hush.includes(last) ? "ем" : "ом" }[c];
  return name;
}

function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
function load(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
function drop(key) { try { localStorage.removeItem(key); } catch (e) {} }

function show(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === id));
  window.scrollTo(0, 0);
}

// ---------- Игроки (общий список для всех игр) ----------
const PLAYER_COLORS = ["#ff3d8b", "#8b5cf6", "#2ee59d", "#ffb547", "#38d9f5", "#ff7a45", "#f472b6", "#a3e635", "#60a5fa", "#facc15"];
const Players = {
  get() { return load("party_players") || []; },
  set(list) { store("party_players", list); },
  color(i) { return PLAYER_COLORS[i % PLAYER_COLORS.length]; }
};

// Редактор списка игроков. onChange вызывается после каждого изменения.
function playersEditor(container, onChange) {
  container.innerHTML = `
    <div class="add-row">
      <input type="text" placeholder="Имя игрока" maxlength="20" enterkeyhint="done" autocomplete="off">
      <button type="button" aria-label="Добавить">+</button>
    </div>
    <div class="players"></div>
    <p class="sub small" style="margin-top:10px">Можно вписать сразу несколько через запятую</p>`;
  const input = container.querySelector("input");
  const list = container.querySelector(".players");

  function render() {
    const ps = Players.get();
    list.innerHTML = ps.length
      ? ps.map((p, i) => `<span class="player"><i class="dot" style="background:${Players.color(i)}"></i>${esc(p)}<button class="x" data-i="${i}" aria-label="Удалить">✕</button></span>`).join("")
      : `<div class="empty">Пока никого. Добавь всех, кто играет 👆</div>`;
    onChange && onChange(ps);
  }
  function add() {
    const ps = Players.get();
    const names = input.value.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    names.forEach(n => {
      if (!ps.some(p => p.toLowerCase() === n.toLowerCase())) ps.push(n.slice(0, 20));
    });
    Players.set(ps);
    input.value = "";
    input.focus();
    render();
  }
  container.querySelector(".add-row button").addEventListener("click", add);
  input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); add(); } });
  list.addEventListener("click", e => {
    const b = e.target.closest(".x");
    if (!b) return;
    const ps = Players.get();
    ps.splice(+b.dataset.i, 1);
    Players.set(ps);
    render();
  });
  render();
  return { render };
}

// ---------- Подтверждение вторым нажатием (confirm() бывает заблокирован) ----------
function armButton(btn, armedText, action) {
  const label = btn.textContent;
  btn.addEventListener("click", () => {
    if (btn.dataset.armed) {
      clearTimeout(btn._t);
      delete btn.dataset.armed;
      btn.classList.remove("armed");
      btn.textContent = label;
      action();
      return;
    }
    btn.dataset.armed = "1";
    btn.classList.add("armed");
    btn.textContent = armedText;
    btn._t = setTimeout(() => { delete btn.dataset.armed; btn.classList.remove("armed"); btn.textContent = label; }, 3000);
  });
}

// ---------- Шторка и всплывашка ----------
function openSheet(html) {
  let bg = $("sheetBg"), sh = $("sheet");
  if (!sh) {
    document.body.insertAdjacentHTML("beforeend", `<div class="sheet-bg" id="sheetBg"></div><div class="sheet" id="sheet"></div>`);
    bg = $("sheetBg"); sh = $("sheet");
    bg.addEventListener("click", closeSheet);
  }
  sh.innerHTML = `<div class="grab"></div>` + html;
  bg.classList.add("show");
  requestAnimationFrame(() => sh.classList.add("show"));
}
function closeSheet() { $("sheet") && $("sheet").classList.remove("show"); $("sheetBg") && $("sheetBg").classList.remove("show"); }
function toast(text) {
  let t = $("toast");
  if (!t) { document.body.insertAdjacentHTML("beforeend", `<div class="toast" id="toast"></div>`); t = $("toast"); }
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("show"), 1800);
}

// ---------- Звук, вибрация, экран не гаснет ----------
let audioCtx = null;
function beep(freq, dur, vol) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = freq; g.gain.value = vol || 0.15;
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.stop(audioCtx.currentTime + dur);
  } catch (e) {}
}
function buzz(p) { if (navigator.vibrate) navigator.vibrate(p); }
let wakeLock = null;
async function keepAwake() {
  try { if ("wakeLock" in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => wakeLock = null); } } catch (e) {}
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && window._wantAwake) keepAwake(); });
function wantAwake() { window._wantAwake = true; keepAwake(); }

// Таймер с паузой: onTick(msLeft), onEnd()
function makeTimer(totalMs, onTick, onEnd) {
  let left = totalMs, endAt = 0, id = null;
  const t = {
    get left() { return left; },
    get running() { return id !== null; },
    start() {
      endAt = Date.now() + left;
      clearInterval(id);
      const tick = () => {
        left = Math.max(0, endAt - Date.now());
        onTick(left);
        if (left <= 0) { clearInterval(id); id = null; onEnd(); }
      };
      id = setInterval(tick, 100);
      tick();
    },
    pause() { clearInterval(id); id = null; },
    stop() { clearInterval(id); id = null; }
  };
  return t;
}

// 18+ — один раз на устройстве
function ageGate() {
  if (load("party_age_ok")) return;
  document.body.insertAdjacentHTML("beforeend", `
    <div id="ageGate" style="position:fixed;inset:0;z-index:50;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:24px">
      <div class="gate" style="max-width:420px">
        <div style="font-size:64px">🔞</div>
        <h1>Только <span class="accent">18+</span></h1>
        <p class="sub">Здесь игры со взрослыми темами. Заходи, только если тебе есть 18.</p>
        <button class="primary" id="ageOk">Мне есть 18</button>
      </div>
    </div>`);
  $("ageOk").onclick = () => { store("party_age_ok", 1); $("ageGate").remove(); };
}

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
