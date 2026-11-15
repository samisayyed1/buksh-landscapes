// Tiny static-site builder: src/pages/**/*.html -> docs/
// Usage: node build.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, cpSync, rmSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { createHash } from "node:crypto";

const SITE = {
  name: "Buksh Landscapes",
  url: (process.env.SITE_URL || "https://samisayyed1.github.io/buksh-landscapes/").replace(/\/?$/, "/"),
  // Keep false while this lives on a preview domain so it never competes with bukshlandscapes.com in search.
  indexable: process.env.INDEXABLE === "true",
  phone: "+17809408283",
  phoneDisplay: "780-940-8283",
  email: "info@bukshlandscapes.com",
};

const SRC = "src", OUT = "docs";
// Content hashes for cache-busting: a changed file gets a new URL, so phones never mix new HTML with stale CSS/JS.
const ver = (f) => createHash("sha1").update(readFileSync(join(SRC, f))).digest("hex").slice(0, 10);
const ASSET_V = { cssV: ver("assets/css/site.css"), jsV: ver("assets/js/site.js") };
const images = JSON.parse(readFileSync("images.json", "utf8"));
const layout = readFileSync(join(SRC, "layout.html"), "utf8");
const partials = Object.fromEntries(
  readdirSync(join(SRC, "partials")).map((f) => [f.replace(".html", ""), readFileSync(join(SRC, "partials", f), "utf8")])
);

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : [];
  });
}

const attr = (s, k) => (s.match(new RegExp(`${k}="([^"]*)"`)) || [])[1];

function img(args, root) {
  const name = attr(args, "name");
  const m = images[name];
  if (!m) throw new Error(`Unknown image: ${name}`);
  const sizes = attr(args, "sizes") || "100vw";
  const cls = attr(args, "class");
  const loading = attr(args, "loading") || "lazy";
  const alt = attr(args, "alt") ?? m.alt;
  const prio = attr(args, "priority") ? ' fetchpriority="high"' : "";
  const extra = attr(args, "extra") || "";
  const srcset = m.widths.map((w) => `${root}assets/img/${name}-${w}.webp ${w}w`).join(", ");
  const mid = m.widths[Math.min(1, m.widths.length - 1)];
  return `<img src="${root}assets/img/${name}-${mid}.webp" srcset="${srcset}" sizes="${sizes}" width="${m.w}" height="${m.h}" alt="${alt.replace(/"/g, "&quot;")}" loading="${loading}" decoding="async"${prio}${cls ? ` class="${cls}"` : ""}${extra ? " " + extra : ""}>`;
}

function render(tpl, vars, root) {
  let out = tpl;
  // partials first (they may contain tokens)
  out = out.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => {
    if (!partials[n]) throw new Error(`Missing partial ${n}`);
    return partials[n];
  });
  out = out.replace(/\{\{img ([^}]*)\}\}/g, (_, a) => img(a, root));
  out = out.replace(/\{\{srcset ([\w-]+)\}\}/g, (_, n) => images[n].widths.map((w) => `${root}assets/img/${n}-${w}.webp ${w}w`).join(", "));
  out = out.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));
  return out;
}

function galleryItems(root) {
  const labels = { turf: "Turf &amp; putting greens", patios: "Patios &amp; stone", lawns: "Lawns &amp; planting", builds: "Full yard builds", lighting: "Lighting", water: "Water features", commercial: "Commercial &amp; snow" };
  return Object.entries(images)
    .filter(([, m]) => m.cat !== "none")
    .map(([n, m]) => {
      const big = m.widths[m.widths.length - 1];
      return `<li class="g-item" data-cat="${m.cat}"><button class="g-btn" type="button" data-full="${root}assets/img/${n}-${big}.webp" data-caption="${m.alt.replace(/"/g, "&quot;")}" aria-label="Open photo: ${m.alt.replace(/"/g, "&quot;")}">${img(`name="${n}" sizes="(min-width: 1100px) 25vw, (min-width: 700px) 33vw, 50vw"`, root)}<span class="g-tag">${labels[m.cat]}</span></button></li>`;
    })
    .join("\n");
}

if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(SRC, "assets"), join(OUT, "assets"), { recursive: true });
cpSync(join(SRC, "assets", "favicon-32.png"), join(OUT, "favicon.ico"));
writeFileSync(join(OUT, ".nojekyll"), "");

const pages = walk(join(SRC, "pages"));
const sitemap = [];
for (const file of pages) {
  const raw = readFileSync(file, "utf8");
  const fm = raw.match(/^<!--\s*(\{[\s\S]*?\})\s*-->/);
  const meta = fm ? JSON.parse(fm[1]) : {};
  const body = fm ? raw.slice(fm[0].length) : raw;
  const rel = relative(join(SRC, "pages"), file); // e.g. services/landscaping-services/index.html
  const depth = rel.split(/[\\/]/).length - 1;
  const root = meta.absRoot ? new URL(SITE.url).pathname : depth ? "../".repeat(depth) : "./";
  const pathUrl = rel.replace(/index\.html$/, "");
  const vars = {
    ...SITE,
    ...ASSET_V,
    root,
    title: meta.title || SITE.name,
    description: meta.description || "",
    canonical: SITE.url + pathUrl,
    ogImage: SITE.url + "assets/og-image.jpg",
    robots: SITE.indexable ? "index,follow" : "noindex,follow",
    bodyClass: meta.bodyClass || "",
    nav: meta.nav || "",
    year: String(new Date().getFullYear()),
    gallery: galleryItems(root),
    photoCount: String(Object.values(images).filter((m) => m.cat !== "none").length),
    preload: meta.hero
      ? (meta.heroMobile
          ? `<link rel="preload" as="image" media="(max-width: 699px)" imagesrcset="${images[meta.heroMobile].widths.map((w) => `${root}assets/img/${meta.heroMobile}-${w}.webp ${w}w`).join(", ")}" imagesizes="100vw" fetchpriority="high">\n<link rel="preload" as="image" media="(min-width: 700px)" imagesrcset="${images[meta.hero].widths.map((w) => `${root}assets/img/${meta.hero}-${w}.webp ${w}w`).join(", ")}" imagesizes="100vw" fetchpriority="high">`
          : `<link rel="preload" as="image" imagesrcset="${images[meta.hero].widths.map((w) => `${root}assets/img/${meta.hero}-${w}.webp ${w}w`).join(", ")}" imagesizes="100vw" fetchpriority="high">`)
      : "",
    schema: meta.schema === false ? "" : "",
  };
  vars.content = render(body, vars, root);
  let html = render(layout, vars, root);
  html = html.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));
  // mark active nav
  if (meta.nav) html = html.replace(new RegExp(`data-nav="${meta.nav}"`, "g"), `data-nav="${meta.nav}" aria-current="page"`);
  const outFile = join(OUT, rel);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, html);
  if (!rel.startsWith("404")) sitemap.push(SITE.url + pathUrl);
  const left = html.match(/\{\{[^}]+\}\}/g);
  if (left) { console.error(`! ${rel}: unresolved tokens ${[...new Set(left)].join(" ")}`); process.exitCode = 1; }
}
writeFileSync(join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}\n</urlset>\n`);
writeFileSync(join(OUT, "robots.txt"), SITE.indexable ? `User-agent: *\nAllow: /\nSitemap: ${SITE.url}sitemap.xml\n` : `User-agent: *\nAllow: /\n`);
console.log(`Built ${pages.length} pages -> ${OUT}/`);
