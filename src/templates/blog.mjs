// Blog index + post pages, ported from the old WordPress blog at the same URLs (/<slug>/ and /blog/).
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const fmt = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

export function postPage(p, siteUrl) {
  const schema = { "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, description: p.description, datePublished: p.date, author: { "@type": "Organization", name: "Buksh Landscapes" }, publisher: { "@id": "https://bukshlandscapes.com/#business" }, mainEntityOfPage: `${siteUrl}${p.slug}/` };
  return {
    rel: `${p.slug}/index.html`,
    meta: { title: `${p.title} | Buksh Landscapes`, description: p.description, nav: "blog", hero: p.image },
    body: `<script type="application/ld+json">${JSON.stringify(schema)}</script>
<section class="page-hero page-hero-sm post-hero" data-p="exit">
  <div class="ph-media">{{img name="${p.image}" sizes="100vw" loading="eager" priority="1"}}</div>
  <div class="wrap">
    <p class="crumbs"><a href="{{root}}">Home</a><span>/</span><a href="{{root}}blog/">Blog</a></p>
    <h1 class="h1 post-h1">${esc(p.title)}</h1>
    <p class="post-meta"><time datetime="${p.date}">${fmt(p.date)}</time><span>·</span>${Math.max(1, Math.round(p.words / 230))} min read</p>
  </div>
</section>
<article class="section prose-sec">
  <div class="wrap prose">
${p.html}
    <aside class="post-cta">
      <h2>Planning a project in Edmonton?</h2>
      <p>Tell us what you're picturing. We'll come see the yard, measure it and give you a written estimate, free.</p>
      <div class="rev-actions"><a class="btn btn-gold" href="{{root}}contact-us/#quote">Request a free estimate <svg class="i"><use href="#i-arrow"/></svg></a><a class="btn btn-ghost" href="tel:{{phone}}"><svg class="i"><use href="#i-phone"/></svg> {{phoneDisplay}}</a></div>
    </aside>
  </div>
</article>`,
  };
}

export function blogIndex(posts) {
  const cards = posts.map((p, i) => `<a class="post-card reveal" data-e="${(i % 3) * 30}" href="{{root}}${p.slug}/"><span class="post-img">{{img name="${p.image}" sizes="(min-width: 1000px) 33vw, (min-width: 700px) 50vw, 100vw"}}</span><span class="post-body"><time datetime="${p.date}">${fmt(p.date)}</time><b>${esc(p.title)}</b><span class="post-ex">${esc(p.description)}</span></span></a>`).join("\n");
  return {
    rel: "blog/index.html",
    meta: { title: "Landscaping Blog | Edmonton Tips & Guides | Buksh Landscapes", description: "Landscaping advice for Edmonton homeowners and property managers: patios, artificial turf, sod, design, lawn care and commercial snow removal.", nav: "blog", hero: "sod-curve-walk" },
    body: `<section class="page-hero page-hero-sm" data-p="exit">
  <div class="ph-media">{{img name="sod-curve-walk" sizes="100vw" loading="eager" priority="1"}}</div>
  <div class="wrap">
    <p class="crumbs"><a href="{{root}}">Home</a><span>/</span><span>Blog</span></p>
    <h1 class="h1" style="max-width:15ch">Landscaping guides for Edmonton.</h1>
    <p class="lede">Practical advice on patios, turf, sod, design and year-round property care from the Buksh team.</p>
  </div>
</section>
<section class="section"><div class="wrap"><div class="post-grid">
${cards}
</div></div></section>`,
  };
}
