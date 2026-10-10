/* Ganglion on the phone (Ganglion Link).

   This page is static and holds nothing until it is paired. Pairing comes from
   a QR code on the researcher's computer, which opens this page with
   #p=<topics and key>. Browsers never send what follows "#" to the server, so
   the host of this page never sees the key; it is kept only in this phone's
   storage.

   The page and the computer exchange AES-256-GCM encrypted messages through
   two private ntfy topics. ntfy relays them without being able to read them.
   The computer does the work (the assistant, search, the morning briefing). */

const $ = (s) => document.querySelector(s);
const HE = navigator.language && navigator.language.toLowerCase().startsWith("he");
const T = {
  "pair-title": ["Pair with your computer", "חיבור למחשב שלך"],
  "pair-how": ["On your computer, open Ganglion → Settings → Phone → Pair this phone, and scan the code with this phone’s camera.",
    "במחשב, פתח את גנגליון ← הגדרות ← טלפון ← חבר את הטלפון, וסרוק את הקוד במצלמה של הטלפון הזה."],
  "pair-private": ["The code holds a key that never leaves your two devices. Messages between them are end-to-end encrypted.",
    "בקוד יש מפתח שלא יוצא משני המכשירים שלך. ההודעות ביניהם מוצפנות מקצה לקצה."],
  "tab-ask": ["Ask", "שאלה"], "tab-briefing": ["Briefing", "תדריך"], "tab-library": ["Library", "ספרייה"],
  "ask-placeholder": ["Ask about your papers", "שאל על המאמרים שלך"],
  "search-placeholder": ["Search your library", "חיפוש בספרייה"],
  "new-q": ["New question", "שאלה חדשה"], "refresh": ["Refresh", "רענן"], "unpair": ["Unpair this phone", "נתק את הטלפון"],
  "connecting": ["connecting…", "מתחבר…"], "online": ["computer online", "המחשב מחובר"], "offline": ["computer not answering", "המחשב לא עונה"],
  "offline-long": ["Your computer isn’t answering. It needs to be on, with Ganglion running.", "המחשב לא עונה. הוא צריך להיות דלוק, עם גנגליון פועל."],
  "no-briefing": ["No briefing yet.", "עדיין אין תדריך."], "no-results": ["Nothing found.", "לא נמצא כלום."],
  "unpair-confirm": ["Tap again to unpair", "לחץ שוב לניתוק"], "timeout": ["No answer from your computer.", "אין תשובה מהמחשב."],
};
const t = (k) => (T[k] ? T[k][HE ? 1 : 0] : k);

// ---------- storage ----------
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem("ganglion-link-" + k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem("ganglion-link-" + k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem("ganglion-link-" + k); } catch {} },
};

// ---------- crypto ----------
const b64u = {
  enc: (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  dec: (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0)),
};
let KEY = null, LINK = null;

async function seal(obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, KEY, new TextEncoder().encode(JSON.stringify(obj)));
  const out = new Uint8Array(12 + ct.byteLength);
  out.set(iv); out.set(new Uint8Array(ct), 12);
  return b64u.enc(out);
}

async function open(blob) {
  try {
    const raw = b64u.dec(blob.trim());
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(0, 12) }, KEY, raw.slice(12));
    return JSON.parse(new TextDecoder().decode(pt));
  } catch { return null; }
}

// ---------- the channel ----------
const pending = new Map(); // request id -> { onPart, parts }

async function send(obj) {
  const id = Math.random().toString(36).slice(2, 10);
  await fetch(`${LINK.srv.replace(/\/$/, "")}/${LINK.up}`, { method: "POST", body: await seal({ ...obj, id }) });
  return id;
}

function request(obj, onUpdate, timeoutMs = 240000) {
  return new Promise(async (resolve) => {
    let timer;
    const done = (v) => { clearTimeout(timer); resolve(v); };
    let id;
    try { id = await send(obj); } catch { return done(null); }
    const parts = [];
    pending.set(id, (msg) => {
      if (msg.type === "status") { onUpdate && onUpdate(msg); return; }
      parts[msg.part || 0] = msg;
      if (msg.last && parts.every(Boolean)) {
        pending.delete(id);
        done({ ...msg, text: parts.map((p) => p.text || "").join("") });
      }
    });
    timer = setTimeout(() => { pending.delete(id); done(null); }, timeoutMs);
  });
}

function listen() {
  // A message id, or a unix time a minute back for a fresh pairing (ntfy rejects "now").
  const since = store.get("since") || String(Math.floor(Date.now() / 1000) - 60);
  const es = new EventSource(`${LINK.srv.replace(/\/$/, "")}/${LINK.down}/sse?since=${encodeURIComponent(since)}`);
  es.onmessage = async (e) => {
    let m;
    try { m = JSON.parse(e.data); } catch { return; }
    if (m.event !== "message") return;
    store.set("since", m.id);
    const msg = await open(m.message || "");
    if (msg) setOnline(true);  // any reply means the computer is there
    if (msg && pending.has(msg.re)) pending.get(msg.re)(msg);
  };
  es.onerror = () => { /* EventSource reconnects by itself */ };
}

// ---------- connection status ----------
function setOnline(on) {
  $("#conn").className = "conn " + (on ? "on" : "off");
  $("#conn-text").textContent = on ? t("online") : t("offline");
}

async function ping() {
  $("#conn").className = "conn"; $("#conn-text").textContent = t("connecting");
  // The relay can take a few seconds to pick up a fresh connection, so allow one retry.
  const r = (await request({ type: "ping" }, null, 20000)) || (await request({ type: "ping" }, null, 20000));
  if (!r && !$("#conn").classList.contains("on")) setOnline(false);
  return r;
}

// ---------- rendering ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function markdown(src, cites = {}, urls = {}) {
  const inline = (s) => s
    .replace(/\[@([A-Z0-9]{8})\]/g, (_, k) => urls[k] ? `<a class="cite" href="${esc(urls[k])}" target="_blank" rel="noopener">${esc(cites[k] || k)}</a>` : `<span class="cite">${esc(cites[k] || k)}</span>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return esc(src.replace(/<think>[\s\S]*?(<\/think>|$)/g, "").trim()).split(/\n{2,}/).map((b) => {
    const lines = b.split("\n");
    if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""))}</li>`).join("")}</ul>`;
    return `<p>${lines.map(inline).join("<br>")}</p>`;
  }).join("");
}

// ---------- ask ----------
let conv = store.get("conv");

async function ask(q) {
  q = q.trim();
  if (!q) return;
  const th = $("#thread");
  th.insertAdjacentHTML("beforeend", `<div class="me" dir="auto">${esc(q)}</div><div class="turn"><span class="wait"></span></div>`);
  const turn = th.lastElementChild;
  $("#q").value = ""; $("#q").style.height = "";
  $("#ask-form button").disabled = true;
  turn.scrollIntoView({ block: "end" });
  const r = await request({ type: "ask", q, conv }, (st) => {
    turn.innerHTML = `<div class="status" dir="auto">${esc(st.text)}</div><span class="wait"></span>`;
  });
  $("#ask-form button").disabled = false;
  if (!r) { turn.innerHTML = `<p class="err">${t("timeout")}</p>`; ping(); return; }
  conv = r.conv || conv; store.set("conv", conv);
  $("#new-q").hidden = false;
  turn.innerHTML = (r.text ? `<div class="answer">${markdown(r.text, r.cites || {}, r.urls || {})}</div>` : "") +
    (r.error ? `<p class="err" dir="auto">${esc(r.error)}</p>` : "");
}

// ---------- briefing and library ----------
async function loadBriefing() {
  const box = $("#briefing");
  box.innerHTML = `<div class="empty"><span class="wait"></span></div>`;
  const r = await request({ type: "briefing" }, null, 30000);
  if (!r) { box.innerHTML = `<p class="empty">${t("offline-long")}</p>`; return; }
  let d; try { d = JSON.parse(r.text); } catch { d = { items: [] }; }
  box.innerHTML = d.items.length ? d.items.map((i) => `<article class="item">
      <div class="h ${i.kind === "new" ? "new" : ""}">${i.url ? `<a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.headline)}</a>` : esc(i.headline)}</div>
      ${i.venue ? `<div class="m">${esc(i.venue)}</div>` : ""}<p>${esc(i.takeaway)}</p></article>`).join("")
    : `<p class="empty">${t("no-briefing")}</p>`;
}

async function search(q) {
  const box = $("#results");
  if (!q.trim()) { box.innerHTML = ""; return; }
  box.innerHTML = `<li class="empty"><span class="wait"></span></li>`;
  const r = await request({ type: "search", q }, null, 30000);
  if (!r) { box.innerHTML = `<li class="empty">${t("offline-long")}</li>`; return; }
  let rows; try { rows = JSON.parse(r.text); } catch { rows = []; }
  box.innerHTML = rows.length ? rows.map((p) => `<li class="item"><div class="h">${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a>` : esc(p.title)}</div>
      <div class="m">${esc(p.cite)}${p.venue ? " · " + esc(p.venue) : ""}</div></li>`).join("") : `<li class="empty">${t("no-results")}</li>`;
}

// ---------- tabs and setup ----------
function showTab(name) {
  document.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
  for (const n of ["ask", "briefing", "library"]) $("#tab-" + n).hidden = n !== name;
  if (name === "briefing") loadBriefing();
}

async function start() {
  document.documentElement.lang = HE ? "he" : "en";
  document.documentElement.dir = HE ? "rtl" : "ltr";
  document.querySelectorAll("[data-t]").forEach((el) => (el.textContent = t(el.dataset.t)));
  document.querySelectorAll("[data-tp]").forEach((el) => (el.placeholder = t(el.dataset.tp)));

  // A fresh pairing arrives in the address after "#"; keep it, then clear it from the address bar.
  const m = location.hash.match(/#p=([A-Za-z0-9_-]+)/);
  if (m) {
    try { store.set("pairing", JSON.parse(new TextDecoder().decode(b64u.dec(m[1])))); store.del("since"); store.del("conv"); conv = null; } catch {}
    history.replaceState(null, "", location.pathname);
  }
  LINK = store.get("pairing");
  if (!LINK) { $("#pair").hidden = false; return; }
  KEY = await crypto.subtle.importKey("raw", b64u.dec(LINK.k), "AES-GCM", false, ["encrypt", "decrypt"]);
  $("#app").hidden = false;
  listen();
  ping();
  showTab(location.hash === "#briefing" ? "briefing" : "ask");
}

document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
$("#ask-form").addEventListener("submit", (e) => { e.preventDefault(); ask($("#q").value); });
$("#q").addEventListener("input", (e) => { e.target.style.height = ""; e.target.style.height = e.target.scrollHeight + "px"; });
$("#new-q").addEventListener("click", () => { conv = null; store.del("conv"); $("#thread").innerHTML = ""; $("#new-q").hidden = true; });
$("#refresh-briefing").addEventListener("click", loadBriefing);
let searchTimer;
$("#search-form").addEventListener("submit", (e) => { e.preventDefault(); search($("#s").value); });
$("#s").addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => search($("#s").value), 500); });
let armed = false;
$("#unpair").addEventListener("click", () => {
  if (!armed) { armed = true; $("#unpair").textContent = t("unpair-confirm"); setTimeout(() => { armed = false; $("#unpair").textContent = t("unpair"); }, 3000); return; }
  ["pairing", "since", "conv"].forEach(store.del);
  location.reload();
});
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
start();
