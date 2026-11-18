# Buksh Landscapes website

Static site for Buksh Landscapes (Edmonton). No framework, no dependencies: plain HTML, CSS and JS, built by a ~150-line Node script and served from `docs/` on GitHub Pages.

## Edit and rebuild

```bash
node build.mjs          # src/ -> docs/
cd docs && python3 -m http.server 8765   # preview at http://localhost:8765
```

- Pages: `src/pages/**/index.html` (front-matter JSON comment at the top sets title, description, hero image)
- Shared shell: `src/layout.html`, partials in `src/partials/` (`{{> quote}}` is the 3-step quote form)
- Styles: `src/assets/css/site.css` · Behaviour + scroll engine: `src/assets/js/site.js`
- Images: `src/assets/img/*-{480,960,1600}.webp`, listed in `images.json` (name, category, alt text). Use `{{img name="patio-sunset" sizes="50vw"}}` in pages; the gallery page is generated from `images.json`.

## Before going live on bukshlandscapes.com

1. **Host on Netlify or Cloudflare Pages, not GitHub Pages.** The build writes `docs/_redirects` (from `redirects.txt`) with 301 redirects for every old WordPress URL that no longer exists. GitHub Pages ignores that file; Netlify and Cloudflare Pages honour it. Publish directory: `docs`. Build command: `SITE_URL=https://bukshlandscapes.com/ INDEXABLE=true node build.mjs`.
2. **URLs are preserved.** All 14 service pages, `/about-us/`, `/contact-us/`, `/gallery/`, `/faq/`, `/reviews/`, `/watering-info/`, `/privacy-policy/`, `/terms-conditions/`, `/blog/` and all 14 blog posts keep their exact old addresses. Everything else from the old sitemaps is in `redirects.txt`.
3. **Tracking.** The production build (`INDEXABLE=true`) adds the existing Google Analytics 4 (`G-EZW6T2ZCXV`), Tag Manager (`GTM-MNJZSM84`) and Search Console verification tag, exactly as the old site loads them. Preview builds leave them out. After launch, submit `https://bukshlandscapes.com/sitemap.xml` in Search Console.
4. **Quote form delivery + photo uploads.** By default the form opens the visitor's email app pre-filled (photos must be attached by hand). Set `FORM_ENDPOINT` at the top of `src/assets/js/site.js` to a form backend that accepts file uploads (e.g. Formspree paid plan, Web3Forms Pro, or FormSubmit) and the request, including up to 5 yard photos, is sent directly.
5. **Google reviews.** Edit `src/data/reviews.json`: set `rating`, `count`, `profileUrl` (the Google Business Profile link) and `writeReviewUrl`, and paste reviews word for word. The homepage, `/reviews/` and the reviews section render them automatically. Until then they link to Google.
6. **Facts to confirm with the owner:** BBB A+ rating, "since 2017", 20+ years combined experience, typical base depths in the patio cross-section.

## Content

- Service pages: `src/data/services.mjs` (one entry per page) rendered by `src/templates/service.mjs`.
- Blog posts: `src/data/posts.json`, ported from the old WordPress blog, rendered by `src/templates/blog.mjs`.
- Gallery categories come from `cat` in `images.json`: patios, turf, walls, builds (complete landscaping), lighting, lawns (sod & planting), commercial.

## Photo credits

Every photo on the site is Buksh's own work (no stock images). The homepage hero is `modern-home-side-lawn`; swap in a stronger project photo when the owner supplies one.

## Motion

Scroll-linked 3D (depth-zoom hero, pinned exploded patio cross-section, curved photo wall, 3D card rise, perspective text) runs from one passive scroll listener + one `requestAnimationFrame`, writing CSS custom properties only for on-screen elements. Rotations are capped at roughly 15° and zoom deltas at roughly 0.2. `prefers-reduced-motion` turns all of it off. On phones the photo wall becomes a native swipe carousel.
