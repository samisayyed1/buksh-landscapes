// Renders one dedicated service page body (still run through build.mjs tokens: {{img}}, {{root}}, partials).
import { services, AREAS } from "../data/services.mjs";

const esc = (s) => String(s).replace(/&(?!amp;|#)/g, "&amp;").replace(/"/g, "&quot;");
const bySlug = Object.fromEntries(services.map((s) => [s.slug, s]));
const areaList = AREAS.map((a) => `<li>${a}</li>`).join("");

export function serviceMeta(s) {
  return { title: s.title, description: s.description, nav: s.group === "commercial" ? "commercial" : "services", hero: s.hero };
}

export function serviceBody(s, images, siteUrl) {
  const groupLabel = s.group === "commercial" ? "Commercial" : "Residential";
  const photos = s.photos.slice(0, 5).map((n, i) => {
    const m = images[n];
    const big = m.widths[m.widths.length - 1];
    return `<li class="sv-ph${i === 0 ? " sv-ph-lead" : ""}"><button class="g-btn" type="button" data-full="{{root}}assets/img/${n}-${big}.webp" data-caption="${esc(m.alt)}" aria-label="Open photo: ${esc(m.alt)}">{{img name="${n}" sizes="${i === 0 ? "(min-width: 900px) 58vw, 100vw" : "(min-width: 900px) 30vw, 50vw"}"}}</button></li>`;
  }).join("\n");
  const steps = s.steps.map(([h, p], i) => `<li class="sv-step"><span class="sv-step-n">${String(i + 1).padStart(2, "0")}</span><h3>${h}</h3><p>${p}</p></li>`).join("\n");
  const faqs = s.faqs.map(([q, a]) => `<details><summary>${q}<svg class="i"><use href="#i-plus"/></svg></summary><div class="ans"><p>${a}</p></div></details>`).join("\n");
  const related = s.related.map((slug) => {
    const r = bySlug[slug];
    return `<a class="svc rise3d" data-tilt href="{{root}}services/${r.slug}/">{{img name="${r.photos[0]}" sizes="(min-width: 700px) 33vw, 100vw"}}<span class="svc-go"><svg class="i"><use href="#i-arrow"/></svg></span><span class="svc-body"><h3>${r.name}</h3><p>${r.card}</p></span></a>`;
  }).join("\n");
  const included = s.included.map((x) => `<li><svg class="i"><use href="#i-check"/></svg><span>${x}</span></li>`).join("");
  const quoteHref = `{{root}}contact-us/?service=${encodeURIComponent(s.quote)}#quote`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Service", name: s.name, serviceType: s.name, description: s.description, provider: { "@id": "https://bukshlandscapes.com/#business" }, areaServed: AREAS.map((a) => ({ "@type": "City", name: a })), url: `${siteUrl}services/${s.slug}/` },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Services", item: `${siteUrl}services/` },
        { "@type": "ListItem", position: 3, name: s.name, item: `${siteUrl}services/${s.slug}/` },
      ] },
      { "@type": "FAQPage", mainEntity: s.faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
    ],
  };

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>
<section class="page-hero sv-hero" data-p="exit">
  <div class="ph-media">{{img name="${s.hero}" sizes="100vw" loading="eager" priority="1"}}</div>
  <div class="wrap">
    <p class="crumbs"><a href="{{root}}">Home</a><span>/</span><a href="{{root}}services/">Services</a><span>/</span><span>${s.short}</span></p>
    <h1 class="h1 sv-h1">${s.h1}</h1>
    <p class="lede">${s.lede}</p>
    <div class="hero-actions"><a class="btn btn-gold btn-lg" href="${quoteHref}">Request a free estimate <svg class="i"><use href="#i-arrow"/></svg></a><a class="btn btn-ghost-light btn-lg" href="tel:{{phone}}"><svg class="i"><use href="#i-phone"/></svg> {{phoneDisplay}}</a></div>
    <p class="hero-note"><span><svg class="i"><use href="#i-check"/></svg>Free on-site estimates</span><span><svg class="i"><use href="#i-check"/></svg>Family owned since 2017</span><span><svg class="i"><use href="#i-check"/></svg>Open 7 days</span></p>
  </div>
</section>

<section class="section sv-intro" aria-labelledby="sv-intro-h">
  <div class="wrap sv-intro-grid">
    <div class="sv-copy reveal" data-e="0">
      <span class="kicker">${s.kicker}</span>
      <h2 class="h2" id="sv-intro-h">${s.introH}</h2>
      ${s.intro.map((p) => `<p>${p}</p>`).join("\n      ")}
    </div>
    <aside class="sv-card reveal" data-e="40" aria-label="What's included">
      <h3 class="sv-card-h">What's included</h3>
      <ul class="sd-list">${included}</ul>
      <p class="sd-fit"><b>Best for</b>${s.bestFor}</p>
      <a class="btn btn-gold sv-card-btn" href="${quoteHref}">Request a free estimate <svg class="i"><use href="#i-arrow"/></svg></a>
    </aside>
  </div>
</section>

<section class="sv-work" aria-labelledby="sv-work-h">
  <div class="wrap">
    <div class="sv-work-head">
      <div><span class="kicker">Our work</span><h2 class="h2" id="sv-work-h">${s.short} by Buksh</h2></div>
      <a class="link-arrow" href="{{root}}gallery/">See the full gallery <svg class="i"><use href="#i-arrow"/></svg></a>
    </div>
    <ul class="sv-photos sv-n${Math.min(s.photos.length, 5)}">
${photos}
    </ul>
  </div>
</section>

<section class="section sv-process on-dark" aria-labelledby="sv-proc-h">
  <div class="wrap">
    <div class="section-head"><span class="kicker">How we build it</span><h2 class="h2" id="sv-proc-h">Done properly, in the right order.</h2></div>
    <ol class="sv-steps">
${steps}
    </ol>
  </div>
</section>

{{> why}}

<section class="section faq" aria-labelledby="sv-faq-h">
  <div class="wrap faq-grid">
    <div class="faq-side">
      <span class="kicker">${s.short} questions</span>
      <h2 class="h2" id="sv-faq-h" style="margin-top:16px">Straight answers.</h2>
      <p class="lede" style="margin-top:16px">Something we didn't cover? Call <a href="tel:{{phone}}">{{phoneDisplay}}</a>, 9 am to 5 pm, 7 days a week.</p>
    </div>
    <div>
${faqs}
    </div>
  </div>
</section>

<section class="sv-areas" aria-labelledby="sv-areas-h">
  <div class="wrap sv-areas-in">
    <h2 class="sv-areas-h" id="sv-areas-h"><svg class="i"><use href="#i-pin"/></svg>${s.short} across the Edmonton region</h2>
    <ul class="sv-area-list">${areaList}<li>and surrounding communities</li></ul>
  </div>
</section>

<section class="section sv-related" aria-labelledby="sv-rel-h">
  <div class="wrap">
    <div class="section-head"><span class="kicker">${groupLabel} services</span><h2 class="h2" id="sv-rel-h">Often built together.</h2></div>
    <div class="svc-grid sv-rel-grid">
${related}
    </div>
  </div>
</section>

<div data-preselect="${esc(s.quote)}" hidden></div>
{{> quote}}`;
}
