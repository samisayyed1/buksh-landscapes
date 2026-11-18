// Tiny static-site builder: src/pages/**/*.html -> docs/
// Usage: node build.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, cpSync, rmSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { createHash } from "node:crypto";
import { services } from "./src/data/services.mjs";
import { serviceMeta, serviceBody } from "./src/templates/service.mjs";
import { postPage, blogIndex } from "./src/templates/blog.mjs";

const SITE = {
  // Tracking from the current bukshlandscapes.com (Google Analytics 4 via Tag Manager + Search Console).
  // Only emitted on the production build (INDEXABLE=true) so preview traffic never pollutes the stats.
  gtm: "GTM-MNJZSM84",
  ga4: "G-EZW6T2ZCXV",
  gsc: "3OSe7jrJxmfzRvzdSbmrrGomz0pnyFAuPF5JiS1wJKw",
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

const POSTS = JSON.parse(readFileSync(join(SRC, "data", "posts.json"), "utf8"));
const reviews = JSON.parse(readFileSync(join(SRC, "data", "reviews.json"), "utf8"));
const G_LOGO = `<svg class="g-logo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>`;
const stars = (n) => `<span class="stars" aria-label="${n} out of 5 stars">${[1, 2, 3, 4, 5].map((i) => `<svg class="i${i <= Math.round(n) ? " on" : ""}" aria-hidden="true"><use href="#i-star"/></svg>`).join("")}</span>`;
const escH = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
function reviewsVars() {
  const url = escH(reviews.profileUrl);
  const write = reviews.writeReviewUrl ? escH(reviews.writeReviewUrl) : url;
  const badge = reviews.rating
    ? `<a class="rev-badge" href="${url}" target="_blank" rel="noopener">${G_LOGO}<span><b>${Number(reviews.rating).toFixed(1)}</b>${stars(reviews.rating)}<small>${reviews.count ? `${reviews.count} Google reviews` : "Google reviews"} · Read all</small></span></a>`
    : `<a class="rev-badge" href="${url}" target="_blank" rel="noopener">${G_LOGO}<span><b class="rev-badge-t">Google reviews</b><small>Read what clients say</small></span></a>`;
  const body = reviews.reviews.length
    ? `<ul class="rev-list">${reviews.reviews.map((r, i) => `<li class="rev-card reveal" data-e="${(i % 3) * 30}">${stars(r.rating || 5)}<blockquote><p>${escH(r.text)}</p></blockquote><p class="rev-by"><b>${escH(r.name)}</b>${r.when ? `<span>${escH(r.when)}</span>` : ""}${G_LOGO}</p></li>`).join("")}</ul>
    <div class="rev-actions"><a class="btn btn-dark" href="${url}" target="_blank" rel="noopener">Read all reviews on Google <svg class="i"><use href="#i-arrow"/></svg></a><a class="btn btn-ghost" href="${write}" target="_blank" rel="noopener">Leave a review</a></div>`
    : `<div class="rev-empty">${G_LOGO}<p>Our clients' reviews live on our Google Business Profile. Have a read, and if we've built for you, we'd love to hear how it's holding up.</p><div class="rev-actions"><a class="btn btn-dark" href="${url}" target="_blank" rel="noopener">Read our Google reviews <svg class="i"><use href="#i-arrow"/></svg></a><a class="btn btn-ghost" href="${write}" target="_blank" rel="noopener">Leave a review</a></div></div>`;
  return { reviewsBadge: badge, reviewsBody: body };
}
const REVIEWS = reviewsVars();

function serviceCards(group, root) {
  return services.filter((s) => s.group === group).map((s, i) => `<a class="svc rise3d" data-e="${(i % 3) * 30}" data-tilt href="${root}services/${s.slug}/">${img(`name="${s.photos[0]}" sizes="(min-width: 1000px) 33vw, (min-width: 700px) 50vw, 100vw"`, root)}<span class="svc-go"><svg class="i"><use href="#i-arrow"/></svg></span><span class="svc-body"><h3>${s.name}</h3><p>${s.card}</p></span></a>`).join("\n");
}
function navServices(root) {
  const col = (g) => services.filter((s) => s.group === g).map((s) => `<li><a href="${root}services/${s.slug}/">${s.name}</a></li>`).join("");
  return { navRes: col("residential"), navCom: col("commercial") };
}

function galleryItems(root) {
  const labels = { patios: "Patios &amp; paving", turf: "Artificial turf", walls: "Retaining walls", builds: "Complete landscaping", lighting: "Landscape lighting", lawns: "Sod &amp; planting", commercial: "Commercial &amp; snow" };
  return Object.entries(images)
    .filter(([, m]) => m.cat !== "none")
    .map(([n, m]) => {
      const big = m.widths[m.widths.length - 1];
      return `<li class="g-item" data-cat="${m.cat}"><button class="g-btn" type="button" data-full="${root}assets/img/${n}-${big}.webp" data-caption="${m.alt.replace(/"/g, "&quot;")}" aria-label="Open photo: ${m.alt.replace(/"/g, "&quot;")}">${img(`name="${n}" sizes="(min-width: 1000px) 33vw, (min-width: 600px) 50vw, 100vw"`, root)}<span class="g-tag">${labels[m.cat]}</span></button></li>`;
    })
    .join("\n");
}

if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(SRC, "assets"), join(OUT, "assets"), { recursive: true });
cpSync(join(SRC, "assets", "favicon-32.png"), join(OUT, "favicon.ico"));
writeFileSync(join(OUT, ".nojekyll"), "");

const pages = [
  ...walk(join(SRC, "pages")).map((file) => {
    const raw = readFileSync(file, "utf8");
    const fm = raw.match(/^<!--\s*(\{[\s\S]*?\})\s*-->/);
    return { rel: relative(join(SRC, "pages"), file), meta: fm ? JSON.parse(fm[1]) : {}, body: fm ? raw.slice(fm[0].length) : raw };
  }),
  ...services.map((s) => ({ rel: `services/${s.slug}/index.html`, meta: serviceMeta(s), body: serviceBody(s, images, SITE.url) })),
  ...POSTS.map((p) => postPage(p, SITE.url)),
  blogIndex(POSTS),
];
const sitemap = [];
for (const { rel, meta, body } of pages) {
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
    ...REVIEWS,
    ...navServices(root),
    svcRes: serviceCards("residential", root),
    svcCom: serviceCards("commercial", root),
    tracking: SITE.indexable
      ? `<meta name="google-site-verification" content="${SITE.gsc}">\n<script async src="https://www.googletagmanager.com/gtag/js?id=${SITE.ga4}"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${SITE.ga4}');</script>\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${SITE.gtm}');</script>`
      : "",
    trackingBody: SITE.indexable ? `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${SITE.gtm}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>` : "",
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
// 301 redirects for old bukshlandscapes.com URLs that no longer exist as pages.
// Netlify and Cloudflare Pages read this file; GitHub Pages ignores it (preview only).
cpSync("redirects.txt", join(OUT, "_redirects"));
console.log(`Built ${pages.length} pages -> ${OUT}/`);
