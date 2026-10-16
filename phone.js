/* Ganglion on the phone (Ganglion Link).

   This page is static and holds nothing until it is paired. Pairing comes from
   a QR code on the researcher's computer, which opens this page with
   #p=<topics and key>. Browsers never send what follows "#" to the server, so
   the host of this page never sees the key; it is kept only in this phone's
   storage.

   The page and the computer exchange AES-256-GCM encrypted messages through
   two private ntfy topics. ntfy relays them without being able to read them.
   The computer does the work (the assistant, search, Radar, the games).

   The screen is the conversation; everything else is in the side menu (☰). */

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
// The language: the one chosen in Settings, else the phone's own.
let HE = (() => {
  try { const v = localStorage.getItem("ganglion-link-lang"); if (v) return v === "he"; } catch {}
  return !!navigator.language && navigator.language.toLowerCase().startsWith("he");
})();
const T = {
  "pair-title": ["Pair with your computer", "חיבור למחשב שלך"],
  "pair-how": ["On your computer, open Ganglion → Settings → Phone → Pair this phone, and scan the code with this phone’s camera.",
    "במחשב, פתח את גנגליון ← הגדרות ← טלפון ← חבר את הטלפון, וסרוק את הקוד במצלמה של הטלפון הזה."],
  "pair-private": ["The code holds a key that never leaves your two devices. Messages between them are end-to-end encrypted.",
    "בקוד יש מפתח שלא יוצא משני המכשירים שלך. ההודעות ביניהם מוצפנות מקצה לקצה."],
  "hello": ["Ask about your papers. Your computer reads them; the answer comes here.", "שאל על המאמרים שלך. המחשב שלך קורא אותם, והתשובה מגיעה לכאן."],
  "ask-placeholder": ["Ask about your papers", "שאל על המאמרים שלך"], "reply": ["Reply", "תגובה"],
  "search-placeholder": ["Search your library", "חיפוש בספרייה"],
  "new-q": ["New conversation", "שיחה חדשה"], "history": ["Past conversations", "שיחות קודמות"], "radar": ["Radar", "רדאר"],
  "library": ["Library", "ספרייה"], "bored": ["I’m bored", "משעמם לי"], "settings": ["Settings", "הגדרות"],
  "refresh": ["Refresh", "רענן"], "unpair": ["Unpair this phone", "נתק את הטלפון"], "unpair-confirm": ["Tap again to unpair", "לחץ שוב לניתוק"],
  "connecting": ["Connecting…", "מתחבר…"], "online": ["Computer online", "המחשב מחובר"], "offline": ["Computer not answering", "המחשב לא עונה"],
  "offline-long": ["Your computer isn’t answering. It needs to be on, with Ganglion running.", "המחשב לא עונה. הוא צריך להיות דלוק, עם גנגליון פועל."],
  "no-briefing": ["Nothing on the Radar yet.", "עדיין אין כלום ברדאר."], "no-results": ["Nothing found.", "לא נמצא כלום."],
  "no-convs": ["No conversations yet.", "עדיין אין שיחות."], "timeout": ["No answer from your computer.", "אין תשובה מהמחשב."],
  "copy": ["Copy", "העתק"], "copied": ["Copied", "הועתק"],
  "language": ["Language", "שפה"], "lang-request": ["Ask for another language", "בקשת שפה נוספת"], "answers": ["Answers", "תשובות"],
  "brief": ["Brief", "קצר"], "brief-sub": ["Short answers, the main points only.", "תשובות קצרות, רק העיקר."],
  "ste-sub": ["Simplified Technical English: short, plain sentences.", "אנגלית טכנית פשוטה: משפטים קצרים וברורים."],
  "computer": ["Your computer", "המחשב שלך"], "status": ["Status", "מצב"], "name": ["Name", "שם"], "ai": ["AI", "AI"], "papers": ["Papers", "מאמרים"],
  "learn": ["Something to learn", "משהו ללמוד"], "learn-sub": ["One interesting thing from a random paper in your library.", "דבר מעניין אחד ממאמר אקראי בספרייה שלך."],
  "q20": ["Who am I?", "מי אני?"], "q20-sub": ["I’m a paper in your library. Find me in 21 yes/no questions. A new one every day.", "אני מאמר בספרייה שלך. מצא אותי ב־21 שאלות כן/לא. חדש כל יום."],
  "conn-game": ["Quartets", "רביעיות"], "conn-sub": ["16 terms from your field in 4 hidden groups of 4. New every day, some days easy, some hard.", "16 מונחים מהתחום שלך ב־4 קבוצות נסתרות של 4. חדש כל יום, לפעמים קל ולפעמים קשה."],
  "hint": ["Hint: show a pair", "רמז: חשוף זוג"], "level-easy": ["Today: easy", "היום: קל"], "level-medium": ["Today: medium", "היום: בינוני"], "level-hard": ["Today: hard", "היום: קשה"],
  "not-group": ["Not a group", "לא קבוצה"], "stats": ["Your games", "המשחקים שלך"], "played": ["Played", "שוחקו"], "won": ["Won", "ניצחונות"],
  "by-mistakes": ["Mistakes per game", "טעויות במשחק"], "by-questions": ["Questions to find me", "שאלות עד שמצאת אותי"], "hints-used": ["Games with the hint", "משחקים עם רמז"], "not-found": ["not found", "לא נמצא"],
  "another": ["Another one", "עוד אחד"], "learn-q": ["What would you like to learn today?", "מה בא לך ללמוד היום?"],
  "l-math": ["Something mathematical", "משהו מתמטי"], "l-theory": ["A theory", "תיאוריה"], "l-method": ["A method", "שיטה"],
  "l-finding": ["A finding in my field", "ממצא בתחום שלי"], "l-beyond": ["A bit beyond my field", "קצת מחוץ לתחום שלי"], "l-surprise": ["Surprise me", "תפתיע אותי"],
  "talk-about": ["Talk about it", "בוא נדבר על זה"], "start-over": ["Start over", "מההתחלה"], "open-paper": ["Open the paper", "פתח את המאמר"],
  "q20-placeholder": ["A yes/no question, or “Is it …?”", "שאלת כן/לא, או „זה …?”"], "give-up": ["Give up and show the paper", "וותר והראה את המאמר"],
  "q20-intro": ["I’m one of the {n} papers in your library. Ask me yes/no questions; name me (my first author is enough) to win.", "אני אחד מ־{n} המאמרים בספרייה שלך. שאל אותי שאלות כן/לא; נקוב בשמי (מספיק המחבר הראשון) כדי לנצח."],
  "q20-won": ["You got it in {n}!", "ניחשת ב־{n}!"], "q20-lost": ["It was:", "זה היה:"], "q20-left": ["{n} questions left", "נשארו {n} שאלות"], "w-cold": ["Cold", "קר"], "w-tepid": ["Getting warmer", "מתחמם"], "w-warm": ["Warm", "חם"], "w-hot": ["Hot!", "חם מאוד!"], "w-burning": ["Burning! One more…", "בוער! עוד אחת…"],
  "a-yes": ["Yes", "כן"], "a-no": ["No", "לא"], "a-partly": ["Partly", "חלקית"], "a-unclear": ["Can’t tell", "אי אפשר לדעת"],
  "conn-how": ["Find the 4 groups of 4 terms that belong together.", "מצא את 4 הקבוצות של 4 מונחים ששייכים יחד."],
  "shuffle": ["Shuffle", "ערבב"], "clear": ["Clear", "נקה"], "submit": ["Submit", "בדוק"],
  "mistakes": ["Mistakes left: {n}", "טעויות שנשארו: {n}"], "one-away": ["One away…", "חסר אחד…"], "conn-won": ["Solved! Come back tomorrow for a new one.", "פתרת! חזור מחר לחדש."],
  "conn-lost": ["Out of tries. Here are the groups.", "נגמרו הניסיונות. הנה הקבוצות."], "try-again": ["Try again", "נסה שוב"],
};
const t = (k, v = {}) => (T[k] ? T[k][HE ? 1 : 0] : k).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? "");

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
const pending = new Map(); // request id -> handler

async function send(obj) {
  const id = Math.random().toString(36).slice(2, 10);
  // t: when it was sent, inside the encryption: the computer refuses a request that is old or already handled
  // (someone who learnt the channel's name can't make it run a request again by sending its copy).
  await fetch(`${LINK.srv.replace(/\/$/, "")}/${LINK.up}`, { method: "POST", body: await seal({ ...obj, id, t: Date.now(), lang: HE ? "he" : "en" }) });
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

// A reply whose text is JSON (lists, games); an error reply becomes {error}.
async function requestJSON(obj, timeoutMs = 60000) {
  const r = await request(obj, null, timeoutMs);
  if (!r) return null;
  if (r.type === "error") return { error: r.text };
  try { return JSON.parse(r.text); } catch { return { error: r.text || "?" }; }
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

// ---------- connection, the computer, the answer style ----------
const PC = { on: null, computer: "", ai: "", papers: null, brief: false, ste: false };

function setOnline(on) {
  PC.on = on;
  $("#conn").className = "conn " + (on ? "on" : on === false ? "off" : "");
  $("#conn").title = on ? t("online") : on === false ? t("offline") : t("connecting");
  paintFacts();
}

async function ping() {
  setOnline(null);
  // The relay can take a few seconds to pick up a fresh connection, so allow one retry.
  const r = (await request({ type: "ping" }, null, 20000)) || (await request({ type: "ping" }, null, 20000));
  if (r) Object.assign(PC, { computer: r.computer || "", ai: r.ai || "", papers: r.papers, brief: !!r.brief, ste: !!r.ste });
  if (!r && PC.on !== true) setOnline(false);
  paintStyles(); paintFacts();
  return r;
}

function paintStyles() {
  $$("[data-style=answer_brief]").forEach((c) => (c.checked = PC.brief));
  $$("[data-style=answer_ste]").forEach((c) => (c.checked = PC.ste));
}

function paintFacts() {
  const status = PC.on ? t("online") : PC.on === false ? t("offline") : t("connecting");
  $("#facts").innerHTML = [[t("status"), status], [t("name"), PC.computer], [t("ai"), PC.ai], [t("papers"), PC.papers ?? ""]]
    .filter(([, v]) => v !== "" && v != null).map(([k, v]) => `<dt>${esc(k)}</dt><dd dir="auto">${esc(v)}</dd>`).join("");
  $("#menu-foot").innerHTML = `<span class="conn ${PC.on ? "on" : PC.on === false ? "off" : ""}"><span class="dot"></span></span>`
    + `<span dir="auto">${esc(status)}${PC.computer ? " · " + esc(PC.computer) : ""}</span>`;
}

// Brief and STE: the computer's own switches (the same as in Ganglion's chat).
document.addEventListener("change", async (e) => {
  const c = e.target.closest("[data-style]");
  if (!c) return;
  const key = c.dataset.style;
  PC[key === "answer_brief" ? "brief" : "ste"] = c.checked;
  paintStyles();
  const r = await request({ type: "settings", set: { [key]: c.checked } }, null, 20000);
  if (r) Object.assign(PC, { brief: !!r.brief, ste: !!r.ste });
  paintStyles();
});

// ---------- rendering ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Links from outside data (paper records, the AI's answers) open only as web or Zotero addresses: a "javascript:"
// link would run inside Ganglion.
function safeUrl(u) {
  const s = String(u || "").trim();
  return /^(https?:\/\/|zotero:\/\/)/i.test(s) ? s : "#";
}

function tex(s, display) {
  if (!window.katex) return esc(display ? `$$${s}$$` : `$${s}$`);
  try { return katex.renderToString(s, { displayMode: display, throwOnError: false, output: "html" }); }
  catch { return esc(s); }
}

// The same reading as on the computer: code and formulas set aside first, then blocks (headings, tables, lists that
// keep their numbers, paragraphs), then citations and emphasis inside each.
function markdown(src, cites = {}, urls = {}) {
  src = String(src || "").replace(/\[\[\s*fig(?:ure)?\s*:.*?\]\]\]?\n?/gi, "");  // a figure the answer shows: only the main window shows images
  // Several papers in one bracket ("[@A, @B]"): one citation each.
  src = src.replace(/\[@([A-Z0-9]{8})((?:\s*[,;]\s*@?[A-Z0-9]{8})+)\]/g, (_, a, rest) => [a, ...rest.match(/[A-Z0-9]{8}/g)].map((k) => `[@${k}]`).join(" "));
  // A heading is its own block, even with its paragraph right under it.
  src = src.replace(/^(#{1,6} [^\n]+)\n(?!\n)/gm, "$1\n\n");
  const kept = [];
  const hold = (html) => `\u0000${kept.push(html) - 1}\u0000`;
  src = src.replace(/<think>[\s\S]*?(<\/think>|$)/g, "");
  src = src.replace(/```([\w+#.-]*)[^\n]*\n([\s\S]*?)```/g, (_, lang, code) => "\n\n" + hold(`<div class="code-block"><button type="button" class="copy-code">${esc(t("copy"))}</button><pre class="code"><code>${esc(code.replace(/\n$/, ""))}</code></pre></div>`) + "\n\n");
  src = src.replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g, (_, a, b) => "\n\n" + hold(`<div class="math" data-tex="${esc((a ?? b).trim())}">${tex((a ?? b).trim(), true)}</div>`) + "\n\n");
  src = src.replace(/`([^`\n]+)`/g, (_, c) => hold(`<code>${esc(c)}</code>`));
  src = src.replace(/\\\((.+?)\\\)|(?<![\\$\w])\$(?=\S)([^$\n]+?)(?<=\S)\$(?![A-Za-z_$])/g, (m, a, b) =>
    b !== undefined && /^[\d.,\s]+$/.test(b) ? m : hold(tex(a ?? b, false)));
  const inline = (x) => x
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) => `<a href="${safeUrl(url)}" target="_blank" rel="noopener">${label}</a>`)  // a paper outside the library
    .replace(/\[@([A-Z0-9]{8})\]/g, (_, k) => urls[k] ? `<a class="cite" href="${esc(safeUrl(urls[k]))}" target="_blank" rel="noopener">${esc(cites[k] || k)}</a>` : `<span class="cite">${esc(cites[k] || k)}</span>`)
    .replace(/==([^=\n]{3,400}?)==/g, '<mark class="key-line">$1</mark>')
    .replace(/\*\*((?:[^*]|\*(?!\*))+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  const item = /^\s*([-*•]|\d+[.)])\s+/;
  const blocks = esc(src.trim()).split(/\n{2,}/).flatMap((b) => {
    const out = [];
    for (const l of b.split("\n")) {
      const last = out[out.length - 1];
      const kind = item.test(l) || (last?.kind === "list" && /^\s{2,}\S/.test(l)) ? "list" : "text";
      if (last && last.kind === kind) last.lines.push(l); else out.push({ kind, lines: [l] });
    }
    return out.map((g) => g.lines.join("\n"));
  });
  const html = blocks.map((b) => {
    const lines = b.split("\n");
    if (/^\u0000\d+\u0000$/.test(b.trim())) return b.trim();
    if (/^#{1,6} /.test(b)) return `<h4>${inline(b.replace(/^#+ /, ""))}</h4>`;
    if (lines.length > 1 && lines.every((l) => /^\s*\|.*\|\s*$/.test(l))) {
      const rows = lines.filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l)).map((l) => l.trim().slice(1, -1).split("|").map((c) => c.trim()));
      const [head, ...body] = rows;
      // Three columns or more don't fit a phone: each row a card, its first cell the title, the others labelled.
      if (head.length >= 3) return `<div class="tcards">${body.map((r) => `<div class="tcard"><div class="tcard-h">${inline(r[0] || "")}</div>${
        head.slice(1).map((h, i) => (r[i + 1] || "").trim() ? `<div class="tcard-row"><span class="tl">${inline(h)}</span>${inline(r[i + 1])}</div>` : "").join("")}</div>`).join("")}</div>`;
      return `<div class="table"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    }
    if (lines.every((l) => item.test(l) || /^\s{2,}/.test(l))) {
      const items = [];
      for (const l of lines) { if (item.test(l)) items.push(l.replace(item, "")); else items[items.length - 1] += " " + l.trim(); }
      const ordered = /^\s*\d/.test(lines[0]), start = ordered ? parseInt(lines[0], 10) : 1;
      const tag = ordered ? "ol" : "ul";
      return `<${tag}${start > 1 ? ` start="${start}"` : ""}>${items.map((i) => `<li>${inline(i)}</li>`).join("")}</${tag}>`;
    }
    return `<p>${lines.map(inline).join("<br>")}</p>`;
  }).join("");
  return html.replace(/\u0000(\d+)\u0000/g, (_, i) => kept[+i]);
}

// ---------- while the computer thinks: a light line that changes, as on the computer ----------
const QUIPS = {
  en: {
    lines: ["Following the citations down the rabbit hole", "Reading the supplementary materials so you don't have to",
            "Asking the abstract what it really meant", "Looking for the control condition", "Checking which way causality points",
            "Separating what's shown from what's claimed", "Counting how many times “novel” appears", "Finding the n, then the other n",
            "Reading the limitations section the authors hoped you'd skip", "Asking Figure 3 to testify", "Bribing Reviewer 2", "Consulting the hippocampus"],
    act: ["Reading the methods section", "Checking the sample size", "Following every citation", "Comparing the error bars", "Re-reading the abstract",
          "Tracing the claim back to its figure", "Reading the discussion", "Checking the statistics", "Looking at the control group", "Weighing the evidence"],
    twist: ["like reviewer 2", "with a red pen", "twice, to be safe", "without trusting the abstract", "very respectfully", "before the coffee gets cold",
            "slowly, like a postdoc on a Friday", "in triplicate", "while the PI isn't looking", "with healthy scepticism"],
  },
  he: {
    lines: ["עוקב אחרי הציטוטים עמוק לתוך מחילת הארנב", "קורא את חומרי ההשלמה כדי שאתה לא תצטרך", "שואל את התקציר למה הוא באמת התכוון",
            "מחפש את קבוצת הביקורת", "בודק לאיזה כיוון הסיבתיות הולכת", "מפריד בין מה שמוצג למה שנטען", "סופר כמה פעמים כתוב „חדשני”",
            "מוצא את ה־n, ואז את ה־n השני", "מזמין את איור 3 להעיד", "משחד את סוקר מספר 2", "מתייעץ עם ההיפוקמפוס"],
    act: ["קורא את פרק השיטות", "בודק את גודל המדגם", "עוקב אחרי כל ציטוט", "משווה את קווי השגיאה", "קורא שוב את התקציר",
          "מחבר את הטענה לאיור שלה", "קורא את הדיון", "בודק את הסטטיסטיקה", "מסתכל על קבוצת הביקורת", "שוקל את הראיות"],
    twist: ["כמו סוקר 2", "עם עט אדום", "פעמיים, ליתר ביטחון", "בלי לסמוך על התקציר", "בכבוד רב", "לפני שהקפה מתקרר",
            "לאט, כמו פוסטדוק ביום שישי", "בשלושה עותקים", "כשהמנחה לא מסתכל", "בספקנות בריאה"],
  },
  recent: [],
};
function quip() {
  const q = QUIPS[HE ? "he" : "en"], pick = (l) => l[Math.floor(Math.random() * l.length)];
  for (let i = 0; i < 10; i++) {
    const line = Math.random() < 0.5 ? pick(q.lines) : `${pick(q.act)}${HE ? " " : ", "}${pick(q.twist)}`;
    if (!QUIPS.recent.includes(line) || i === 9) { QUIPS.recent = [line, ...QUIPS.recent].slice(0, 15); return line + "…"; }
  }
}
setInterval(() => $$(".quip").forEach((el) => (el.textContent = quip())), 2800);
const thinking = (status = "") => `<div class="thinking"><span class="wait"></span><span class="quip">${esc(quip())}</span></div>`
  + (status ? `<div class="status" dir="auto">${esc(status)}</div>` : "");

// ---------- the conversation ----------
let conv = store.get("conv");
const TURNS = [];  // answers shown, for Copy: {text, cites}

function answerHTML(r) {
  const n = TURNS.push({ text: r.text || "", cites: r.cites || {} }) - 1;
  return (r.text ? `<div class="answer" dir="auto">${markdown(r.text, r.cites || {}, r.urls || {})}</div>` : "")
    + (r.error ? `<p class="err" dir="auto">${esc(errorText(r.error))}</p>` : "")
    + (r.text ? `<div class="tools"><button type="button" class="mini" data-copy="${n}">⧉ <span>${esc(t("copy"))}</span></button></div>` : "")
    + ((r.suggestions || []).length ? `<div class="follow">${r.suggestions.map((s) => `<button type="button" class="chip" data-ask="${esc(s.question)}" dir="auto">${esc(s.label)}</button>`).join("")}</div>` : "");
}

async function ask(q) {
  q = q.trim();
  if (!q) return;
  showView("chat");
  $("#hello")?.remove();
  $$("#thread .follow").forEach((f) => f.remove());  // the earlier follow-ups give way to the new question
  const th = $("#thread");
  th.insertAdjacentHTML("beforeend", `<div class="me" dir="auto">${esc(q)}</div><div class="turn">${thinking()}</div>`);
  const turn = th.lastElementChild;
  $("#q").value = ""; $("#q").style.height = "";
  $("#ask-form button").disabled = true;
  turn.scrollIntoView({ block: "end" });
  const r = await request({ type: "ask", q, conv }, (st) => { turn.innerHTML = thinking(st.text); });
  $("#ask-form button").disabled = false;
  if (!r) { turn.innerHTML = `<p class="err">${t("timeout")}</p>`; ping(); return; }
  if (r.type === "error") { turn.innerHTML = `<p class="err" dir="auto">${esc(errorText(r.text))}</p>`; return; }
  conv = r.conv || conv; store.set("conv", conv);
  $("#q").placeholder = t("reply");
  turn.innerHTML = answerHTML(r);
}

function newConversation() {
  conv = null; store.del("conv"); TURNS.length = 0;
  $("#thread").innerHTML = `<div class="hello" id="hello"><svg class="hello-mark" aria-hidden="true"><use href="#mark"/></svg><p>${esc(t("hello"))}</p></div>`;
  $("#q").placeholder = t("ask-placeholder");
  showView("chat");
  $("#q").focus();
}

async function openConversation(id) {
  showView("chat");
  $("#thread").innerHTML = `<div class="turn">${thinking()}</div>`;
  const c = await requestJSON({ type: "conv", conv: id });
  if (!c || c.error) { $("#thread").innerHTML = `<p class="err">${esc(c?.error || t("timeout"))}</p>`; return; }
  conv = c.id; store.set("conv", conv); TURNS.length = 0;
  $("#thread").innerHTML = c.turns.map((tn, i) => tn.role === "user" ? `<div class="me" dir="auto">${esc(tn.text)}</div>`
    : `<div class="turn">${answerHTML({ text: tn.text, cites: c.cites, urls: c.urls, suggestions: i === c.turns.length - 1 ? tn.suggestions : [] })}</div>`).join("");
  $("#q").placeholder = t("reply");
  $("#thread").lastElementChild?.scrollIntoView({ block: "end" });
}

// The computer's errors arrive in English; the common ones get a plain explanation in the phone's language.
function errorText(e) {
  if (/Couldn't reach the gateway/.test(e)) return HE
    ? "המחשב לא הצליח להגיע ל־AI של המוסד. הוא זמין רק מתוך הרשת של המוסד: חבר את המחשב ל־VPN ונסה שוב."
    : "Your computer couldn't reach your institution's AI. It is only open inside the institution: connect the computer to the VPN and try again.";
  if (/Couldn't reach/.test(e)) return HE ? "המחשב לא הצליח להגיע ל־AI. בדוק את החיבור לאינטרנט במחשב ונסה שוב." : e;
  if (/didn't accept the key/.test(e)) return HE ? "ה־AI לא קיבל את המפתח. בדוק אותו במחשב: הגדרות ← AI." : e;
  if (/Connect an AI first/.test(e)) return HE ? "במחשב עדיין לא חובר AI: הגדרות ← AI." : e;
  return e;
}

// Copy an answer (citations as "Author, Year"), as text and as formatted text; code and formulas too.
async function copyText(text, html) {
  try {
    if (html && window.ClipboardItem && navigator.clipboard.write) {
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": new Blob([text], { type: "text/plain" }), "text/html": new Blob([html], { type: "text/html" }) })]);
    } else await navigator.clipboard.writeText(text);
    return true;
  } catch { return false; }
}
function flash(el, text) { const old = el.textContent; el.textContent = text; setTimeout(() => (el.textContent = old), 1500); }

document.addEventListener("click", async (e) => {
  const c = e.target.closest("[data-copy]");
  if (c) {
    const a = TURNS[+c.dataset.copy];
    const text = a.text.replace(/==([^=\n]+?)==/g, "$1").replace(/\[@([A-Z0-9]{8})\]/g, (_, k) => `(${a.cites[k] || k})`).trim();
    const html = (c.closest(".turn")?.querySelector(".answer")?.innerHTML || "").replace(/<mark class="key-line">/g, '<span style="background:#E9DFF7">').replace(/<\/mark>/g, "</span>");
    if (await copyText(text, html)) flash(c.querySelector("span"), t("copied"));
  }
  const k = e.target.closest(".copy-code");
  if (k && await copyText(k.parentElement.querySelector("code").innerText)) flash(k, t("copied"));
  const m = e.target.closest(".math[data-tex]");
  if (m && await copyText(`$$${m.dataset.tex}$$`)) { m.classList.add("copied"); setTimeout(() => m.classList.remove("copied"), 900); }
  const s = e.target.closest("[data-ask]");
  if (s) ask(s.dataset.ask);
});

// ---------- Radar, library, past conversations ----------
async function loadRadar() {
  const box = $("#briefing");
  box.innerHTML = `<div class="empty">${thinking()}</div>`;
  const r = await request({ type: "briefing" }, null, 30000);
  if (!r) { box.innerHTML = `<p class="empty">${t("offline-long")}</p>`; return; }
  let d; try { d = JSON.parse(r.text); } catch { d = { items: [] }; }
  box.innerHTML = d.items.length ? d.items.map((i) => `<article class="item">
      <div class="h ${i.kind === "new" ? "new" : ""}" dir="auto">${i.url ? `<a href="${esc(safeUrl(i.url))}" target="_blank" rel="noopener">${esc(i.headline)}</a>` : esc(i.headline)}</div>
      ${i.venue ? `<div class="m">${esc(i.venue)}</div>` : ""}<p dir="auto">${esc(i.takeaway)}</p></article>`).join("")
    : `<p class="empty">${t("no-briefing")}</p>`;
}

async function search(q) {
  const box = $("#results");
  if (!q.trim()) { box.innerHTML = ""; return; }
  box.innerHTML = `<li class="empty"><span class="wait"></span></li>`;
  const r = await request({ type: "search", q }, null, 30000);
  if (!r) { box.innerHTML = `<li class="empty">${t("offline-long")}</li>`; return; }
  let rows; try { rows = JSON.parse(r.text); } catch { rows = []; }
  box.innerHTML = rows.length ? rows.map((p) => `<li class="item"><div class="h" dir="auto">${p.url ? `<a href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener">${esc(p.title)}</a>` : esc(p.title)}</div>
      <div class="m">${esc(p.cite)}${p.venue ? " · " + esc(p.venue) : ""}</div></li>`).join("") : `<li class="empty">${t("no-results")}</li>`;
}

async function loadConvs() {
  const box = $("#convs");
  box.innerHTML = `<li class="empty"><span class="wait"></span></li>`;
  const rows = await requestJSON({ type: "convs" }, 30000);
  if (!rows || rows.error) { box.innerHTML = `<li class="empty">${esc(rows?.error || t("offline-long"))}</li>`; return; }
  const when = (s) => { try { return new Date(s).toLocaleDateString(HE ? "he-IL" : undefined, { day: "numeric", month: "short" }); } catch { return ""; } };
  box.innerHTML = rows.length ? rows.map((c) => `<li><button type="button" class="conv-row" data-conv="${esc(c.id)}"><span dir="auto">${esc(c.title || "…")}</span><small>${esc(when(c.at))}</small></button></li>`).join("")
    : `<li class="empty">${t("no-convs")}</li>`;
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-conv]"); if (b) openConversation(b.dataset.conv); });

// ---------- I’m bored: something to learn, chosen together (a few taps), or a surprise ----------
const LEARN = { path: [] };
const FIRST = ["l-math", "l-theory", "l-method", "l-finding", "l-beyond", "l-surprise"];
function learnStart() {
  LEARN.path = [];
  $("#learn-more").hidden = true;
  $("#learn-box").innerHTML = `<p class="lede">${esc(t("learn-q"))}</p><div class="options">${FIRST.map((k) =>
    `<button type="button" class="option" data-first="${k}">${esc(t(k))}</button>`).join("")}</div>`;
}
function crumbs() {
  return LEARN.path.length ? `<div class="crumbs">${LEARN.path.map((x) => `<span>${esc(x.a)}</span>`).join("<i>›</i>")}</div>` : "";
}
async function learnNext() {
  const box = $("#learn-box");
  box.innerHTML = crumbs() + `<div class="empty">${thinking()}</div>`;
  const r = await requestJSON({ type: "learn_step", path: LEARN.path }, 90000);
  if (!r || r.error) { box.innerHTML = crumbs() + `<p class="err">${esc(errorText(r?.error || t("timeout")))}</p><button class="btn quiet" type="button" data-learn-restart>${esc(t("start-over"))}</button>`; return; }
  if (r.options) {
    box.innerHTML = crumbs() + `<p class="lede" dir="auto">${esc(r.question)}</p><div class="options">${r.options.map((o) =>
      `<button type="button" class="option" data-answer="${esc(o)}" data-q="${esc(r.question)}" dir="auto">${esc(o)}</button>`).join("")}</div>`
      + `<button class="link quiet" type="button" data-learn-restart>${esc(t("start-over"))}</button>`;
    return;
  }
  const [body, think] = (r.text || "").split(/\n\s*Think about:\s*/);
  box.innerHTML = crumbs() + `<article class="learn">${r.papers.map((x) => `<div class="m" dir="auto">${esc(x.cite)} · ${x.url ? `<a href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener">${esc(x.title)}</a>` : esc(x.title)}</div>`).join("")}
    <div class="answer" dir="auto">${markdown(body || "")}</div>
    ${think ? `<p class="think" dir="auto"><b>${HE ? "לחשוב על:" : "Think about:"}</b> ${esc(think)}</p>` : ""}
    <div class="row-btns start"><button class="btn" type="button" data-talk="${esc(r.papers[0]?.title || "")}" data-cite="${esc(r.papers[0]?.cite || "")}">${esc(t("talk-about"))}</button>
    <button class="btn quiet" type="button" data-learn-restart>${esc(t("another"))}</button></div></article>`;
}
document.addEventListener("click", (e) => {
  const f = e.target.closest("[data-first]");
  if (f) {
    if (f.dataset.first === "l-surprise") return loadLearn();
    LEARN.path = [{ q: t("learn-q"), a: T[f.dataset.first][0] }];
    return learnNext();
  }
  const a = e.target.closest("[data-answer]");
  if (a) { LEARN.path.push({ q: a.dataset.q, a: a.dataset.answer }); return learnNext(); }
  if (e.target.closest("[data-learn-restart]")) return learnStart();
  const talk = e.target.closest("[data-talk]");
  if (talk) ask(`Let's talk about "${talk.dataset.talk}" (${talk.dataset.cite}): what's the key idea, and what can I take from it for my own research?`);
});

// Surprise me: one interesting thing from a random paper.
async function loadLearn() {
  const box = $("#learn-box");
  $("#learn-more").disabled = true;
  box.innerHTML = `<div class="empty">${thinking()}</div>`;
  const r = await requestJSON({ type: "learn" }, 90000);
  $("#learn-more").disabled = false;
  if (!r || r.error) { box.innerHTML = `<p class="err">${esc(errorText(r?.error || t("timeout")))}</p>`; return; }
  const [body, think] = r.text.split(/\n\s*Think about:\s*/);
  $("#learn-more").hidden = false;
  box.innerHTML = `<article class="learn"><div class="m" dir="auto">${esc(r.cite)}</div><h2 dir="auto">${esc(r.title)}</h2>
    <div class="answer" dir="auto">${markdown(body || "")}</div>
    ${think ? `<p class="think" dir="auto"><b>${HE ? "לחשוב על:" : "Think about:"}</b> ${esc(think)}</p>` : ""}
    ${r.url ? `<a class="btn quiet" href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener">${esc(t("open-paper"))}</a>` : ""}</article>`;
}

// ---------- I’m bored: stats of past games (kept on this phone), shown when a game ends ----------
function record(game, entry) {
  const all = store.get("stats-" + game) || [];
  if (!all.some((x) => x.day === entry.day)) { all.push(entry); store.set("stats-" + game, all.slice(-365)); }
}
function statsHTML(game) {
  const all = store.get("stats-" + game) || [];
  if (!all.length) return "";
  const won = all.filter((x) => x.won).length;
  const buckets = game === "conn" ? [0, 1, 2, 3, 4].map((n) => [String(n), all.filter((x) => x.won && x.mistakes === n).length])
    : [["1-5", [1, 5]], ["6-10", [6, 10]], ["11-15", [11, 15]], ["16-21", [16, 21]]].map(([l, [a, b]]) => [l, all.filter((x) => x.won && x.questions >= a && x.questions <= b).length]);
  buckets.push([t("not-found"), all.filter((x) => !x.won).length]);
  const max = Math.max(1, ...buckets.map(([, n]) => n));
  const hints = game === "conn" ? `<div class="stat-line">${esc(t("hints-used"))}: <b>${all.filter((x) => x.hints).length}</b></div>` : "";
  return `<section class="stats"><h3>${esc(t("stats"))}</h3>
    <div class="stat-nums"><div><b>${all.length}</b><span>${esc(t("played"))}</span></div><div><b>${Math.round(100 * won / all.length)}%</b><span>${esc(t("won"))}</span></div></div>
    <div class="stat-line">${esc(t(game === "conn" ? "by-mistakes" : "by-questions"))}</div>
    ${buckets.map(([l, n]) => `<div class="bar-row"><span>${esc(l)}</span><div class="stat-bar"><i style="width:${Math.max(4, 100 * n / max)}%"></i></div><b>${n}</b></div>`).join("")}
    ${hints}</section>`;
}

// ---------- I’m bored: today's Who am I? (kept for the day on this phone) ----------
const today = () => new Date().toISOString().slice(0, 10);
let Q20 = null;
const Q20_MAX = 21;
async function loadQ20() {
  Q20 = store.get("q20");
  if (!Q20 || Q20.day !== today()) Q20 = { day: today(), asked: [], done: false, paper: null, won: false };
  if (!Q20.papers) {
    $("#q20-intro").innerHTML = thinking();
    const r = await requestJSON({ type: "q20" }, 30000);
    if (!r || r.error) { $("#q20-intro").innerHTML = `<span class="err">${esc(r?.error || t("timeout"))}</span>`; return; }
    Q20.papers = r.papers; Q20.day = r.day || Q20.day;
  }
  store.set("q20", Q20);
  paintQ20();
}
function paintQ20() {
  $("#q20-intro").textContent = t("q20-intro", { n: Q20.papers });
  $("#q20-list").innerHTML = Q20.asked.map((a) => `<li><span dir="auto">${esc(a.q)}</span><b class="ans ${a.answer}">${esc(t("a-" + a.answer))}</b>${a.note ? `<small dir="auto">${esc(a.note)}</small>` : ""}</li>`).join("");
  const left = Q20_MAX - Q20.asked.length;
  // How close: from cold to hot, judged on everything asked so far (the computer's AI knows the answer).
  const w = [...Q20.asked].reverse().find((a) => typeof a.warmth === "number");
  $("#q20-warmth").hidden = !w;
  if (w) {
    const prev = Q20.asked.filter((a) => typeof a.warmth === "number").slice(-2, -1)[0];
    const level = w.warmth >= 90 ? "w-burning" : w.warmth >= 70 ? "w-hot" : w.warmth >= 45 ? "w-warm" : w.warmth >= 20 ? "w-tepid" : "w-cold";
    $("#q20-warmth i").style.width = Math.max(4, w.warmth) + "%";
    $("#q20-warmth").dataset.level = level;
    $("#q20-warmth span").textContent = t(level) + (prev && w.warmth > prev.warmth ? " ↑" : prev && w.warmth < prev.warmth ? " ↓" : "");
  }
  $("#q20-form").hidden = Q20.done;
  $("#q20-give-up").hidden = Q20.done || !Q20.asked.length;
  $("#q20-q").placeholder = t("q20-placeholder");
  $("#q20-left").textContent = Q20.done ? "" : t("q20-left", { n: left });
  const p = Q20.paper;
  if (Q20.done) record("q20", { day: Q20.day, won: Q20.won, questions: Q20.asked.length });
  $("#q20-end").innerHTML = Q20.done && p ? `<div class="reveal ${Q20.won ? "won" : ""}"><b>${esc(Q20.won ? t("q20-won", { n: Q20.asked.length }) : t("q20-lost"))}</b>
      <div class="h" dir="auto">${p.url ? `<a href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener">${esc(p.title)}</a>` : esc(p.title)}</div><div class="m">${esc(p.cite)}${p.venue ? " · " + esc(p.venue) : ""}</div></div>${statsHTML("q20")}` : "";
}
$("#q20-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("#q20-q").value.trim();
  if (!q || Q20.done) return;
  $("#q20-q").value = "";
  $("#q20-list").insertAdjacentHTML("beforeend", `<li class="asking"><span dir="auto">${esc(q)}</span><span class="wait"></span></li>`);
  // The earlier questions go along: the answer to "how close am I" depends on all of them.
  const r = await requestJSON({ type: "q20", q, history: Q20.asked.map((a) => ({ q: a.q, answer: a.answer })) }, 60000);
  if (!r || r.error) { $("#q20-list .asking")?.remove(); $("#q20-intro").textContent = r?.error || t("timeout"); return; }
  Q20.asked.push({ q, answer: r.answer, note: r.note || "", warmth: typeof r.warmth === "number" ? r.warmth : null });
  if (r.named) Object.assign(Q20, { done: true, won: true, paper: r.paper });
  else if (Q20.asked.length >= Q20_MAX) await revealQ20();
  store.set("q20", Q20);
  paintQ20();
});
async function revealQ20() {
  const r = await requestJSON({ type: "q20", reveal: true }, 30000);
  Object.assign(Q20, { done: true, won: false, paper: r?.paper || null });
  store.set("q20", Q20);
  paintQ20();
}
$("#q20-give-up").addEventListener("click", revealQ20);

// ---------- I'm bored: today's Connections (kept for the day on this phone) ----------
let CN = null;
async function loadConn() {
  CN = store.get("conn");
  if (!CN || CN.day !== today() || !CN.groups) {
    $("#conn-grid").innerHTML = `<div class="empty">${thinking()}</div>`;
    const r = await requestJSON({ type: "connections" }, 90000);
    if (!r || r.error) { $("#conn-grid").innerHTML = `<p class="err">${esc(r?.error || t("timeout"))}</p>`; return; }
    const words = r.groups.flatMap((g) => g.words).sort(() => Math.random() - 0.5);
    CN = { day: today(), groups: r.groups, level: r.level || "medium", order: words, solved: [], mistakes: 4, picked: [], hint: null };
    store.set("conn", CN);
  }
  CN.picked = [];
  paintConn();
}
function paintConn(note = "") {
  const solvedWords = new Set(CN.solved.flatMap((i) => CN.groups[i].words));
  const hinted = new Set(CN.hint || []);
  $("#conn-solved").innerHTML = CN.solved.map((i) => `<div class="group g${i}"><b dir="auto">${esc(CN.groups[i].name)}</b><span dir="auto">${CN.groups[i].words.map(esc).join(", ")}</span></div>`).join("");
  const over = CN.solved.length === 4 || CN.mistakes <= 0;
  $("#conn-grid").innerHTML = over ? "" : CN.order.filter((w) => !solvedWords.has(w)).map((w) =>
    `<button type="button" class="tile${hinted.has(w) ? " hinted" : ""}" aria-pressed="${CN.picked.includes(w)}" data-word="${esc(w)}" dir="auto">${esc(w)}</button>`).join("");
  $("#conn-level").textContent = t("level-" + (CN.level || "medium"));
  $("#conn-hint").hidden = over || !!CN.hint;
  if (over) record("conn", { day: CN.day, won: CN.solved.length === 4 && CN.mistakes > 0, mistakes: 4 - CN.mistakes, hints: CN.hint ? 1 : 0 });
  $("#conn-stats").innerHTML = over ? statsHTML("conn") : "";
  $("#conn-mistakes").textContent = note || (over ? (CN.solved.length === 4 ? t("conn-won") : t("conn-lost")) : t("mistakes", { n: "●".repeat(CN.mistakes) }));
  $("#conn-submit").disabled = CN.picked.length !== 4 || over;
  $("#conn-shuffle").hidden = $("#conn-clear").hidden = $("#conn-submit").hidden = over;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-word]");
  if (!b) return;
  const w = b.dataset.word;
  CN.picked = CN.picked.includes(w) ? CN.picked.filter((x) => x !== w) : CN.picked.length < 4 ? [...CN.picked, w] : CN.picked;
  paintConn();
  // The last group: picking its four is enough.
  if (CN.solved.length === 3 && CN.picked.length === 4) $("#conn-submit").click();
});
$("#conn-shuffle").addEventListener("click", () => { CN.order.sort(() => Math.random() - 0.5); store.set("conn", CN); paintConn(); });
$("#conn-clear").addEventListener("click", () => { CN.picked = []; paintConn(); });
$("#conn-submit").addEventListener("click", () => {
  const i = CN.groups.findIndex((g) => g.words.every((w) => CN.picked.includes(w)));
  if (i >= 0) { CN.solved.push(i); CN.picked = []; store.set("conn", CN); paintConn(); return; }
  const near = CN.groups.some((g) => g.words.filter((w) => CN.picked.includes(w)).length === 3);
  // A wrong four: they flash red and shake, then let go.
  $$(".tile[aria-pressed=true]").forEach((el) => el.classList.add("wrong"));
  CN.mistakes -= 1;
  if (CN.mistakes <= 0) CN.solved = [...CN.solved, ...CN.groups.map((_, j) => j).filter((j) => !CN.solved.includes(j))];
  CN.picked = [];
  store.set("conn", CN);
  setTimeout(() => paintConn(CN.mistakes > 0 ? (near ? t("one-away") : t("not-group")) : ""), 650);
});
// The one hint: two terms of a group not found yet.
$("#conn-hint").addEventListener("click", () => {
  const open = CN.groups.map((g, i) => i).filter((i) => !CN.solved.includes(i));
  const g = CN.groups[open[Math.floor(Math.random() * open.length)]];
  CN.hint = g.words.slice().sort(() => Math.random() - 0.5).slice(0, 2);
  store.set("conn", CN);
  paintConn();
});

// ---------- views and the side menu ----------
const VIEWS = { chat: "Ganglion", radar: "radar", library: "library", history: "history", bored: "bored", learn: "learn", q20: "q20", conn: "conn-game", settings: "settings" };
let VIEW = "chat";
function showView(name) {
  VIEW = name;
  for (const v of Object.keys(VIEWS)) $("#view-" + v).hidden = v !== name;
  $("#view-name").textContent = name === "chat" ? "Ganglion" : t(VIEWS[name]);
  closeMenu();
  if (name === "radar") loadRadar();
  if (name === "history") loadConvs();
  if (name === "learn") learnStart();
  if (name === "q20") loadQ20();
  if (name === "conn") loadConn();
  if (name === "settings") { paintFacts(); paintLangSeg(); }
  if (name === "library") setTimeout(() => $("#s").focus(), 50);
}
function openMenu() { $("#menu").hidden = $("#scrim").hidden = false; requestAnimationFrame(() => document.body.classList.add("menu-open")); $("#menu-btn").setAttribute("aria-expanded", "true"); }
function closeMenu() {
  document.body.classList.remove("menu-open");
  $("#menu-btn").setAttribute("aria-expanded", "false");
  setTimeout(() => { if (!document.body.classList.contains("menu-open")) $("#menu").hidden = $("#scrim").hidden = true; }, 220);
}
$("#menu-btn").addEventListener("click", () => (document.body.classList.contains("menu-open") ? closeMenu() : openMenu()));
$("#scrim").addEventListener("click", closeMenu);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
document.addEventListener("click", (e) => {
  const m = e.target.closest("[data-view]");
  if (m) m.dataset.view === "new" ? newConversation() : showView(m.dataset.view);
  const g = e.target.closest("[data-go]");
  if (g) showView(g.dataset.go);
});

// ---------- language ----------
function applyLang() {
  document.documentElement.lang = HE ? "he" : "en";
  document.documentElement.dir = HE ? "rtl" : "ltr";
  $$("[data-t]").forEach((el) => (el.textContent = t(el.dataset.t)));
  $$("[data-tp]").forEach((el) => (el.placeholder = t(el.dataset.tp)));
  $$("[data-lang-toggle]").forEach((b) => (b.textContent = HE ? "English" : "עברית"));
  if (conv) $("#q").placeholder = t("reply");
  $("#view-name").textContent = VIEW === "chat" ? "Ganglion" : t(VIEWS[VIEW]);
  paintFacts(); paintLangSeg();
  if (VIEW === "q20" && Q20) paintQ20();
  if (VIEW === "conn" && CN) paintConn();
}
function paintLangSeg() { $$("#lang-seg [data-lang]").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.lang === "he") === HE))); }
function setLang(he) { HE = he; try { localStorage.setItem("ganglion-link-lang", HE ? "he" : "en"); } catch {} applyLang(); }
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-lang]");
  if (b) setLang(b.dataset.lang === "he");
  if (e.target.closest("[data-lang-toggle]")) setLang(!HE);
});
// Another language: a request to Ganglion's developers, as an issue on its public page (nothing is sent from here).
$("#lang-request").addEventListener("click", () => {
  const a = document.createElement("a");
  a.href = "https://github.com/ebryg/ganglion-app/issues/new?title=" + encodeURIComponent("Language request: ") + "&body=" + encodeURIComponent("Please add this language to Ganglion: ");
  a.target = "_blank"; a.rel = "noopener"; document.body.append(a); a.click(); a.remove();
});

// ---------- start ----------
async function start() {
  applyLang();
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
  $("#menu-btn").hidden = false;
  listen();
  ping();
  // A notification opens the Radar (#updates; older ones say #briefing). The address is then left clean.
  const radar = location.hash === "#updates" || location.hash === "#briefing";
  if (location.hash) history.replaceState(null, "", location.pathname);
  showView(radar ? "radar" : "chat");
  if (conv && !radar) openConversation(conv);
}

$("#ask-form").addEventListener("submit", (e) => { e.preventDefault(); ask($("#q").value); });
for (const id of ["#q", "#q20-q"]) $(id).addEventListener("input", (e) => { e.target.style.height = ""; e.target.style.height = e.target.scrollHeight + "px"; });
$("#refresh-briefing").addEventListener("click", loadRadar);
$("#learn-more").addEventListener("click", loadLearn);
let searchTimer;
$("#search-form").addEventListener("submit", (e) => { e.preventDefault(); search($("#s").value); });
$("#s").addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => search($("#s").value), 500); });
let armed = false;
$("#unpair").addEventListener("click", () => {
  if (!armed) { armed = true; $("#unpair").textContent = t("unpair-confirm"); setTimeout(() => { armed = false; $("#unpair").textContent = t("unpair"); }, 3000); return; }
  ["pairing", "since", "conv", "q20", "conn"].forEach(store.del);
  location.reload();
});
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
start();
