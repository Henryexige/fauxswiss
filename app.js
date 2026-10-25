const app = document.getElementById("app");
document.getElementById("yr").textContent = new Date().getFullYear();

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = v => new Intl.NumberFormat(undefined, { style: "currency", currency: CONFIG.CURRENCY }).format(Number(v));
const img = (p, cls = "") => p.image ? `<img class="${cls}" src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">` : `<div class="ph"></div>`;

let products = [];

async function load() {
  try {
    const res = await fetch(CONFIG.PRODUCTS_URL || "products.json");
    products = await res.json();
  } catch {
    app.innerHTML = "<p>Couldn't load the collection. Please try again.</p>";
  }
}

function list() {
  app.innerHTML = `<h1>Collection</h1><p class="sub">Available in store.</p>
    <div class="grid">${products.map(p => `
      <a class="card" href="#/p/${encodeURIComponent(p.handle)}">
        ${img(p)}
        <div class="meta"><h3>${esc(p.title)}</h3>
        <span class="price">${money(p.variants[0].price)}</span></div>
      </a>`).join("")}</div>`;
}

function detail(handle) {
  const p = products.find(x => x.handle === handle);
  if (!p) { app.innerHTML = `<p>Product not found. <a class="back" href="#/">Back</a></p>`; return; }
  let i = Math.max(0, p.variants.findIndex(v => v.available));
  const draw = () => {
    const v = p.variants[i];
    app.innerHTML = `<a class="back" href="#/">← Collection</a>
      <div class="detail" style="margin-top:16px">
        <div class="hero">${img(p)}</div>
        <div>
          <h1>${esc(p.title)}</h1>
          <div class="price" style="font-size:22px">${money(v.price)}</div>
          <p>${esc(p.description)}</p>
          ${p.variants.length > 1 ? `<div class="variants">${p.variants.map((x, n) =>
            `<button data-i="${n}" aria-pressed="${n === i}" ${x.available ? "" : "disabled"}>${esc(x.title)}</button>`).join("")}</div>` : ""}
          <div class="sku">SKU: ${esc(v.sku || "—")}</div>
          <div class="stock">${v.available ? "Available" : "Out of stock"}</div>
          <a class="btn" href="${esc(CONFIG.CTA_URL)}">${esc(CONFIG.CTA_LABEL)}</a>
        </div>
      </div>`;
    app.querySelectorAll("[data-i]").forEach(b => b.onclick = () => { i = +b.dataset.i; draw(); });
  };
  draw();
}

function visit() {
  app.innerHTML = `<h1>Visit</h1><p class="sub">${esc(CONFIG.VISIT_TEXT)}</p>`;
}

function route() {
  const [, a, b] = location.hash.split("/");
  if (a === "p" && b) detail(decodeURIComponent(b));
  else if (a === "visit") visit();
  else list();
  window.scrollTo(0, 0);
}

addEventListener("hashchange", route);
load().then(route);
