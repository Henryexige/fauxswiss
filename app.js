const C = window.CONFIG;
const { langs: LANGS, dict: DICT } = window.I18N;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let products = [];
const filter = { best: false, brand: "", collection: "", her: false, acc: "", cw: "", sub: 0, q: "" };

/* ---------- Language ---------- */
let lang = "en";
try { const s = localStorage.getItem("fs.lang"); if (LANGS.some(l => l.code === s)) lang = s; } catch {}
const apiLang = () => (LANGS.find(l => l.code === lang) || LANGS[0]).api;
const t = k => (DICT[lang] && DICT[lang][k]) ?? (lang === "es-419" ? DICT.es[k] : undefined) ?? DICT.en[k] ?? k;
const money = v => new Intl.NumberFormat(lang, { style: "currency", currency: C.currency }).format(Number(v));

// Text that is translated on demand by the server (product descriptions and your own page text).
// Product names, brand names and collection names are never translated.
let trCache = {};
const failed = new Set();
const pending = new Set();
let flushTimer = null;
const trKey = () => "fs.tr." + apiLang();
const loadTr = () => { try { trCache = JSON.parse(localStorage.getItem(trKey()) || "{}"); } catch { trCache = {}; } };
const saveTr = () => { try { const s = JSON.stringify(trCache); if (s.length < 400000) localStorage.setItem(trKey(), s); } catch {} };

function dyn(text, key) {
  if (!text) return "";
  if (apiLang() === "en") return text;
  if (key && text === DICT.en[key]) return t(key);
  if (trCache[text]) return trCache[text];
  if (!pending.has(text) && !failed.has(text)) {
    pending.add(text);
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 60);
  }
  return text;
}

async function flush() {
  const l = lang, api = apiLang();
  if (api === "en") { pending.clear(); return; }
  const texts = [...pending].slice(0, 30);
  texts.forEach(x => pending.delete(x));
  if (!texts.length) return;
  try {
    const r = await fetch("/api/translate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lang: api, texts }) });
    if (!r.ok) throw new Error("translate failed");
    const { translations } = await r.json();
    if (lang !== l) return;
    let changed = false;
    texts.forEach((x, i) => { if (translations[i]) { trCache[x] = translations[i]; changed = true; } else failed.add(x); });
    if (changed) { saveTr(); renderDynamic(); }
  } catch { texts.forEach(x => failed.add(x)); }
  if (pending.size) flush();
}

function applyStatic() {
  ["dNote", "catNote"].forEach(id => { const el = document.getElementById(id); if (el) el.hidden = C.catalogMode === false; });
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
}

function buildFootLang() {
  const sel = $("footLang");
  if (!sel) return;
  sel.innerHTML = LANGS.map(l => `<option value="${l.code}"${l.code === lang ? " selected" : ""}>${esc(l.label)}</option>`).join("");
  sel.onchange = () => setLang(sel.value);
}

function buildLangMenu() {
  $("langMenu").innerHTML = LANGS.map(l =>
    `<li translate="no"><button type="button" data-code="${l.code}" lang="${l.code}" translate="no"${l.code === lang ? ' aria-current="true"' : ""}>${esc(l.label)}${l.code === lang ? " ✓" : ""}</button></li>`).join("");
  $("langMenu").querySelectorAll("button").forEach(b => b.onclick = e => { e.stopPropagation(); closeMenus(); setLang(b.dataset.code); });
}

function setLang(code) {
  if (!LANGS.some(l => l.code === code) || code === lang) return;
  lang = code;
  try { localStorage.setItem("fs.lang", code); } catch {}
  failed.clear(); pending.clear();
  loadTr();
  applyStatic();
  fillText();
  setMapText();
  buildLangMenu();
  buildFootLang();
  buildMenus();
  apply(false);
  coverflows();
  renderJournal();
  if (cur && onProduct()) { drawDetail(); drawExplore(); }
  closeSugg();
}

function renderDynamic() {
  fillText();
  if (products.length) buildMenus();
  setMapText();
  if (cur && onProduct()) drawDetail();
}

/* ---------- Page text ---------- */
function fillText() {
  document.title = C.brand;
  $("brandName").textContent = C.brand;
  $("footBrand").textContent = C.brand;
  $("tagline").textContent = dyn(C.tagline, "tagline");
  $("intro").textContent = dyn(C.intro, "intro");
  // A real street address is shown exactly as written in every language (only the placeholder is translated).
  const realAddr = C.store.address !== DICT.en.addr;
  $("address").textContent = realAddr ? C.store.address : dyn(C.store.address, "addr");
  if ($("footAddr")) $("footAddr").textContent = realAddr ? C.store.address : "";
  $("hours").textContent = dyn(C.store.hours, "hrs");
  $("yr").textContent = new Date().getFullYear();

  if (C.announcement) {
    $("announce").innerHTML = [].concat(C.announcement).map((x, i) => `<span>${esc(dyn(x, "announce" + i))}</span>`).join("");
    $("announce").hidden = false;
  }

  const k = C.contact;
  if (k.whatsapp) { $("waLink").href = `https://wa.me/${encodeURIComponent(k.whatsapp)}`; $("waLink").hidden = false; }
  const lines = [];
  if (k.whatsapp) lines.push(`<a href="https://wa.me/${encodeURIComponent(k.whatsapp)}">WhatsApp</a>`);
  if (k.email) lines.push(`<a href="mailto:${esc(k.email)}">${esc(k.email)}</a>`);
  $("contactLine").innerHTML = lines.length ? lines.join(" · ") : esc(t("contactSoon"));

  const soc = [];
  if (C.social.instagram) soc.push(`<a href="${esc(C.social.instagram)}" rel="noopener">Instagram</a>`);
  if (C.social.facebook) soc.push(`<a href="${esc(C.social.facebook)}" rel="noopener">Facebook</a>`);
  $("social").innerHTML = soc.join("");
}

function heroMedia() {
  const h = C.hero;
  if (!h) return;
  const box = $("heroMedia");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (h.images && h.images.length) {
    box.classList.add("collage");
    box.innerHTML = h.images.slice(0, 3).map(s => `<img src="${esc(s)}" alt="" decoding="async">`).join("");
    $("hero").classList.add("has-media");
    return;
  }
  if (!h.src) return;
  if (h.type === "video" && !still) {
    box.innerHTML = `<video src="${esc(h.src)}" ${h.poster ? `poster="${esc(h.poster)}"` : ""} autoplay muted loop playsinline preload="metadata"></video>`;
  } else {
    box.innerHTML = `<img src="${esc(h.type === "video" ? h.poster || "" : h.src)}" alt="">`;
  }
  $("hero").classList.add("has-media");
}

// A product can carry up to 12 photos or videos: "media": [{ "src": "...", "type": "image" | "video", "poster": "..." }].
// The first photo is the main one shown on cards and carousels; the product window shows them all.
const MAX_MEDIA = 12;
const SLIDE_MS = 3500;
let slideTimer = 0;
const mediaOf = (p, v) => {
  const src = v && Array.isArray(v.media) && v.media.length ? v.media : p.media;
  const m = (Array.isArray(src) ? src : []).filter(x => x && x.src).slice(0, MAX_MEDIA)
    .map(x => ({ src: x.src, poster: x.poster || "", type: x.type || (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(x.src) ? "video" : "image") }));
  return m.length ? m : p.image ? [{ src: p.image, type: "image", poster: "" }] : [];
};
const mainImage = p => { const m = mediaOf(p, p.variants && p.variants[0]).find(x => x.type === "image"); return m ? m.src : (mediaOf(p, p.variants && p.variants[0])[0] || {}).poster || ""; };
// Card price: one price, or "From x" when the options are priced differently.
function priceText(p) {
  if (C.showPrices === false) return "";
  const nums = p.variants.map(v => Number(v.price)).filter(n => !isNaN(n));
  if (!nums.length) return "";
  const lo = Math.min(...nums), hi = Math.max(...nums);
  return lo === hi ? money(String(lo)) : `${t("from")} ${money(String(lo))}`;
}

function imgHtml(p) {
  const src = mainImage(p);
  return src
    ? `<img src="${esc(src)}" alt="${esc(p.title)}" loading="lazy">`
    : `<img class="mark" src="logo-mark.png" alt="">`;
}

function drawMedia(p) {
  const list = mediaOf(p, p.variants[cur.i]);
  if (!list.length) { $("dImg").innerHTML = `<div class="mview">${imgHtml(p)}</div>`; return; }
  cur.m = Math.min(cur.m || 0, list.length - 1);
  const x = list[cur.m];
  const view = x.type === "video"
    ? `<video src="${esc(x.src)}" ${x.poster ? `poster="${esc(x.poster)}"` : ""} controls playsinline preload="metadata"></video>`
    : `<img src="${esc(x.src)}" alt="${esc(p.title)} ${cur.m + 1}">`;
  const nav = list.length > 1
    ? `<button type="button" class="mnav prev" aria-label="Previous">‹</button><button type="button" class="mnav next" aria-label="Next">›</button><span class="mcount">${cur.m + 1} / ${list.length}</span>` : "";
  const thumbs = list.length > 1
    ? `<div class="mthumbs">${list.map((y, i) => `<button type="button" data-m="${i}" aria-label="${i + 1}" aria-current="${i === cur.m}">${y.type === "video" ? `<span class="vplay">▶</span>` + (y.poster ? `<img src="${esc(y.poster)}" alt="">` : "") : `<img src="${esc(y.src)}" alt="" loading="lazy">`}</button>`).join("")}</div>` : "";
  $("dImg").innerHTML = `<div class="mview">${view}${nav}</div>${thumbs}`;
  const go = n => { cur.m = (n + list.length) % list.length; drawMedia(p); };
  // Photos turn by themselves every few seconds; a tap, hover, a playing video or "reduce motion" pauses them.
  clearInterval(slideTimer);
  if (C.autoSlide !== false && list.length > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    slideTimer = setInterval(() => {
      if (!onProduct() || cur.hold > Date.now()) return;
      const vid = $("dImg").querySelector("video");
      if (vid && !vid.paused) return;
      if ($("dImg").querySelector(".mview:hover")) return;
      go(cur.m + 1);
    }, SLIDE_MS);
    const pause = () => { cur.hold = Date.now() + 9000; };      // after the visitor touches anything, wait 9 seconds
    $("dImg").onpointerdown = pause; $("dImg").onkeydown = pause;
  }
  const pv = $("dImg").querySelector(".prev"), nx = $("dImg").querySelector(".next");
  if (pv) { pv.onclick = () => go(cur.m - 1); nx.onclick = () => go(cur.m + 1); }
  $("dImg").querySelectorAll(".mthumbs button").forEach(b => b.onclick = () => go(+b.dataset.m));
  const tb = $("dImg").querySelector(".mthumbs [aria-current='true']");
  if (tb) tb.scrollIntoView({ block: "nearest", inline: "center" });
}

/* ---------- Smart search: typo tolerance, suggestions, popular and recent searches ---------- */
const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tok = s => norm(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

// Edit distance that also counts a swapped pair of letters as one mistake ("wacth" -> "watch").
function dl(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2 = null, prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev; prev = cur;
  }
  return prev[b.length];
}

function tokScore(q, w) {
  if (w === q) return 100;
  if (q.length < 2) return 0;                       // a single letter only matches that exact letter
  if (w.startsWith(q)) return 85 - Math.min(20, w.length - q.length);
  if (q.length >= 5 && w.includes(q)) return 55;
  const max = q.length <= 3 || /\d/.test(q) ? 0 : q.length <= 6 ? 1 : 2;   // no typo guessing for short words or part numbers
  if (!max) return 0;
  const d = dl(q, w, max);
  if (d <= max) return 60 - d * 12;
  if (w.length > q.length) {                       // still typing: compare against the start of the word
    const d2 = dl(q, w.slice(0, q.length), max);
    if (d2 <= max) return 55 - d2 * 12;
  }
  return 0;
}

let index = [], vocab = [];
function indexProducts() {
  const vocabSet = new Set();
  index = products.map(p => {
    const skus = p.variants.flatMap(v => [...tok(v.sku), norm(v.sku).replace(/[^a-z0-9]/g, "")]).filter(Boolean);
    const syn = ["watch", "watches", "timepiece", "wristwatch"];
    if (p.for === "her") syn.push("her", "women", "womens", "woman", "ladies", "lady", "female");
    if (p.for === "him") syn.push("him", "men", "mens", "man", "gents", "male");
    if (p.bestSeller) syn.push("bestseller", "best", "seller", "popular");
    const f = [
      { w: 1.6, t: tok(p.title) },
      { w: 1.3, t: [...tok(p.brand), ...tok(p.collection)] },
      { w: 1.4, t: skus },
      { w: 0.6, t: syn },
      { w: 0.5, t: tok(p.description) }
    ];
    [...f[0].t, ...f[1].t, ...f[3].t].forEach(w => { if (w.length >= 3) vocabSet.add(w); });
    return { p, f };
  });
  vocab = [...vocabSet];
}

function scoreRec(qs, rec) {
  let total = 0;
  for (const q of qs) {
    let best = 0, bestRaw = 0;
    for (const f of rec.f) for (const w of f.t) {
      const raw = tokScore(q, w);
      if (raw > bestRaw) bestRaw = raw;
      if (raw * f.w > best) best = raw * f.w;
    }
    if (bestRaw < 35) return 0;           // every word you typed must match something (allowing for typos)
    total += best;
  }
  return total;
}

function rank(q) {
  const qs = tok(q);
  if (!qs.length) return index.map(r => ({ p: r.p, s: 1 }));
  return index.map(r => ({ p: r.p, s: scoreRec(qs, r) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
}

// Suggest a corrected phrase when a word matches nothing ("rolx" -> "rolex"-like words from your own catalogue).
function correction(q) {
  const qs = tok(q);
  if (!qs.length) return null;
  let changed = false;
  const fixed = qs.map(w => {
    if (w.length < 3 || index.some(r => scoreRec([w], r) > 0)) return w;
    const max = w.length > 6 ? 2 : 1;
    let best = null, bd = max + 1;
    for (const v of vocab) { const d = dl(w, v, max); if (d < bd || (d === bd && best && v.length < best.length)) { bd = d; best = v; } }
    if (best && bd <= max) { changed = true; return best; }
    return w;
  });
  return changed ? fixed.join(" ") : null;
}

const recent = () => { try { return JSON.parse(localStorage.getItem("fs.recent") || "[]"); } catch { return []; } };
function saveRecent(q) {
  q = q.trim();
  if (q.length < 2) return;
  try { localStorage.setItem("fs.recent", JSON.stringify([q, ...recent().filter(x => x.toLowerCase() !== q.toLowerCase())].slice(0, 5))); } catch {}
}

function hi(text, qs) {
  const n = norm(text);
  if (n.length !== text.length) return esc(text);
  let best = null;
  for (const q of qs) { const i = n.indexOf(q); if (i >= 0 && (!best || q.length > best.len)) best = { i, len: q.length }; }
  return best ? esc(text.slice(0, best.i)) + "<b>" + esc(text.slice(best.i, best.i + best.len)) + "</b>" + esc(text.slice(best.i + best.len)) : esc(text);
}

let suggItems = [], suggActive = -1;
function openSugg(items, headings) {
  suggItems = items.filter(i => i.type !== "hd");
  suggActive = -1;
  if (!items.length) { closeSugg(); return; }
  let n = 0;
  $("sugg").innerHTML = items.map(i => {
    if (i.type === "hd") return `<li class="hd" role="presentation">${esc(i.text)}</li>`;
    const id = n++;
    return `<li role="option" id="sg-${id}" data-i="${id}" aria-selected="false">${i.html}</li>`;
  }).join("");
  $("sugg").hidden = false;
  $("q").setAttribute("aria-expanded", "true");
}
function closeSugg() {
  $("sugg").hidden = true;
  $("sugg").innerHTML = "";
  $("q").setAttribute("aria-expanded", "false");
  $("q").removeAttribute("aria-activedescendant");
  suggItems = []; suggActive = -1;
}
function moveSugg(d) {
  if (!suggItems.length) return;
  suggActive = (suggActive + d + suggItems.length) % suggItems.length;
  $("sugg").querySelectorAll("[role=option]").forEach((li, i) => {
    li.classList.toggle("on", i === suggActive);
    li.setAttribute("aria-selected", String(i === suggActive));
  });
  $("q").setAttribute("aria-activedescendant", "sg-" + suggActive);
  $("sugg").querySelector(`#sg-${suggActive}`).scrollIntoView({ block: "nearest" });
}

function showSugg() {
  const raw = $("q").value.trim();
  if (!raw) {                                                   // nothing typed yet: popular and recent searches
    const items = [];
    const rec = recent();
    if (rec.length) {
      items.push({ type: "hd", text: t("recent") });
      rec.forEach(r => items.push({ type: "q", text: r, html: `<span class="t">${esc(r)}</span>` }));
    }
    const pop = (C.popularSearches || []).filter(x => !rec.some(r => r.toLowerCase() === x.toLowerCase()));
    if (pop.length) {
      items.push({ type: "hd", text: t("popular") });
      pop.forEach(r => items.push({ type: "q", text: r, html: `<span class="t">${esc(r)}</span>` }));
    }
    openSugg(items);
    return;
  }
  const qs = tok(raw);
  const items = [];
  const hits = rank(raw).slice(0, 5);
  const last = qs[qs.length - 1];
  if (last) {                                     // matching brands and collections first
    const cats = [];
    [...new Set(products.map(p => p.brand).filter(Boolean))].forEach(v => { if (tok(v).some(w => tokScore(last, w) >= 55)) cats.push({ type: "brand", v, html: `<span class="t">${hi(v, qs)}</span><small>${esc(t("brand"))}</small>` }); });
    [...new Set(products.map(p => p.collection).filter(Boolean))].forEach(v => { if (tok(v).some(w => tokScore(last, w) >= 55)) cats.push({ type: "collection", v, html: `<span class="t">${hi(v, qs)}</span><small>${esc(t("colLabel"))}</small>` }); });
    items.push(...cats.slice(0, 2));
  }
  hits.forEach(h => items.push({ type: "product", h: h.p.handle, html: `<span class="t">${hi(h.p.title, qs)}</span><small>${esc([h.p.brand, h.p.collection].filter(Boolean).join(" · "))}</small>` }));
  if (!hits.length) {
    const fix = correction(raw);
    if (fix) items.unshift({ type: "q", text: fix, html: `<small>${esc(t("didYou"))}</small> <span class="t"><b>${esc(fix)}</b></span>?` });
  }
  openSugg(items);
}

function chooseSugg(i) {
  const it = suggItems[i];
  if (!it) return;
  closeSugg();
  if (it.type === "product") { openDetail(it.h); return; }
  if (it.type === "brand" || it.type === "collection") {
    filter.best = false; filter.her = false; filter.acc = ""; filter.cw = ""; filter.sub = 0; filter.brand = filter.collection = ""; filter.q = "";
    filter[it.type] = it.v;
    $("q").value = "";
    closePanels();
    apply(true);
    return;
  }
  $("q").value = it.text;
  filter.q = it.text;
  saveRecent(it.text);
  closePanels();
  apply(true);
}

/* ---------- Menus and filters ---------- */
const unique = key => [...new Set(products.map(p => p[key]).filter(Boolean))].sort();
const brandList = () => [...new Set([...(C.brands || []), ...unique("brand")])];

function buildMenus() {
  const make = (id, key, all, items, best) => {
    $(id).innerHTML = `<li><button type="button" data-key="${key}" data-best="${best}" data-v="">${esc(all)}</button></li>` +
      items.map(v => `<li><button type="button" data-key="${key}" data-best="${best}" data-v="${esc(v)}">${esc(v)}</button></li>`).join("");
  };
  // Best sellers: each brand opens a short list of categories (tap the brand to open it).
  const cats = C.bestSellerCategories || [];
  $("menuBest").innerHTML = `<li><button type="button" data-v="">${esc(t("allBest"))}</button></li>` +
    (C.bestSellerBrands || brandList().slice(0, 6)).map(b =>
      `<li class="has-sub"><button type="button" class="sub-toggle" aria-expanded="false" data-b="${esc(b)}"><span>${esc(b)}</span><span aria-hidden="true">▾</span></button>
        <ul class="sub" hidden>` +
      cats.map((c, i) => `<li><button type="button" data-b="${esc(b)}" data-c="${i + 1}">${esc(dyn(c, "bestcat" + i))}</button></li>`).join("") + `</ul></li>`).join("");
  const pickBest = (b, c) => { filter.best = true; filter.brand = b; filter.collection = ""; filter.her = false; filter.acc = ""; filter.cw = ""; filter.sub = c; closeMenus(); apply(true); };
  $("menuBest").querySelector("button[data-v]").onclick = () => pickBest("", 0);
  $("menuBest").querySelectorAll(".sub-toggle").forEach(b => b.onclick = e => {
    e.stopPropagation();
    const sub = b.nextElementSibling, open = sub.hidden;
    $("menuBest").querySelectorAll(".sub").forEach(x => { x.hidden = true; x.previousElementSibling.setAttribute("aria-expanded", "false"); });
    sub.hidden = !open; b.setAttribute("aria-expanded", String(open));
  });
  $("menuBest").querySelectorAll(".sub button").forEach(b => b.onclick = () => pickBest(b.dataset.b, +b.dataset.c));
  // Brands: each brand opens its collections (taken from that brand's products, or from C.brandCollections). A brand with none is a plain link.
  const colsOf = b => (C.brandCollections && C.brandCollections[b]) || [...new Set(products.filter(p => p.brand === b).map(p => p.collection).filter(Boolean))].sort();
  $("menuBrands").innerHTML = `<li><button type="button" data-b="" data-c="">${esc(t("allBrands"))}</button></li>` +
    brandList().map(b => {
      const cols = colsOf(b);
      if (!cols.length) return `<li><button type="button" data-b="${esc(b)}" data-c="">${esc(b)}</button></li>`;
      return `<li class="has-sub"><button type="button" class="sub-toggle" aria-expanded="false"><span>${esc(b)}</span><span aria-hidden="true">▾</span></button>
        <ul class="sub" hidden><li><button type="button" data-b="${esc(b)}" data-c="">${esc(t("allOf"))} ${esc(b)}</button></li>` +
        cols.map(c => `<li><button type="button" data-b="${esc(b)}" data-c="${esc(c)}">${esc(c)}</button></li>`).join("") + `</ul></li>`;
    }).join("");
  $("menuBrands").querySelectorAll(".sub-toggle").forEach(b => b.onclick = e => {
    e.stopPropagation();
    const sub = b.nextElementSibling, open = sub.hidden;
    $("menuBrands").querySelectorAll(".sub").forEach(x => { x.hidden = true; x.previousElementSibling.setAttribute("aria-expanded", "false"); });
    sub.hidden = !open; b.setAttribute("aria-expanded", String(open));
  });
  $("menuBrands").querySelectorAll("button[data-b]").forEach(b => b.onclick = () => {
    filter.best = filter.her = false; filter.acc = ""; filter.cw = ""; filter.sub = 0;
    filter.brand = b.dataset.b; filter.collection = b.dataset.c;
    closeMenus();
    apply(true);
  });
  $("menuCw").innerHTML = [["all", t("cwAll")], ...(C.customBrands || []).map(b => [b, b])]
    .map(([v, l]) => `<li><button type="button" data-v="${esc(v)}">${esc(l)}</button></li>`).join("");
  $("menuCw").querySelectorAll("button").forEach(b => b.onclick = () => {
    filter.cw = b.dataset.v;
    filter.best = filter.her = false; filter.acc = ""; filter.brand = filter.collection = "";
    closeMenus();
    apply(true);
  });
  $("menuAcc").innerHTML = [["all", t("accAll")], ["boxes", t("boxes")], ["straps", t("straps")]]
    .map(([v, l]) => `<li><button type="button" data-v="${v}">${esc(l)}</button></li>`).join("");
  $("menuAcc").querySelectorAll("button").forEach(b => b.onclick = () => {
    filter.acc = b.dataset.v; filter.cw = ""; filter.sub = 0;
    filter.best = filter.her = false; filter.brand = filter.collection = "";
    closeMenus();
    apply(true);
  });
}

function closeMenus() {
  document.querySelectorAll(".drop").forEach(d => d.hidden = true);
  document.querySelectorAll(".menu > button").forEach(b => b.setAttribute("aria-expanded", "false"));
  $("langBtn").setAttribute("aria-expanded", "false");
}

function toggleMenu(btn, list) {
  const open = list.hidden;
  closeMenus();
  list.hidden = !open;
  btn.setAttribute("aria-expanded", String(open));
}

function baseMatch(p) {
  if (filter.best && !p.bestSeller) return false;
  if (filter.her && p.for !== "her") return false;
  if (filter.sub && Number(p.subcategory) !== filter.sub) return false;
  if (filter.cw && (p.edition !== "custom" || (filter.cw !== "all" && p.brand !== filter.cw))) return false;
  if (filter.acc && (p.category !== "accessory" || (filter.acc !== "all" && p.accType !== filter.acc))) return false;
  if (filter.brand && p.brand !== filter.brand) return false;
  if (filter.collection && p.collection !== filter.collection) return false;
  return true;
}

function apply(scroll) {
  if (scroll && onProduct()) {                 // a menu or search used on a product page: go home and show the result there
    try { sessionStorage.setItem("fs.go", JSON.stringify(filter)); } catch {}
    location.href = "/" + location.search;
    return;
  }
  let list = products.filter(baseMatch);
  if (filter.q) {
    const scores = new Map(rank(filter.q).map(x => [x.p.handle, x.s]));
    list = list.filter(p => scores.has(p.handle)).sort((a, b) => scores.get(b.handle) - scores.get(a.handle));
  }
  const parts = [];
  if (filter.her) parts.push(t("forHer"));
  if (filter.cw) parts.push(t("cw") + (filter.cw === "all" ? "" : ": " + filter.cw));
  if (filter.acc) parts.push(t("accessories") + (filter.acc === "all" ? "" : ": " + t(filter.acc)));
  if (filter.best) parts.push(t("bestSellers"));
  if (filter.brand) parts.push(t("brand") + ": " + filter.brand);
  if (filter.sub) parts.push(dyn((C.bestSellerCategories || [])[filter.sub - 1] || "", "bestcat" + (filter.sub - 1)));
  if (filter.collection) parts.push(t("colLabel") + ": " + filter.collection);
  if (filter.q) parts.push(t("search") + ": “" + filter.q + "”");
  $("colTitle").textContent = filter.her ? t("forHer") : filter.cw ? t("cw") : filter.acc ? (filter.acc === "all" ? t("accessories") : t(filter.acc)) : filter.best ? t("bestSellers") : filter.collection || filter.brand || t("collection");
  $("navHer").classList.toggle("on", filter.her);
  $("navAcc").classList.toggle("on", !!filter.acc);
  $("navCw").classList.toggle("on", !!filter.cw);
  $("showing").hidden = parts.length === 0;
  $("showingText").textContent = parts.join(" · ") + " (" + list.length + ")";
  $("navBest").classList.toggle("on", filter.best);
  $("navBrands").classList.toggle("on", !!filter.brand && !filter.best);
  renderGrid(list);
  if (scroll) $("collection").scrollIntoView();
}

function renderGrid(list) {
  const empty = $("empty");
  empty.hidden = list.length > 0;
  if (!list.length) {
    const fix = filter.q ? correction(filter.q) : null;
    empty.innerHTML = filter.q
      ? `${esc(t("noResFor"))} “${esc(filter.q)}”.` + (fix ? ` ${esc(t("didYou"))} <button type="button" class="linklike" id="fixBtn">${esc(fix)}</button>?` : "")
      : esc(t("noMatch"));
    const fb = $("fixBtn");
    if (fb) fb.onclick = () => { $("q").value = fix; filter.q = fix; saveRecent(fix); apply(false); };
  }
  $("grid").innerHTML = list.map(cardHtml).join("");
}

// ---------- Size, wrist fit and materials (drawn from the numbers in the product data) ----------
function sizeSvg(z) {
  const D = Number(z.diameter) || 0; if (!D) return "";
  // Only measured numbers get a label below; when one is missing the shape is a rough estimate and carries no number.
  const Lug = Number(z.lugToLug) || D * 1.18, T = Number(z.thickness) || D * 0.28, W = Number(z.lugWidth) || D * 0.5;
  const k = 150 / Math.max(D, Lug), cx = 112, cy = 118;
  const r = D * k / 2, half = Lug * k / 2, sw = W * k, tw = T * k;
  const hand = (deg, len) => `<line x1="${cx}" y1="${cy}" x2="${(cx + len * Math.sin(deg * Math.PI / 180)).toFixed(1)}" y2="${(cy - len * Math.cos(deg * Math.PI / 180)).toFixed(1)}" class="hand"/>`;
  const dim = (x1, y1, x2, y2, label, rot) => `<g class="dim"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>` +
    (rot ? `<line x1="${x1 - 4}" y1="${y1}" x2="${x1 + 4}" y2="${y1}"/><line x1="${x2 - 4}" y1="${y2}" x2="${x2 + 4}" y2="${y2}"/>`
         : `<line x1="${x1}" y1="${y1 - 4}" x2="${x1}" y2="${y1 + 4}"/><line x1="${x2}" y1="${y2 - 4}" x2="${x2}" y2="${y2 + 4}"/>`) +
    `<text x="${rot ? x1 + 9 : (x1 + x2) / 2}" y="${rot ? (y1 + y2) / 2 + 4 : y1 + 16}" text-anchor="${rot ? "start" : "middle"}">${label}</text></g>`;
  return `<svg class="sizefig" viewBox="0 0 280 250" role="img" aria-label="${D} mm">
    <rect x="${cx - sw / 2}" y="${cy - half - 16}" width="${sw}" height="${half - r + 16}" class="strap"/>
    <rect x="${cx - sw / 2}" y="${cy + r}" width="${sw}" height="${half - r + 16}" class="strap"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" class="case"/><circle cx="${cx}" cy="${cy}" r="${r * 0.82}" class="dial"/>
    ${hand(305, r * 0.5)}${hand(60, r * 0.72)}
    ${dim(cx - r, cy + half + 30, cx + r, cy + half + 30, D + " mm", false)}
    ${Number(z.lugToLug) ? dim(cx + r + 34, cy - half, cx + r + 34, cy + half, Number(z.lugToLug) + " mm", true) : ""}
  </svg>`;
}
function wristSvg(w) {
  const a = Number(w.min), b = Number(w.max); if (!a || !b) return "";
  const lo = 12, hi = 22, X = v => 30 + (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo) * 240;
  const ticks = []; for (let v = lo; v <= hi; v += 2) ticks.push(`<line x1="${X(v)}" y1="64" x2="${X(v)}" y2="70"/><text x="${X(v)}" y="86" text-anchor="middle">${v}</text>`);
  return `<svg class="sizefig wristfig" viewBox="0 -12 300 112" role="img" aria-label="${a}-${b} cm">
    <rect x="30" y="52" width="240" height="8" rx="4" class="scale"/>
    <rect x="${X(a)}" y="50" width="${X(b) - X(a)}" height="12" rx="6" class="range"/>
    <g class="ticks">${ticks.join("")}</g>
    <ellipse cx="150" cy="24" rx="38" ry="19" class="wrist"/><ellipse cx="150" cy="24" rx="46" ry="25" class="band"/><rect x="138" y="1" width="24" height="12" rx="4" class="case"/>
  </svg>`;
}
function drawSizeMaterials(p, v) {
  const z = v.size || p.size, w = v.wrist || p.wrist, m = v.materials || p.materials;
  const parts = [];
  if (z && z.diameter) parts.push(sizeSvg(z) + `<ul class="legend">` + [["szDiameter", z.diameter], ["szLug", z.lugToLug], ["szThick", z.thickness], ["szLugW", z.lugWidth]].filter(x => x[1]).map(([kk, n]) => `<li><span>${esc(t(kk))}</span> <b>${n} mm</b></li>`).join("") + `</ul>`);
  if (w && w.min && w.max) parts.push(wristSvg(w) + `<p class="wfit">${esc(t("wristFit").replace("{a}", w.min).replace("{b}", w.max))}</p>`);
  $("accSize").hidden = !parts.length;
  $("sizeBody").innerHTML = parts.join("");
  const rows = m ? Object.entries(m) : [];
  const sg = p.strapGuide && (C.strapGuides || {})[p.strapGuide];            // optional strap size chart
  $("accStrap").hidden = !sg;
  if (sg) {
    $("strapTitle").textContent = dyn(sg.title);
    $("strapBody").innerHTML = `<p class="wfit">${esc(dyn(sg.note))}</p><div class="tblwrap"><table class="strapchart"><thead><tr>${sg.cols.map(x => `<th>${esc(dyn(x))}</th>`).join("")}</tr></thead><tbody>${sg.rows.map(r => `<tr>${r.map((x, i) => i < 2 ? `<td>${esc(x)}</td>` : `<td><span class="chip">${esc(x)}</span></td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    $("strapBody").querySelectorAll("tbody tr").forEach(tr => tr.onclick = () => { const on = tr.classList.contains("on"); $("strapBody").querySelectorAll("tr.on").forEach(x => x.classList.remove("on")); if (!on) tr.classList.add("on"); });   // tap a row to highlight your size
  }
  $("accMat").hidden = !rows.length;
  $("matList").innerHTML = rows.map(([kk, vv]) => `<div><dt>${esc(dyn(kk))}</dt><dd>${esc(dyn(vv))}</dd></div>`).join("");
}

const WA_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.200Zm4.500-6.100c-.2-.1-1.500-.7-1.700-.8-.2-.1-.4-.1-.6.100l-.8 1c-.1.200-.3.200-.5.100a6.700 6.700 0 0 1-3.300-2.900c-.2-.4.200-.4.700-1.300.1-.2 0-.3 0-.5l-.8-1.800c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.100-.7.300-.2.300-.9.900-.9 2.200s.9 2.500 1 2.700c.1.200 1.800 2.800 4.400 3.900 1.600.7 2.200.7 3 .6.500-.1 1.500-.6 1.700-1.200.2-.6.200-1.100.2-1.200-.1-.1-.3-.2-.5-.3Z"/></svg>';
const productHref = p => `/product/${encodeURIComponent(p.handle)}/${location.search}`;
function cardHtml(p) {
  const sold = !p.variants.some(v => v.available);
  return `<a class="card${sold ? " sold" : ""}" href="${productHref(p)}">
      <div class="thumb">${imgHtml(p)}</div>
      <div class="info"><h3>${esc(p.title)}</h3>
      ${C.showPrices === false ? "" : `<p class="price">${priceText(p)}</p>`}
      ${sold ? `<span class="tag">${esc(t("sold"))}</span>` : ""}</div></a>`;
}

/* ---------- Product detail ---------- */
function buyLink(p, v) {
  const k = C.contact;
  const what = `${p.title}${p.variants.length > 1 ? " (" + v.title + ")" : ""}${v.sku ? " [" + v.sku + "]" : ""}`;
  if (k.type === "whatsapp" && k.whatsapp)
    return `https://wa.me/${encodeURIComponent(k.whatsapp)}?text=${encodeURIComponent("Hi, I'm interested in: " + what)}`;
  if (k.type === "email" && k.email)
    return `mailto:${k.email}?subject=${encodeURIComponent("Enquiry: " + p.title)}&body=${encodeURIComponent("Hi, I'm interested in: " + what)}`;
  return "#visit";
}

let cur = null;
// Tint the page to match the product (or the chosen option): "theme" on the option wins over the one on the product.
function applyTheme(name) {
  const th = (C.themes || {})[name];
  const b = document.body.style;
  ["bg", "soft", "accent", "deep", "line"].forEach(k => (th ? b.setProperty("--t-" + k, th[k]) : b.removeProperty("--t-" + k)));
}

function drawDetail() {
  const { p } = cur, v = p.variants[cur.i];
  applyTheme(v.theme || p.theme);
  $("dKick").textContent = [p.brand, p.collection].filter(Boolean).join(" · ");
  $("dTitle").textContent = p.title;                       // product names are never translated
  $("dPrice").textContent = C.showPrices === false ? "" : money(v.price);
  $("dPrice").hidden = C.showPrices === false;
  $("dDesc").textContent = dyn(p.description);             // descriptions follow the chosen language
  drawMedia(p);
  const facts = [["condition", v.condition || p.condition], ["warranty", v.warranty || p.warranty], ["included", v.included || p.included]].filter(x => x[1]);
  $("dFacts").hidden = !facts.length;
  $("dFacts").innerHTML = facts.map(([k, v]) => `<div><dt>${esc(t(k))}</dt><dd>${esc(dyn(v))}</dd></div>`).join("");
  $("dMeta").textContent = [p.brand, p.collection, v.sku ? t("sku") + ": " + v.sku : "", C.catalogMode !== false ? (v.available ? "" : t("sold")) : (v.available ? t("avail") : t("sold"))].filter(Boolean).join(" · ");
  drawSizeMaterials(p, v);
  $("accShip").hidden = $("accCare").hidden = C.showShippingCare !== true;
  // No description typed? Build a one-line summary from the numbers instead.
  if (!p.description) {
    const z = v.size || p.size, m = v.materials || p.materials || {};
    const line = [z && z.diameter ? z.diameter + " mm" : "", ...Object.values(m).slice(0, 3).map(x => dyn(x)), v.title && p.variants.length > 1 ? v.title : ""].filter(Boolean).join(" · ");
    $("dDesc").textContent = line;
  }
  const opts = $("dOpts");
  opts.hidden = p.variants.length < 2;
  opts.innerHTML = p.variants.map((x, n) =>
    `<button type="button" data-i="${n}" aria-pressed="${n === cur.i}" ${x.available ? "" : "disabled"}><span>${esc(x.title)}</span>${x.detail ? `<small>${esc(x.detail)}</small>` : ""}</button>`).join("");
  opts.querySelectorAll("button").forEach(b => b.onclick = () => { cur.i = +b.dataset.i; cur.m = 0; drawDetail(); });
  const buy = $("dBuy");
  buy.textContent = dyn(C.contact.buttonLabel, "enquire");
  buy.href = buyLink(p, v);
  if (buy.href.startsWith("https://wa.me/")) buy.insertAdjacentHTML("afterbegin", WA_ICON);
}

// Every product has a page of its own: /product/<handle>/
function openDetail(handle) { location.href = `/product/${encodeURIComponent(handle)}/${location.search}`; }
const onProduct = () => !$("productPage").hidden;


/* ---------- Header behaviour ---------- */
$("navHer").onclick = () => {
  filter.her = !filter.her;
  filter.best = false; filter.acc = ""; filter.cw = ""; filter.sub = 0; filter.brand = filter.collection = "";
  closeMenus();
  apply(true);
};
$("navCw").onclick = e => { e.stopPropagation(); toggleMenu($("navCw"), $("menuCw")); };
$("navAcc").onclick = e => { e.stopPropagation(); toggleMenu($("navAcc"), $("menuAcc")); };
$("navBest").onclick = e => { e.stopPropagation(); toggleMenu($("navBest"), $("menuBest")); };
$("navBrands").onclick = e => { e.stopPropagation(); toggleMenu($("navBrands"), $("menuBrands")); };
$("langBtn").onclick = e => {
  e.stopPropagation();
  const open = $("langMenu").hidden;
  closeMenus();
  $("langMenu").hidden = !open;
  $("langBtn").setAttribute("aria-expanded", String(open));
};
document.addEventListener("click", () => { closeMenus(); closeSugg(); });
document.addEventListener("keydown", e => {
  if (cur && onProduct() && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { const b = $("dImg").querySelector(e.key === "ArrowLeft" ? ".prev" : ".next"); if (b) b.click(); }
  if (e.key === "Escape") { closeMenus(); closeSugg(); } });

const closePanels = () => {
  $("mainNav").classList.remove("open");
  $("burger").setAttribute("aria-expanded", "false");
  $("searchForm").classList.remove("open");
  $("searchToggle").setAttribute("aria-expanded", "false");
};
$("burger").onclick = e => {
  e.stopPropagation();
  const open = !$("mainNav").classList.contains("open");
  closePanels();
  $("mainNav").classList.toggle("open", open);
  $("burger").setAttribute("aria-expanded", String(open));
};
$("searchToggle").onclick = e => {
  e.stopPropagation();
  const open = !$("searchForm").classList.contains("open");
  closePanels();
  closeMenus();
  $("searchForm").classList.toggle("open", open);
  $("searchToggle").setAttribute("aria-expanded", String(open));
  if (open) $("q").focus();
};
$("mainNav").addEventListener("click", e => {
  if (e.target.closest(".drop button:not(.sub-toggle)") || e.target.id === "navHer" || e.target.id === "navJournal") closePanels();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closePanels(); });
$("bar").addEventListener("click", e => e.stopPropagation());
document.addEventListener("click", closePanels);

/* ---------- Search box ---------- */
$("q").addEventListener("focus", () => { closeMenus(); showSugg(); });
$("q").addEventListener("input", e => {
  filter.q = e.target.value.trim();
  apply(false);
  showSugg();
});
$("q").addEventListener("keydown", e => {
  if (e.key === "ArrowDown") { e.preventDefault(); if ($("sugg").hidden) showSugg(); moveSugg(1); }
  else if (e.key === "ArrowUp") { e.preventDefault(); moveSugg(-1); }
  else if (e.key === "Enter" && suggActive >= 0) { e.preventDefault(); chooseSugg(suggActive); }
});
$("searchForm").addEventListener("submit", e => {
  e.preventDefault();
  filter.q = $("q").value.trim();
  saveRecent(filter.q);
  closeSugg();
  closePanels();
  $("q").blur();
  apply(true);
});
$("sugg").addEventListener("mousedown", e => e.preventDefault());
$("sugg").addEventListener("click", e => {
  e.stopPropagation();
  const li = e.target.closest("[role=option]");
  if (li) chooseSugg(+li.dataset.i);
});
$("searchForm").addEventListener("focusout", e => { if (!$("searchForm").contains(e.relatedTarget)) closeSugg(); });

$("clearFilters").onclick = () => {
  filter.best = false; filter.brand = ""; filter.collection = ""; filter.her = false; filter.acc = ""; filter.cw = ""; filter.sub = 0; filter.q = "";
  $("q").value = "";
  apply(false);
};

/* ---------- Journal (shows only once an approved article has been published) ---------- */
let journalItems = [];
function renderJournal() {
  $("navJournal").hidden = !journalItems.length;
  if (!journalItems.length) { $("journal").hidden = true; return; }
  const fmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric" });
  const href = a => `/journal/${a.slug}/${lang === "en" || !(a.tr && a.tr[lang]) ? "" : lang + "/"}`;
  $("jgrid").innerHTML = journalItems.slice(0, 3).map((a, i) => {
    const x = (lang !== "en" && a.tr && a.tr[lang]) || a;
    return `<a class="jcard${i === 0 ? " first" : ""}" href="${esc(href(a))}" hreflang="${esc(lang)}">
      <span class="jtag">${esc(x.tags.join(" · "))}</span>
      <h3>${esc(x.title)}</h3>
      <p>${esc(x.deck)}</p>
      <span class="jmeta">${esc(fmt.format(new Date(a.date)))} · ${a.minutes} ${esc(t("minRead"))}</span></a>`;
  }).join("");
  const more = document.querySelector("#journal .jmore a");
  if (more) more.href = lang === "en" ? "/journal/" : `/journal/${lang}/`;
  $("journal").hidden = false;
}
fetch("/journal/index.json").then(r => (r.ok ? r.json() : [])).then(d => { journalItems = Array.isArray(d) ? d : []; renderJournal(); drawExplore(); }).catch(() => {});

/* ---------- World delivery map ---------- */
function setMapText() {
  const m = C.map;
  if (!m) return;
  $("mapTitle").textContent = dyn(m.title, "delivery");
  $("mapCap").textContent = dyn(m.caption, "mapCap");
}

function worldMap() {
  const m = C.map, W = window.WORLD;
  if (!m || !W) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const my = lat => { const p = lat * Math.PI / 180; return 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * p)) * 180 / Math.PI; };
  const Y0 = my(W.latTop);
  const proj = (lon, lat) => {
    // Americas sit on the far side of the Pacific: shift them east so lines cross the ocean.
    const lo = lon < -28 ? lon + 360 : lon;
    return [(lo - W.lon0) * W.s, (Y0 - my(lat)) * W.s];
  };
  const [hx, hy] = proj(m.hub.lon, m.hub.lat);

  let routes = "", dots = "", labels = "", comets = "", lead = "";
  const trips = [];
  const pts = [];
  // Every dot leaves Hong Kong at the same moment and moves at the same speed, so farther cities take longer to reach.
  const maxDist = Math.max(...m.cities.map(c => { const [x, y] = proj(c.lon, c.lat); return Math.hypot(x - hx, y - hy); }));
  const LONGEST = 7, PAUSE = 1.5, CYCLE = LONGEST + PAUSE;   // seconds: slowest trip, rest before the next wave
  m.cities.forEach((c, i) => {
    const [x, y] = proj(c.lon, c.lat);
    pts.push({ c, x, y });
    const dist = Math.hypot(x - hx, y - hy);
    const cx = (hx + x) / 2, cy = (hy + y) / 2 - dist * 0.24;
    const d = `M${hx.toFixed(1)} ${hy.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    const delay = "0";   // every line starts at the same moment
    routes += `<path class="route" pathLength="1" d="${d}" style="--d:${delay}s"/>`;
    trips.push({ x, y, cx, cy, dist });
    dots += `<circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8" style="--d:${delay}s"/>`;
  });

  // Put every city name in a free spot: try several positions around the dot and keep the first that
  // doesn't cover another name, another dot or the Hong Kong label.
  const FS = 26, CW = FS * 0.7, LH = FS * 1.3;     // generous text size estimate so names never touch
  const hubBox = { x: hx - 176, y: hy + 90, w: 255, h: 62 };
  const hits = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const dotBoxes = pts.map(p => ({ x: p.x - 11, y: p.y - 11, w: 22, h: 22 }));
  const placed = [];
  [...pts.keys()].sort((a, b) => (pts[b].c.big ? 1 : 0) - (pts[a].c.big ? 1 : 0)).forEach(k => {
    const { c, x, y } = pts[k];
    const w = c.n.length * CW;
    const near = [
      [16, 10, "start"], [16, -6, "start"], [-16, 10, "end"], [-16, -6, "end"],
      [0, 40, "middle"], [0, -22, "middle"], [16, 34, "start"], [-16, 34, "end"], [16, -28, "start"], [-16, -28, "end"]
    ];
    // Farther spots, joined to the dot by a thin line, for crowded places like Europe.
    const far = [
      [30, 62, "start"], [-30, 62, "end"], [30, -48, "start"], [-30, -48, "end"],
      [0, 92, "middle"], [0, -76, "middle"], [46, 96, "start"], [-46, 96, "end"], [46, -86, "start"], [-46, -86, "end"],
      [70, 30, "start"], [-70, 30, "end"], [70, -20, "start"], [-70, -20, "end"],
      [96, 74, "start"], [-96, 74, "end"], [96, -64, "start"], [-96, -64, "end"], [0, 128, "middle"], [0, -110, "middle"]
    ];
    let best = null;
    [...near, ...far].forEach(([dx, dy, anchor], si) => {
      if (best && !best.bad) return;
      const bx = anchor === "start" ? x + dx : anchor === "end" ? x + dx - w : x - w / 2;
      const by = y + dy - FS * 0.85;
      const box = { x: bx, y: by, w, h: LH };
      let bad = si >= near.length ? 0.5 : 0;           // prefer a name right beside its dot
      if (bx < 4 || bx + w > W.w - 4 || by < 4 || by + LH > W.h - 4) bad += 3;
      if (hits(box, hubBox)) bad += 3;
      placed.forEach(p => { if (hits(box, p)) bad += 2; });
      dotBoxes.forEach((d, j) => { if (j !== k && hits(box, d)) bad += 1; });
      if (!best || bad < best.bad) best = { bad, box, dx, dy, anchor, far: si >= near.length };
    });
    placed.push(best.box);
    const tx = x + best.dx, ty = y + best.dy;
    if (best.far) {
      const ax = best.anchor === "start" ? tx - 4 : best.anchor === "end" ? tx + 4 : tx;
      const ay = best.dy > 0 ? ty - FS * 0.95 : ty + 6;
      lead += `<line class="lead" x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}"/>`;
    }
    labels += `<text class="lbl${c.big ? " big" : ""}" x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${best.anchor}">${esc(c.n)}</text>`;
  });

  const svg = $("worldMap");
  svg.setAttribute("viewBox", `0 0 ${W.w} ${W.h}`);
  svg.setAttribute("aria-label", `World map with delivery routes from ${m.hub.name}`);
  svg.innerHTML = `<path class="land" d="${W.land}"/>${routes}${lead}${dots}${labels}
    <circle class="hub" cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="13"/>
    <g class="hublbl" transform="translate(${(hx - 176).toFixed(1)} ${(hy + 90).toFixed(1)})">
      <rect width="255" height="62" rx="13"/><text x="127" y="42" text-anchor="middle">${esc(m.hub.name.toUpperCase())}</text></g>`;
  setMapText();
  $("delivery").hidden = false;

  const sc = $("mapScroll");
  const center = () => { sc.scrollLeft = sc.scrollWidth > sc.clientWidth + 2 ? Math.max(0, (hx / W.w) * sc.scrollWidth - sc.clientWidth * 0.45) : 0; };
  center();
  addEventListener("resize", center);

  // The travelling dots are drawn on a canvas laid over the map, so the big map drawing is never repainted while they move.
  const cv = document.createElement("canvas");
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:absolute;left:0;top:0;pointer-events:none";
  sc.style.position = "relative";
  sc.appendChild(cv);
  const ctx = cv.getContext("2d");
  let k = 1, dpr = 1;
  const fit = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const w = svg.clientWidth, h = svg.clientHeight;
    cv.style.width = w + "px"; cv.style.height = h + "px";
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    k = (w / W.w) * dpr;
  };
  fit();
  addEventListener("resize", fit);
  const at = (t, u) => { const v = 1 - u; return [v * v * hx + 2 * v * u * t.cx + u * u * t.x, v * v * hy + 2 * v * u * t.cy + u * u * t.y]; };
  let t0 = 0, raf = 0, visible = false;
  const frame = now => {
    raf = 0;
    if (!visible || document.hidden) return;
    const el = (now - t0) / 1000 - 2;                      // dots leave 2 s after the lines start drawing
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (el > 0) {
      const phase = el % CYCLE;
      trips.forEach(t => {
        const dur = Math.max(1, LONGEST * t.dist / maxDist);   // same speed everywhere, so far cities take longer
        if (phase >= dur) return;
        const u = phase / dur, fade = Math.min(1, phase / 0.3, (dur - phase) / 0.3);
        for (let j = 5; j >= 0; j--) {                          // short fading tail, then the head
          const uu = Math.max(0, u - j * 0.012 * (LONGEST / dur));
          const [px, py] = at(t, uu);
          const a = fade * (j === 0 ? 1 : 0.32 * (1 - j / 6));
          ctx.globalAlpha = a;
          ctx.fillStyle = "#fff";
          ctx.beginPath(); ctx.arc(px * k, py * k, (j === 0 ? 9 : 7) * k, 0, 6.2832); ctx.fill();
          ctx.fillStyle = "#b8923a";
          ctx.beginPath(); ctx.arc(px * k, py * k, (j === 0 ? 6.5 : 5) * k, 0, 6.2832); ctx.fill();
        }
      });
      const pu = (el % 2.6) / 2.6;                              // soft ring from Hong Kong
      ctx.globalAlpha = 0.9 * (1 - pu);
      ctx.strokeStyle = "#b8923a"; ctx.lineWidth = 4 * k;
      ctx.beginPath(); ctx.arc(hx * k, hy * k, (15 + 48 * pu) * k, 0, 6.2832); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    raf = requestAnimationFrame(frame);
  };
  const run = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
  document.addEventListener("visibilitychange", run);

  const play = () => { svg.classList.add("play"); t0 = performance.now(); };
  if (reduce || !("IntersectionObserver" in window)) { play(); return; }
  let started = false;
  new IntersectionObserver(es => {
    visible = es.some(e => e.isIntersecting);
    if (visible && !started) { started = true; play(); }
    run();
  }, { threshold: 0.25 }).observe(svg);
}

/* ---------- Product carousels (3D coverflow, one row per brand) ---------- */
const cf = { stops: [], starts: [], places: [] };
addEventListener("resize", () => cf.places.forEach(f => f()));
document.addEventListener("visibilitychange", () => (document.hidden ? cf.stops : cf.starts).forEach(f => f()));

function coverflows() {
  cf.stops.forEach(f => f());
  cf.stops = []; cf.starts = []; cf.places = [];
  const cfg = C.carousels;
  const box = $("carousels");
  box.innerHTML = "";
  if (!cfg || !cfg.brands) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  cfg.brands.slice(0, 3).forEach((brand, row) => {
    const items = products.filter(p => p.brand === brand);
    if (!items.length) return;
    const sec = document.createElement("section");
    sec.className = "row";
    sec.setAttribute("aria-roledescription", "carousel");
    sec.setAttribute("aria-label", brand);
    sec.innerHTML = `<h2>${esc(brand)}</h2>
      <div class="flow">${items.map((p, i) =>
        `<button type="button" class="flow-item" data-i="${i}" aria-label="${esc(p.title)}">${imgHtml(p)}</button>`).join("")}</div>
      <div class="flow-cap">
        <button type="button" class="arrow" aria-label="${esc(t("prev"))}">←</button>
        <div class="name"><b></b><button type="button" class="view">${esc(t("view"))}</button></div>
        <button type="button" class="arrow" aria-label="${esc(t("next"))}">→</button>
      </div>`;
    box.appendChild(sec);

    const els = [...sec.querySelectorAll(".flow-item")];
    const n = els.length;
    let at = 0, timer = null;

    const place = () => {
      const step = innerWidth < 600 ? 56 : 62;
      els.forEach((el, i) => {
        let off = i - at;
        if (off > n / 2) off -= n;
        if (off < -n / 2) off += n;
        const a = Math.abs(off);
        el.classList.toggle("c", off === 0);
        el.tabIndex = off === 0 ? 0 : -1;
        if (a > 2) { el.style.opacity = "0"; el.style.pointerEvents = "none"; el.style.transform = `translateX(${Math.sign(off) * step * 3}%) scale(.6)`; return; }
        el.style.opacity = "1"; el.style.pointerEvents = "auto";
        el.style.zIndex = String(10 - a);
        el.style.transform = reduce
          ? `translateX(${off * step * 1.1}%) scale(${1 - a * .12})`
          : `translateX(${off * step}%) translateZ(${-a * 90}px) rotateY(${-off * 34}deg) scale(${1 - a * .1})`;
      });
      sec.querySelector(".name b").textContent = items[at].title;
    };
    const go = d => { at = (at + d + n) % n; place(); };
    const stop = () => { clearInterval(timer); timer = null; };
    const start = () => { stop(); if (!reduce && n > 1) timer = setInterval(() => go(1), (cfg.seconds || 4) * 1000 + row * 700); };
    cf.stops.push(stop); cf.starts.push(start); cf.places.push(place);

    els.forEach((el, i) => el.onclick = () => {
      if (i === at) openDetail(items[i].handle); else { at = i; place(); start(); }
    });
    sec.querySelector(".view").onclick = () => openDetail(items[at].handle);
    const [prev, next] = sec.querySelectorAll(".arrow");
    prev.onclick = () => { go(-1); start(); };
    next.onclick = () => { go(1); start(); };
    sec.addEventListener("mouseenter", stop);
    sec.addEventListener("mouseleave", start);
    sec.addEventListener("focusin", stop);
    sec.addEventListener("focusout", start);
    let x0 = null;
    const flow = sec.querySelector(".flow");
    flow.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; stop(); }, { passive: true });
    flow.addEventListener("touchend", e => {
      if (x0 !== null) { const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); }
      x0 = null; start();
    });
    if (n < 2) sec.querySelectorAll(".arrow").forEach(b => b.hidden = true);
    place();
    start();
  });
}

/* ---------- Start ---------- */
loadTr();
applyStatic();
fillText();
heroMedia();
worldMap();
buildLangMenu();
buildFootLang();
if (new URLSearchParams(location.search).get("data") === "test") { const m = document.createElement("meta"); m.name = "robots"; m.content = "noindex,nofollow"; document.head.appendChild(m); }   // private test view: kept out of search engines
fetch(new URLSearchParams(location.search).get("data") === "test" ? "/private/products-test.json" : "products.json")   // the private view reads from /private/, which sits behind a login
  .then(r => r.json())
  .then(d => { products = d; indexProducts(); buildMenus(); route(); })
  .catch(() => { $("grid").innerHTML = new URLSearchParams(location.search).get("data") === "test" ? '<p>The private view needs a sign-in. <a href="/private/">Sign in here</a>, then come back.</p>' : "<p>Couldn't load the collection. Please refresh.</p>"; });


/* ---------- Enquiry location (only with the visitor's consent) ---------- */
// When someone taps an enquiry link (WhatsApp or email) we ask once whether we may record the country and city.
// "yes" -> the server stores country, city and the product (never the IP address, name or message). "no" -> nothing is recorded.
document.querySelectorAll("[data-legal]").forEach(x => { x.hidden = !(C.legalPages && C.legalPages[x.dataset.legal]); });
const getLoc = () => { try { return localStorage.getItem("fs.loc"); } catch { return null; } };
const setLoc = v => { try { localStorage.setItem("fs.loc", v); } catch {} };
function reportEnquiry(source) {
  if (getLoc() !== "yes") return;
  const product = cur && onProduct() ? cur.p.handle : "";
  try {
      fetch("https://fauxswiss-api.cheekhin.workers.dev", { method: "POST", headers: { "content-type": "application/json" }, keepalive: true,
      body: JSON.stringify({ consent: true, product, source: product ? "product" : source, lang }) }).catch(() => {});
  } catch {}
}
document.addEventListener("click", e => {
  if (!(C.legalPages && C.legalPages.privacy)) return;      // the pop-up needs the privacy notice to be online
  const a = e.target.closest && e.target.closest('a[href^="https://wa.me/"], a[href^="mailto:"]');
  if (!a || a.closest("#consent")) return;
  const source = a.closest("footer, #visit") ? "footer" : a.closest("header") ? "header" : "product";
  const go = () => { reportEnquiry(source); };
  if (getLoc()) { go(); return; }                         // already answered: carry on as normal
  e.preventDefault();
  const href = a.href, box = $("consent");
  const done = v => { setLoc(v); box.close(); go(); location.href = href; };
  $("cYes").onclick = () => done("yes");
  $("cNo").onclick = () => done("no");
  box.showModal();
}, true);


/* ---------- Product page (its own address) ---------- */
function route() {
  const m = location.pathname.match(/^\/product\/([^/]+)\/?$/);
  if (m) { showProductPage(decodeURIComponent(m[1])); return; }
  apply(false);
  coverflows();
  let go = null;
  try { go = JSON.parse(sessionStorage.getItem("fs.go") || "null"); sessionStorage.removeItem("fs.go"); } catch {}
  if (go) { Object.assign(filter, go); $("q").value = filter.q || ""; apply(true); }
}

function setMeta(sel, attr, val) {
  let el = document.head.querySelector(sel);
  if (!el) { el = document.createElement(sel.startsWith("link") ? "link" : "meta"); const [k, v] = sel.replace(/^[a-z]+\[|\]$/g, "").split("="); el.setAttribute(k, v.replace(/"/g, "")); document.head.appendChild(el); }
  el.setAttribute(attr, val);
}

// "Go deeper": invitations on a product page that lead into the Journal. Product field: "explore": [{ "slug": "article-slug", "ask": "built" | "works" | "wind" }]
function drawExplore() {
  if (!cur || !onProduct()) return;
  const asks = { built: "askBuilt", works: "askWorks", wind: "askWind" };
  const cards = (Array.isArray(cur.p.explore) ? cur.p.explore : []).map(x => {
    const a = journalItems.find(j => j.slug === x.slug);
    if (!a) return "";                                           // only articles that are published
    const tr = lang !== "en" && a.tr && a.tr[lang];
    const href = `/journal/${a.slug}/${tr ? lang + "/" : ""}`;
    return `<a class="xcard" href="${esc(href)}" hreflang="${esc(lang)}"><span class="xask">${esc(t(asks[x.ask] || "askBuilt"))}</span>
      <span class="xart">${esc((tr || a).title)}</span><span class="xgo">${esc(t("readJournal"))} ›</span></a>`;
  }).filter(Boolean);
  $("pExplore").hidden = !cards.length;
  $("xGrid").innerHTML = cards.join("");
}

function showProductPage(handle) {
  document.body.classList.add("pdp-view");
  $("productPage").hidden = false;
  const p = products.find(x => x.handle === handle);
  if (!p) {
    $("productPage").innerHTML = `<p class="empty" style="padding:60px 0">${esc(t("noMatch"))} <a href="/${location.search}" class="linklike">${esc(t("home"))}</a></p>`;
    return;
  }
  cur = { p, m: 0, i: Math.max(0, p.variants.findIndex(v => v.available)) };
  drawDetail();
  document.title = `${p.title} | ${C.brand}`;
  // breadcrumbs: Home > Accessories/brand > collection > product
  const crumb = (href, text) => `<li>${href ? `<a href="${href}">${esc(text)}</a>` : `<span aria-current="page">${esc(text)}</span>`}</li>`;
  $("pCrumbs").innerHTML = crumb("/" + location.search, t("home")) + (p.collection ? crumb("/" + location.search + "#collection", p.collection) : "") + crumb("", p.title);
  $("pBack").href = "/" + location.search + "#collection";
  // previous / next within the same collection (or the whole range if the collection is alone)
  let group = products.filter(x => x.collection === p.collection && x.category === p.category);
  if (group.length < 2) group = products;
  const at = group.findIndex(x => x.handle === p.handle);
  const prev = group[(at - 1 + group.length) % group.length], next = group[(at + 1) % group.length];
  $("pPrev").href = productHref(prev); $("pNext").href = productHref(next);
  $("pPrev").hidden = $("pNext").hidden = group.length < 2;
  // "You may also like": hand-picked items first (product field "related": ["handle", ...]), then the same collection,
  // then the same brand, then anything else, up to 8, so customers keep browsing the same family.
  const picked = (Array.isArray(p.related) ? p.related : []).map(h => products.find(x => x.handle === h)).filter(Boolean);
  const rest = products.filter(x => x.handle !== p.handle && !picked.includes(x));
  const rank = x => (x.collection === p.collection && x.category === p.category ? 0 : x.brand === p.brand ? 1 : 2);
  const more = [...picked, ...rest.map((x, i) => [x, rank(x), i]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(a => a[0])].slice(0, 8);
  $("pRelated").hidden = !more.length;
  $("pGrid").innerHTML = more.map(cardHtml).join("");
  drawExplore();
  window.scrollTo(0, 0);
}
