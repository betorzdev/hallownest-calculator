#!/usr/bin/env node
/* tools/pages.js — the site's pages: one per search intent, in each language (design/12-seo.md).
   Search engines ignore the hash, so #view=map is the same page to them as the root: to be
   found for "hollow knight map" the map needs an address of its own, and the site can't use
   the History API for it (it has to work over file://). So each page is index.html again, with
   its own <head> (title, description, canonical, hreflang, Open Graph, JSON-LD), the screen it
   opens on (<html data-view>, which app.js reads), and its own About block under the screens:
   the text a search engine reads, in the page's language. <base href> points every relative
   path (css/, js/, assets/, including the ones app.js writes) at the site's root.

   index.html is the source and is edited by hand, except what this writes in it too: its <head>
   fields, the regions between <!-- about --> / <!-- /about --> and <!-- page-ld --> /
   <!-- /page-ld -->, and the ?v= on each script and stylesheet (stamp()). Every other page
   is generated, never edited by hand; so are sitemap.xml and the two files that say where the
   site lives: CNAME (the domain GitHub Pages serves it at) and robots.txt (which a site at its
   domain's root can have; it only points at the sitemap).
   test/pages.test.js fails if any of them falls behind. The texts are tools/pages-text.js's.
   Usage: node tools/pages.js          (npm run pages) */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { BRAND, LABELS, PAGES, OG_ALT } = require('./pages-text.js');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://hallownestcalculator.com/';
const LANGS = ['en', 'es'];

const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const plain = (s) => s.replace(/<[^>]+>/g, '');
/* A page's path from the site's root: '' for the English home, 'es/' for the Spanish one. */
const rel = (page, lang) => (lang === 'es' ? 'es/' : '') + (page.slug[lang] ? page.slug[lang] + '/' : '');
const url = (page, lang) => SITE + rel(page, lang);
const file = (page, lang) => rel(page, lang) + 'index.html';
const fullTitle = (page, lang) => page.title[lang] + ' · ' + BRAND[lang];

/* The About block: the heading with the query, the text, the questions and the other pages. */
function about(page, lang) {
  const faq = page.faq.map((f) => `    <h3>${f.q[lang]}</h3>\n    <p>${f.a[lang]}</p>`).join('\n');
  const more = PAGES.filter((p) => p !== page)
    .map((p) => `      <li><a href="${rel(p, lang) || './'}" data-page="${p.view || ''}">${p.link[lang]}</a></li>`).join('\n');
  // Indented to sit in index.html's .shell, where the region's markers are.
  return `<!-- about -->
<section class="about" id="about" lang="${lang}" aria-labelledby="about-h">
  <h1 id="about-h">${(page.h1 || page.title)[lang]}</h1>
${page.body.map((p) => `  <p>${p[lang]}</p>`).join('\n')}
  <div class="about-faq">
    <h2>${LABELS.faq[lang]}</h2>
${faq}
  </div>
  <nav class="about-more" aria-label="${attr(LABELS.more[lang])}">
    <h2>${LABELS.more[lang]}</h2>
    <ul>
${more}
    </ul>
  </nav>
</section>
<!-- /about -->`.replace(/\n/g, '\n    ');
}

/* The page's own structured data: its questions and, below the home, where it sits. */
function pageLd(page, lang) {
  const blocks = [{
    '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: lang,
    mainEntity: page.faq.map((f) => ({ '@type': 'Question', name: plain(f.q[lang]),
      acceptedAnswer: { '@type': 'Answer', text: plain(f.a[lang]) } })),
  }];
  if (page.view) blocks.push({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: BRAND[lang], item: url(PAGES[0], lang) },
      { '@type': 'ListItem', position: 2, name: page.link[lang], item: url(page, lang) },
    ],
  });
  return `<!-- page-ld -->\n${blocks.map((b) => `<script type="application/ld+json">\n${JSON.stringify(b, null, 2)}\n</script>`).join('\n')}\n<!-- /page-ld -->`;
}

/* index.html turned into one page. Each change has to find its place exactly once: if
   index.html changes shape, this stops instead of writing a page with the wrong head. */
function build(html, page, lang) {
  const depth = rel(page, lang).split('/').length - 1;
  const other = lang === 'en' ? 'es' : 'en';
  const swaps = [
    [/<html lang="[a-z]+"( data-view="[a-z]+")?>/, `<html lang="${lang}"${page.view ? ` data-view="${page.view}"` : ''}>`],
    [/(<meta charset="utf-8">\n)(<base href="[^"]*">\n)?/, (m, meta) => meta + (depth ? `<base href="${'../'.repeat(depth)}">\n` : '')],
    [/<title>[^<]*<\/title>/, `<title>${attr(fullTitle(page, lang))}</title>`],
    [/<meta name="description" content="[^"]*">/, `<meta name="description" content="${attr(page.description[lang])}">`],
    [/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url(page, lang)}">`],
    [/<link rel="alternate" hreflang="en" href="[^"]*">/, `<link rel="alternate" hreflang="en" href="${url(page, 'en')}">`],
    [/<link rel="alternate" hreflang="es" href="[^"]*">/, `<link rel="alternate" hreflang="es" href="${url(page, 'es')}">`],
    [/<link rel="alternate" hreflang="x-default" href="[^"]*">/, `<link rel="alternate" hreflang="x-default" href="${url(page, 'en')}">`],
    [/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${attr(fullTitle(page, lang))}">`],
    [/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${attr(page.description[lang])}">`],
    [/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url(page, lang)}">`],
    [/<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${attr(OG_ALT[lang])}">`],
    [/<meta property="og:locale" content="[a-z_A-Z]+">\n<meta property="og:locale:alternate" content="[a-z_A-Z]+">/,
      `<meta property="og:locale" content="${lang === 'es' ? 'es_ES' : 'en_US'}">\n<meta property="og:locale:alternate" content="${other === 'es' ? 'es_ES' : 'en_US'}">`],
    [/<!-- page-ld -->[\s\S]*?<!-- \/page-ld -->/, pageLd(page, lang)],
    [/<!-- about -->[\s\S]*?<!-- \/about -->/, about(page, lang)],
    [/^(<!DOCTYPE html>\n)(<!-- Generated [^\n]*\n)?/, (m, doctype) => doctype + (page.view || lang !== 'en' ? '<!-- Generated from index.html by tools/pages.js (npm run pages): do not edit by hand. -->\n' : '')],
  ];
  let out = html;
  for (const [re, to] of swaps) {
    const hits = out.match(new RegExp(re.source, 'g'));
    if (!hits || hits.length !== 1) throw new Error(`index.html: expected ${re} once, found ${hits ? hits.length : 0}`);
    out = out.replace(re, typeof to === 'function' ? to : () => to);
  }
  return stamp(out);
}

/* Each script and stylesheet carries its content's version (?v=): GitHub Pages caches every file
   10 minutes on its own, and right after a deploy the browser could mix an old app.js with a new
   app-*.js (the page stayed with its bar and no screen). A file that changes changes its address. */
const version = (rel) => crypto.createHash('sha1').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex').slice(0, 8);
const stamp = (html) => html.replace(/(<script src="|<link rel="stylesheet" href=")((?:js|css)\/[\w.-]+\.(?:js|css))(?:\?v=[0-9a-f]*)?"/g,
  (m, open, rel) => `${open}${rel}?v=${version(rel)}"`);

function sitemap() {
  const alt = (page) => LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${url(page, l)}"/>`)
    .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${url(page, 'en')}"/>`).join('\n');
  const urls = PAGES.flatMap((page) => LANGS.map((l) => `  <url>\n    <loc>${url(page, l)}</loc>\n${alt(page)}\n  </url>`));
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by tools/pages.js (npm run pages): do not edit by hand. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}

/* Nothing is kept from crawlers: the debug and design pages say noindex themselves. */
const robots = () => `# Generated by tools/pages.js (npm run pages): do not edit by hand.
User-agent: *
Allow: /

Sitemap: ${SITE}sitemap.xml
`;

/* Every file this writes, as { file: contents }, from index.html as it is on disk. */
function all(html) {
  const out = {};
  for (const page of PAGES) for (const lang of LANGS) out[file(page, lang)] = build(html, page, lang);
  out['sitemap.xml'] = sitemap();
  out['robots.txt'] = robots();
  out.CNAME = new URL(SITE).hostname + '\n';
  return out;
}

if (require.main === module) {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const [f, text] of Object.entries(all(html))) {
    fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true });
    fs.writeFileSync(path.join(ROOT, f), text);
  }
  console.log(`${PAGES.length * LANGS.length} pages, sitemap.xml, robots.txt and CNAME written`);
}

module.exports = { build, all, sitemap, rel, url, file, fullTitle, SITE, LANGS };
