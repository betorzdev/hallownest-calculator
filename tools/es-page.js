#!/usr/bin/env node
/* tools/es-page.js — es/index.html, the Spanish page.
   Search engines ignore the hash, so the lang=es in it never reaches them: to be found in
   Spanish the site needs a Spanish address. es/index.html is index.html with a Spanish <head>
   (title, description, canonical, Open Graph) and <html lang="es">, which app.js reads as the
   page's language. <base href="../"> makes every relative path (css/, js/, assets/, including
   the ones app.js writes) point at the same files as the English page.
   It's generated, never edited by hand: test/es-page.test.js fails if it falls behind index.html.
   Usage: node tools/es-page.js          (npm run es) */
'use strict';
const fs = require('fs');
const path = require('path');
const I = require('../js/i18n.js');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://betorzdev.github.io/hallownest-calculator/';

/* The Spanish of what only the <head> says. Title and description are the ones app.js puts on
   the tab (docTitle, metaDescription); the preview card's text is written for the context. */
const ES = {
  title: I.UI.docTitle.es,
  description: I.UI.metaDescription.es,
  ogDescription: 'Elige tus amuletos y mira cómo cambia cada estadística del Caballero: daño del aguijón, DPS, hechizos, máscaras y alma. En español y en inglés.',
  ogImageAlt: 'La pantalla de Amuletos: el HUD del Caballero, daño del aguijón 32, DPS 114,3 y la cuadrícula de amuletos',
};

const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/* Each change has to find its line exactly once: if index.html changes shape, this stops. */
function build(html) {
  const swaps = [
    [/<html lang="en">/, '<html lang="es">'],
    [/(<meta charset="utf-8">\n)/, '$1<base href="../">\n'],
    [/<title>[^<]*<\/title>/, `<title>${attr(ES.title)}</title>`],
    [/<meta name="description" content="[^"]*">/, `<meta name="description" content="${attr(ES.description)}">`],
    [/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${SITE}es/">`],
    [/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${attr(ES.title)}">`],
    [/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${attr(ES.ogDescription)}">`],
    [/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${SITE}es/">`],
    [/<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${attr(ES.ogImageAlt)}">`],
    [/<meta property="og:locale" content="en_US">\n<meta property="og:locale:alternate" content="es_ES">/,
      '<meta property="og:locale" content="es_ES">\n<meta property="og:locale:alternate" content="en_US">'],
  ];
  let out = html;
  for (const [re, to] of swaps) {
    const hits = out.match(new RegExp(re.source, 'g'));
    if (!hits || hits.length !== 1) throw new Error(`index.html: expected ${re} once, found ${hits ? hits.length : 0}`);
    out = out.replace(re, to);
  }
  // After the doctype: nothing may come before it.
  return out.replace(/^<!DOCTYPE html>\n/, '$&<!-- Generated from index.html by tools/es-page.js (npm run es): do not edit by hand. -->\n');
}

if (require.main === module) {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  fs.mkdirSync(path.join(ROOT, 'es'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'es', 'index.html'), build(html));
  console.log('es/index.html written');
}

module.exports = { build };
