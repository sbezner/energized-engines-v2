#!/usr/bin/env node

/**
 * Build Energized Engines redesigned static site
 * Based on design/redesign/SPEC.md
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'processed-products.json');
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const BASE_PATH = '/energized-engines-v2';
const MANUAL_SOURCES_FILE = path.join(__dirname, '..', 'notes', 'manual-sources.csv');
const DIAGRAM_MAP_FILE = path.join(__dirname, '..', 'notes', 'diagram-map.csv');

console.log('Loading data...');
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// Load manual sources
let manualSources = {};
if (fs.existsSync(MANUAL_SOURCES_FILE)) {
  const manualCsv = fs.readFileSync(MANUAL_SOURCES_FILE, 'utf8');
  manualCsv.split('\n').slice(1).forEach(line => {
    if (!line.trim()) return;
    const match = line.match(/^"([^"]+)","([^"]+)","([^"]+)"/);
    if (match) {
      const [, model, title, url] = match;
      manualSources[model] = { title, url };
    }
  });
}

// Load diagram map
let diagramMap = {};
if (fs.existsSync(DIAGRAM_MAP_FILE)) {
  const diagramCsv = fs.readFileSync(DIAGRAM_MAP_FILE, 'utf8');
  diagramCsv.split('\n').slice(1).forEach(line => {
    if (!line.trim()) return;
    const match = line.match(/^"([^"]+)","([^"]*)","([^"]+)","([^"]+)","([^"]+)","([^"]*)","([^"]*)"/);
    if (match) {
      const [, partNum, model, manualTitle, manualUrl, page, diagramRef, note] = match;
      if (!diagramMap[partNum]) diagramMap[partNum] = [];
      
      let badgeType = 'listed';
      if (note.startsWith('exact:')) badgeType = 'exact';
      else if (note.startsWith('series:')) badgeType = 'series';
      
      diagramMap[partNum].push({ model, manualTitle, manualUrl, page, diagramRef, note, badgeType });
    }
  });
}

// Utility functions
function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€\x9d/g, '"')
    .replace(/â€"/g, '—')
    .replace(/â€"/g, '–')
    .replace(/Â°/g, '°')
    .replace(/Â(?=[\s\u00a0.,])/g, '')
    .replace(/[\x80-\x9f]/g, '')
    .replace(/Â /g, ' ')
    .replace(/Â+/g, ' ')
    .trim();
}

function cleanTitle(title) {
  if (!title) return '';
  // Remove vendor prefix and part number, convert to title case
  let cleaned = title
    .replace(/^(Sumner|EE|Energized Engines)\s+\d+\s+/i, '')
    .replace(/^(Sumner|EE)\s+/i, '');
  
  // Convert ALL CAPS to Title Case
  if (cleaned === cleaned.toUpperCase()) {
    cleaned = cleaned.split(' ').map(word => {
      if (word.length <= 2 || ['OEM', 'RAB', 'EE'].includes(word)) {
        return word;
      }
      return word.charAt(0) + word.slice(1).toLowerCase();
    }).join(' ');
  }
  
  return cleanText(cleaned);
}

function formatPrice(price) {
  if (!price || parseFloat(price) === 0) {
    return null;
  }
  return `$${parseFloat(price).toFixed(2)}`;
}

// SVG icons
const icons = {
  bolt: '<svg viewBox="0 0 10 12"><path d="M6 0 0 7h4l-1 5 7-8H6l1-4z"/></svg>',
  truck: '<svg viewBox="0 0 24 24"><path d="M2 6h12v10H2zM14 9h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
  returns: '<svg viewBox="0 0 24 24"><path d="M4 10h11a5 5 0 0 1 0 10h-3"/><path d="m8 6-4 4 4 4"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 0-2 2A16 16 0 0 1 3 6a2 2 0 0 0 2-2"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  grid: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M6 18L18 6"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',
  cart: '<svg viewBox="0 0 24 24"><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  doc: '<svg viewBox="0 0 24 24"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h8"/></svg>',
  location: '<svg viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>'
};

// Header component
function getHeader(title, activePage = '', bodyClass = '') {
  const cartCount = '<span class="count" style="display:none">0</span>';
  
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>${escapeHtml(title)} | Energized Engines (test)</title>
<link rel="icon" type="image/png" href="${BASE_PATH}/logo.png">
<link rel="stylesheet" href="${BASE_PATH}/tokens.css"><link rel="stylesheet" href="${BASE_PATH}/site.css"><link rel="stylesheet" href="${BASE_PATH}/pages.css">
<script src="${BASE_PATH}/config.js"></script>
</head><body${bodyClass ? ` class="${bodyClass}"` : ''}>
<div class="test-banner d-only">Test site. Nothing here is for sale and no orders are taken. Shop at <a href="https://www.energizedengines.com">energizedengines.com</a></div>
<div class="test-banner m-only" style="justify-content:center">Test site. Order at&nbsp;<a href="https://www.energizedengines.com">energizedengines.com</a></div>
<div class="util d-only"><div class="wrap"><span>${icons.truck}<b>Free ground shipping</b> on orders over $150, Lower 48</span>
<span>${icons.location}Free local delivery within 10 miles of Jersey Village, TX</span><span class="sp"></span>
<span>${icons.phone}Call or text <b>832-444-5426</b></span></div></div>
<header class="hdr"><div class="wrap"><div class="row">
<button class="icon-btn m-only" aria-label="Menu">${icons.menu}</button>
<a class="logo" href="${BASE_PATH}/"><img src="${BASE_PATH}/logo.png" alt="Energized Engines"></a>
<div class="d-only" style="flex:1;display:flex;justify-content:center"><div class="search"><form role="search" action="${BASE_PATH}/search.html" method="get"><input type="search" name="q" placeholder="Search part number, model or keyword" aria-label="Search part number, model or keyword"><button aria-label="Search">${icons.search}</button></form>
<div class="ta" id="typeahead"></div></div></div><span class="sp m-only"></span>
<div class="hdr-actions"><div class="hdr-phone d-only">Questions? Call or text<b>832-444-5426</b></div>
<a class="icon-btn m-only" href="tel:+18324445426" aria-label="Call">${icons.phone}</a>
<button class="icon-btn cart-btn" onclick="EECart.openCartDrawer()" aria-label="Cart">${icons.cart}${cartCount}</button></div></div>
<div class="m-only m-search"><div class="search"><form role="search" action="${BASE_PATH}/search.html" method="get"><input type="search" name="q" placeholder="Search part number, model or keyword" aria-label="Search"><button aria-label="Search">${icons.search}</button></form></div></div></div></header>
<nav class="nav d-only"><div class="wrap"><a class="primary" href="${BASE_PATH}/models.html">${icons.grid}Shop by lift model${icons.chevronDown}</a>
<a href="${BASE_PATH}/series/2000.html">Series 2000</a><a href="${BASE_PATH}/series/2100.html">Series 2100</a><a href="${BASE_PATH}/series/2400.html">Series 2400</a>
<a href="${BASE_PATH}/series/roust-a-bout.html">Roust-A-Bout</a><a href="${BASE_PATH}/series/eventer.html">Eventer</a><a href="${BASE_PATH}/series/gantry.html">Gantry</a>
<span class="sp"></span><a href="${BASE_PATH}/manuals.html">Manuals and diagrams</a><a class="ee" href="${BASE_PATH}/ee-brand.html">EE brand parts</a></div></nav>
<main>`;
}

// Footer component
function getFooter() {
  return `</main>
<div class="scrim" id="cartScrim"></div>
<div class="drawer" id="cartDrawer">
<div class="dr-h"><h3>CART <span id="cartCountText">(0)</span></h3><button class="icon-btn" id="cartCloseBtn" aria-label="Close">${icons.x}</button></div>
<div class="dr-added" id="cartAddedBanner" style="display:none">${icons.check}<span id="cartAddedMsg"></span></div>
<div class="dr-items" id="cartItems"></div>
<div class="ship-meter" id="shippingMeter"><span id="shippingText">Add $150.00 for free ground shipping</span><div class="bar"><i id="shippingBar" style="width:0%"></i></div></div>
<div class="dr-f"><div class="tot"><span>Subtotal</span><b class="num" id="cartSubtotal">$0.00</b></div>
<p style="font-size:var(--fs-13);color:var(--muted);margin:var(--s-2) 0">Shipping and tax calculated at checkout</p>
<a href="${BASE_PATH}/checkout.html" class="btn btn-pri btn-block">${icons.lock}Check out</a>
<a href="${BASE_PATH}/cart.html" class="btn btn-sec btn-block">View cart</a></div></div>
<footer class="foot"><div class="wrap"><div class="cols">
<div><img src="${BASE_PATH}/logo.png" alt="Energized Engines" style="height:40px;margin-bottom:16px"><p style="margin:0 0 12px;max-width:340px">Sumner lift parts, EE brand replacement parts, lift rentals and winch rebuilds. Jersey Village, TX.</p>
<p style="margin:0;color:#fff;font-weight:600">832-444-5426 · Sales@EnergizedEngines.com</p></div>
<div><h4>Shop</h4><a href="${BASE_PATH}/models.html">Shop by lift model</a><a href="${BASE_PATH}/ee-brand.html">EE brand parts</a><a href="${BASE_PATH}/search.html">Search parts</a></div>
<div><h4>Help</h4><a href="${BASE_PATH}/manuals.html">Manuals and diagrams</a><a href="${BASE_PATH}/about.html">About</a><a href="${BASE_PATH}/return-policy.html">Returns</a></div>
<div><h4>Services</h4><a href="mailto:Sales@EnergizedEngines.com?subject=Lift%20rental">Lift rentals</a><a href="mailto:Sales@EnergizedEngines.com?subject=Winch%20rebuild">Winch rebuilds</a></div></div>
<div class="legal"><span>&copy; 2026 Energized Engines. Sumner is a trademark of its owner. Sumner part numbers are shown for reference.</span><span>Secure checkout by Stripe</span></div></div></footer>
<script src="${BASE_PATH}/cart.js"></script>
<script src="${BASE_PATH}/search.js"></script>
</body></html>`;
}

// Product card component
function renderProductCard(product) {
  const partNumber = product.part_number || product.extracted_part_number || '';
  const price = parseFloat(product.price || 0);
  const isEE = product.vendor === 'Energized Engines';
  const cleanedTitle = cleanTitle(product.title);
  const image = product.images?.[0]?.src || '';
  const handle = product.handle || `product-${product.id}`;
  
  // Check for Sumner logo placeholder
  const isSumnerLogo = image && (image.includes('Sumner_Logo') || image.includes('sumner-logo'));
  const displayImage = isSumnerLogo ? '' : image;
  
  // Get fitment models (limit to 3 on cards, 2 on mobile via CSS)
  const models = (product.models || []).slice(0, 3).map(m => 
    `<span class="chip sm">Fits ${m}</span>`
  ).join('');
  
  // Check for diagram badge
  const hasDiagram = diagramMap[partNumber]?.length > 0;
  
  // Get Sumner price if EE part
  let sumnerPrice = null;
  if (isEE && product.title) {
    const sumnerMatch = product.title.match(/After Market Sumner (\d+)/i);
    if (sumnerMatch) {
      const sumnerPartNum = sumnerMatch[1];
      // Find Sumner product with this part number
      const sumnerProduct = data.products?.find(p => 
        p.extracted_part_number === sumnerPartNum && p.vendor === 'Sumner'
      );
      if (sumnerProduct && sumnerProduct.price) {
        sumnerPrice = parseFloat(sumnerProduct.price);
      }
    }
  }
  
  const savings = sumnerPrice ? Math.round(((sumnerPrice - price) / sumnerPrice) * 100) : 0;
  
  const badges = [];
  if (isEE) {
    badges.push(`<span class="badge b-ee">${icons.bolt}EE brand</span>`);
  } else {
    badges.push(`<span class="badge b-oem">Sumner OEM</span>`);
  }
  if (savings > 0) {
    badges.push(`<span class="badge b-save">Save ${savings}%</span>`);
  }
  if (hasDiagram) {
    badges.push(`<span class="badge b-man">Diagram</span>`);
  }
  
  const imageHtml = displayImage 
    ? `<img src="${displayImage}" alt="${escapeHtml(cleanedTitle)}" loading="lazy">`
    : '<div style="color:var(--muted);font-size:var(--fs-14);text-align:center">No photo yet</div>';
  
  const replaces = isEE && product.title ? 
    product.title.match(/After Market Sumner (\d+)/i)?.[1] || '' : '';
  
  return `<a class="card" href="${BASE_PATH}/products/${handle}.html">
<div class="im"><div class="tl">${badges.join('')}</div>${imageHtml}</div>
<div class="bd"><div class="pn">${escapeHtml(partNumber)}${replaces ? `<span class="rep"> · replaces ${replaces}</span>` : ''}</div>
<div class="nm">${escapeHtml(cleanedTitle)}</div>
<div class="fits">${models ? `<span class="muted-s">Fits</span>${models}` : ''}</div>
<div class="pr"><b>${formatPrice(price) || 'Call for price'}</b>${sumnerPrice ? `<s>Sumner ${formatPrice(sumnerPrice)}</s>` : ''}</div>
<div class="ft"><span class="stock st-ok">In stock</span>
<button class="qa" aria-label="Add to cart" data-id="${product.id}" data-part-number="${escapeHtml(partNumber)}" data-name="${escapeHtml(cleanedTitle)}" data-price="${price}" data-image="${displayImage}">${icons.plus}</button></div></div></a>`;
}

console.log('Build script loaded. Starting build...\n');

// Export for use in build functions
module.exports = {
  data,
  manualSources,
  diagramMap,
  BASE_PATH,
  DOCS_DIR,
  escapeHtml,
  cleanText,
  cleanTitle,
  formatPrice,
  icons,
  getHeader,
  getFooter,
  renderProductCard
};

// Continue with build functions in next section...

// Return policy text from live site
const REFUND_POLICY_TEXT = `Energized Engines will accept returns on any unused items within 15 days of the customer receiving the item. The item must be in the original package and have not been used or opened. A 20% restocking fee will be charged on all accepted returns. All returns must be approved by Energized Engines. Electrical items are not eligible for return.

To request a return authorization, please contact us at Sales@EnergizedEngines.com or call 832-444-5426.`;

// Build all pages
function buildAll() {
  console.log('Building all pages...\n');
  
  // Create directories
  const dirs = ['products', 'series', 'models'];
  dirs.forEach(dir => {
    const dirPath = path.join(DOCS_DIR, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
  
  // Build static pages
  buildHomePage();
  buildAboutPage();
  buildReturnPolicyPage();
  buildManualsPage();
  buildCartPage();
  buildCheckoutPage();
  buildConfirmationPage();
  buildSearchPage();
  buildModelsIndexPage();
  
  // Build product pages
  let productCount = 0;
  data.products.forEach(product => {
    buildProductPage(product);
    productCount++;
    if (productCount % 100 === 0) {
      process.stdout.write(`\rBuilt ${productCount}/${data.products.length} product pages...`);
    }
  });
  console.log(`\n✓ Built ${productCount} product pages`);
  
  // Build series pages (must come before individual model pages to avoid overwriting)
  const seriesConfig = [
    { name: '2000', models: ['2000', '2001', '2003', '2004', '2005', '2008', '2010', '2012', '2014', '2015', '2017', '2018', '2020', '2021', '2024', '2025'] },
    { name: '2100', models: ['2100', '2112', '2118', '2124'] },
    { name: '2400', models: [] },
    { name: 'Roust-A-Bout', models: ['R-100', 'R-150', 'R-180', 'R-250', 'Roust-A-Bout'] },
    { name: 'Eventer', models: ['EVENTER 16', 'EVENTER 20', 'EVENTER 25', 'EVENTER25', 'Eventer 16', 'Eventer 20', 'Eventer 25'] },
    { name: 'Gantry', models: ['Gantry', 'GH2T'] }
  ];
  
  const seriesModels = new Set();
  seriesConfig.forEach(({ name, models }) => {
    buildSeriesPage(name, models);
    models.forEach(m => seriesModels.add(m));
  });
  
  // Build individual model pages (skip those in series)
  let modelCount = 0;
  Object.keys(data.models).forEach(model => {
    if (!seriesModels.has(model)) {
      buildModelPage(model, data.models[model]);
      modelCount++;
    }
  });
  console.log(`✓ Built ${seriesConfig.length} series pages + ${modelCount} individual model pages`);
  
  // Build search data
  buildSearchData();
  
  // Build extra pages
  buildEEBrandPage();
  
  console.log('\n✅ Build complete!');
  console.log(`   - ${productCount} product pages`);
  console.log(`   - ${seriesCount} series pages`);
  console.log(`   - 11 static pages`);
}

// Build functions
function buildHomePage() {
  const stats = {
    parts: data.products.length,
    models: Object.keys(data.models).length,
    eeParts: data.products.filter(p => p.vendor === 'Energized Engines').length
  };
  
  // Calculate series counts using exact model matches (same as buildSeriesPage)
  const getSeriesCount = (exactModels) => {
    const partIds = new Set();
    exactModels.forEach(modelName => {
      if (data.models[modelName]) {
        data.models[modelName].forEach(p => partIds.add(p.id));
      }
    });
    return partIds.size;
  };
  
  const html = `${getHeader('Sumner lift parts', 'home')}
<section class="hero"><div class="wrap hero-g"><div class="hero-l"><div class="eyebrow">Sumner lift parts · OEM and EE brand</div><h1>Find parts for your lift</h1>
<p class="lede">Search by part number or browse our full catalog.</p>
<div class="finder"><form action="${BASE_PATH}/search.html" method="get" style="width:100%"><div class="f-pn"><label class="sel" style="flex:1"><span>Part number</span><input class="selbox inp" name="q" type="text" placeholder="e.g. 779002" style="border:0;padding:0;font-family:var(--font-mono)"></label><button type="submit" class="btn btn-dark">Search</button></div></form></div>
<div class="hero-stats"><div><b class="num">${stats.parts.toLocaleString()}</b><span>parts listed</span></div><div><b class="num">${stats.models}</b><span>Sumner models</span></div><div><b class="num">${stats.eeParts}</b><span>EE brand parts</span></div></div></div>
<div class="hero-r d-only"><div class="plate-card"><div class="eyebrow" style="color:var(--ink-2)">Not sure of your model?</div><h3 style="margin:6px 0 4px">It's on the plate on the mast</h3>
<p>The model number is stamped on the ID plate near the base of the mast. Have the serial number too if you call us.</p></div></div></div></section>

<section class="sec"><div class="wrap"><div class="sec-h"><div><h2>Shop by lift model</h2><p>Every part we list, sorted by the Sumner lift it fits.</p></div><a href="${BASE_PATH}/models.html">All ${stats.models} models</a></div>
<div class="mgrid">
${[
  { series: '2000', exactModels: ['2000', '2001', '2003', '2004', '2005', '2008', '2010', '2012', '2014', '2015', '2017', '2018', '2020', '2021', '2024', '2025'], display: '2010 2015 2020 2025' },
  { series: '2100', exactModels: ['2100', '2112', '2118', '2124'], display: '2112 2118 2124' },
  { series: '2400', exactModels: [], display: '2412 2416' },
  { series: 'Roust-A-Bout', exactModels: ['R-100', 'R-150', 'R-180', 'R-250', 'Roust-A-Bout'], display: 'R-100 R-150 R-180 R-250' },
  { series: 'Eventer', exactModels: ['EVENTER 16', 'EVENTER 20', 'EVENTER 25', 'EVENTER25', 'Eventer 16', 'Eventer 20', 'Eventer 25'], display: '16 20 25' },
  { series: 'Gantry', exactModels: ['Gantry', 'GH2T'], display: '2 Ton Gantry GH2T' }
].map(({ series, exactModels, display }) => {
  const seriesKey = series.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const count = getSeriesCount(exactModels);
  return `<a class="mtile" href="${BASE_PATH}/series/${seriesKey}.html"><div><h3>${series}</h3><div class="mono models">${display}</div></div><div class="mt-f"><span class="num">${count} parts</span>${icons.chevronRight}</div></a>`;
}).join('')}
</div></div></section>

<section class="svc"><div class="wrap svc-g"><div><b>Lift rentals</b><span>Sumner 2118, 2124, 2412 and 2416. Daily, weekly or monthly.</span><a class="link" href="mailto:Sales@EnergizedEngines.com?subject=Lift%20rental">Ask about rentals</a></div>
<div><b>Winch rebuilds</b><span>Send us your Sumner winch and we rebuild it.</span><a class="link" href="mailto:Sales@EnergizedEngines.com?subject=Winch%20rebuild">Ask about a rebuild</a></div></div></section>
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), html);
  console.log('✓ Built index.html');
}

function buildProductPage(product) {
  const partNumber = product.extracted_part_number || product.part_number || '';
  const title = cleanTitle(product.title);
  const price = parseFloat(product.price || 0);
  const isEE = product.vendor === 'Energized Engines';
  const handle = product.handle || `product-${product.id}`;
  const images = product.images || [];
  const models = product.models || [];
  
  // Get diagram info
  const diagrams = diagramMap[partNumber] || [];
  const hasDiagram = diagrams.length > 0;
  
  // Build fits panel - show ALL badges from diagram map
  let fitsHtml = '';
  if (models.length > 0 || hasDiagram) {
    fitsHtml = `<div class="fitbox"><div class="fb-h"><h3>Fits these models</h3></div>`;
    
    if (models.length > 0) {
      // Group models by series
      const modelsBySeries = {};
      models.forEach(m => {
        const series = m.match(/^[A-Z]+-?\d+/)?.[0] || m.split(/\s/)[0] || 'Other';
        if (!modelsBySeries[series]) modelsBySeries[series] = [];
        modelsBySeries[series].push(m);
      });
      
      Object.entries(modelsBySeries).forEach(([series, seriesModels]) => {
        fitsHtml += `<div class="fit-r"><b>${series}</b><div>`;
        seriesModels.forEach(m => {
          fitsHtml += `<span class="chip">Fits ${m}</span>`;
        });
        fitsHtml += `</div></div>`;
      });
    }
    
    // Add ALL badge entries from diagram map for this part
    if (hasDiagram) {
      fitsHtml += `<div class="fit-r"><b>Manual References</b><div style="display:flex;flex-direction:column;gap:6px">`;
      diagrams.forEach(diagram => {
        let badgeText = '';
        if (diagram.badgeType === 'exact' && diagram.model) {
          // exact: "Verified for <model> in <manual title>, p. N"
          badgeText = `Verified for ${diagram.model} in ${diagram.manualTitle}, p. ${diagram.page}`;
        } else if (diagram.badgeType === 'series' && diagram.model) {
          // series: "Listed in Series X parts manual, p. N"
          badgeText = `Listed in Series ${diagram.model} parts manual, p. ${diagram.page}`;
        } else {
          // listed: "Listed in <manual>, p. N" (manual title may already include "Sumner")
          const prefix = diagram.manualTitle.match(/^(Sumner|Series)/i) ? '' : 'Sumner ';
          badgeText = `Listed in ${prefix}${diagram.manualTitle}, p. ${diagram.page}`;
        }
        fitsHtml += `<span class="badge b-man">${badgeText}</span>`;
      });
      fitsHtml += `</div></div>`;
    }
    
    fitsHtml += `</div>`;
  }
  
  const imageHtml = images.length > 0 ? 
    `<img src="${images[0].src}" alt="${escapeHtml(title)}" loading="lazy">` :
    '<div style="color:var(--muted);text-align:center;padding:var(--s-12)">No photo yet</div>';
  
  const html = `${getHeader(title, '', 'pdp-page')}
<div class="wrap"><nav class="crumbs"><a href="${BASE_PATH}/">Home</a>${icons.chevronRight}<span>${partNumber}</span></nav>
<div class="pdp-g">
<div class="gal"><div class="gal-main">${imageHtml}</div></div>
<div class="buy">
${hasDiagram ? `<div class="buy-tags"><span class="badge b-man">Diagram</span></div>` : ''}
<h1 class="pdp-t">${escapeHtml(title)}</h1>
<div class="pdp-pn"><span>Part number</span><b class="mono">${escapeHtml(partNumber)}</b></div>
<div class="pdp-price"><b class="num">${formatPrice(price) || 'Call for price'}</b></div>
<div class="stockbox"><div><span class="stock st-ok">In stock</span> <span class="muted-s">Ships from Jersey Village, TX</span></div></div>
<div class="atc"><div class="qty"><button onclick="const q=document.getElementById('productQty');q.textContent=Math.max(1,parseInt(q.textContent)-1)">−</button><span class="num" id="productQty">1</span><button onclick="const q=document.getElementById('productQty');q.textContent=parseInt(q.textContent)+1">+</button></div>
<button class="btn btn-pri" id="addToCartBtn" data-id="${product.id}" data-part-number="${escapeHtml(partNumber)}" data-name="${escapeHtml(title)}" data-price="${price}" data-image="${images[0]?.src || ''}">${icons.cart}Add to cart</button></div>
${fitsHtml}
</div></div></div>
${getFooter()}`;
  
  const filePath = path.join(DOCS_DIR, 'products', `${handle}.html`);
  fs.writeFileSync(filePath, html);
}

function buildModelPage(modelKey, products) {
  const seriesKey = modelKey.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const title = modelKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  const html = `${getHeader(title + ' Parts', 'models')}
<div class="wrap" style="padding-top:var(--s-8)">
<h1>${title} PARTS</h1>
<p style="margin:var(--s-4) 0">Parts for ${title} Sumner lifts. All ${products.length} parts shown.</p>
<div class="grid-cards" style="margin-top:var(--s-6)">
${products.map(p => renderProductCard(p)).join('')}
</div>
</div>
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'series', `${seriesKey}.html`), html);
}

function buildAboutPage() {
  const html = `${getHeader('About', 'about')}
<div class="wrap" style="padding:var(--s-12) 0;max-width:800px">
<h1>About Sumner Lifts and Parts</h1>
<p style="margin:var(--s-6) 0">We stock OEM Sumner parts and house-brand aftermarket replacement parts for Sumner material lifts.</p>
<h2>Series We Support</h2>
<ul style="margin:var(--s-4) 0;line-height:1.8">
<li><b>Series 2000</b> - Models 2010, 2015, 2020, 2025</li>
<li><b>Series 2100</b> - Models 2112, 2118, 2124</li>
<li><b>Series 2400</b> - Models 2412, 2416</li>
<li><b>Roust-A-Bout</b> - Models R-100, R-150, R-180, R-250</li>
<li><b>Eventer</b> - Models 16, 20, 25</li>
<li><b>Gantry</b> - 2 Ton Gantry, GH2T</li>
</ul>
<p style="margin:var(--s-6) 0">Contact us: <b>832-444-5426</b> or <a href="mailto:Sales@EnergizedEngines.com" class="link">Sales@EnergizedEngines.com</a></p>
</div>
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'about.html'), html);
  console.log('✓ Built about.html');
}

function buildReturnPolicyPage() {
  const html = `${getHeader('Return Policy', 'return-policy')}
<div class="wrap" style="padding:var(--s-12) 0;max-width:800px">
<h1>Return Policy</h1>
<div style="line-height:1.8;color:var(--ink-2)">
${REFUND_POLICY_TEXT.split('\n\n').map(p => `<p style="margin:var(--s-4) 0">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('')}
<h2 style="margin:var(--s-6) 0 var(--s-4)">How to Initiate a Return</h2>
<p>Contact us before returning any item:</p>
<ul style="margin:var(--s-2) 0"><li>Email: Sales@EnergizedEngines.com</li><li>Phone: 832-444-5426</li></ul>
<p style="margin:var(--s-4) 0"><b>Do not return items without an RA number.</b></p>
</div></div>
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'return-policy.html'), html);
  console.log('✓ Built return-policy.html');
}

function buildManualsPage() {
  const manuals = Object.entries(manualSources).map(([model, info]) => {
    return `<a class="manrow" href="${info.url}" target="_blank" rel="noopener">
${icons.doc}<div><b>${escapeHtml(info.title)}</b><span>Fits ${model} · Sumner PDF</span></div>${icons.chevronRight}</a>`;
  }).join('');
  
  const html = `${getHeader('Manuals and Diagrams', 'manuals')}
<div class="wrap" style="padding:var(--s-12) 0;max-width:900px">
<h1>Manuals and Diagrams</h1>
<p style="margin:var(--s-4) 0;color:var(--ink-2)">Sumner lift assembly manuals and exploded diagrams. These PDFs are hosted on sumner.com.</p>
<div style="display:grid;gap:var(--s-3);margin-top:var(--s-6)">${manuals}</div>
</div>
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'manuals.html'), html);
  console.log('✓ Built manuals.html');
}

function buildCartPage() {
  const html = `${getHeader('Shopping Cart', 'cart')}
<div class="wrap" style="padding-top:var(--s-8);padding-bottom:var(--s-12)">
<h1>Shopping Cart</h1>
<div style="display:grid;grid-template-columns:1fr 400px;gap:var(--s-10);margin-top:var(--s-6)" class="d-only">
<div id="cartPageItems"></div>
<div style="align-self:start;position:sticky;top:24px">
<div style="background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);padding:var(--s-5) var(--s-6)">
<h3>Order Summary</h3>
<div style="display:flex;justify-content:space-between;padding:var(--s-2) 0;border-bottom:1px solid var(--line)">
<span>Subtotal</span><span id="cartPageSubtotal" class="num">$0.00</span></div>
<div style="display:flex;justify-content:space-between;padding:var(--s-4) 0;font-size:var(--fs-24);font-weight:700">
<span>Total</span><span id="cartPageTotal" class="num">$0.00</span></div>
<a href="${BASE_PATH}/checkout.html" class="btn btn-pri btn-block">Proceed to Checkout</a>
<a href="${BASE_PATH}/" class="btn btn-sec btn-block" style="margin-top:var(--s-2)">Continue Shopping</a>
</div></div></div>
<div id="cartPageItems" class="m-only"></div>
</div>
${getFooter()}
<script>
document.addEventListener('DOMContentLoaded', function() {
  EECart.renderCartPage();
  document.getElementById('cartPageTotal').textContent = document.getElementById('cartPageSubtotal').textContent;
});
</script>`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'cart.html'), html);
  console.log('✓ Built cart.html');
}

function buildCheckoutPage() {
  const existing = fs.readFileSync(path.join(DOCS_DIR, 'checkout.html'), 'utf8');
  // Keep existing checkout page as-is
  console.log('✓ Keeping checkout.html');
}

function buildConfirmationPage() {
  const existing = fs.readFileSync(path.join(DOCS_DIR, 'order-confirmation.html'), 'utf8');
  // Keep existing confirmation page as-is  
  console.log('✓ Keeping order-confirmation.html');
}

function buildSearchPage() {
  const html = `${getHeader('Search', 'search')}
<div class="wrap" style="padding:var(--s-8) 0">
<h1>Search Parts</h1>
<div class="search" style="max-width:600px;margin:var(--s-6) 0">
<form role="search" action="${BASE_PATH}/search.html" method="get">
<input type="search" name="q" placeholder="Search part number, model or keyword" aria-label="Search">
<button aria-label="Search">${icons.search}</button>
</form></div>
<div id="searchResults"></div>
</div>
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'search.html'), html);
  console.log('✓ Built search.html');
}

function buildModelsIndexPage() {
  const html = `${getHeader('Shop by Model', 'models')}
<div class="wrap" style="padding:var(--s-8) 0">
<h1>Shop by Lift Model</h1>
<p style="margin:var(--s-4) 0;color:var(--ink-2)">Browse all ${Object.keys(data.models).length} Sumner lift models.</p>
<div class="mgrid" style="margin-top:var(--s-6)">
${Object.entries(data.models).map(([model, products]) => {
  const seriesKey = model.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `<a class="mtile" href="${BASE_PATH}/series/${seriesKey}.html"><div><h3>${model.toUpperCase()}</h3></div><div class="mt-f"><span class="num">${products.length} parts</span>${icons.chevronRight}</div></a>`;
}).join('')}
</div></div>
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'models.html'), html);
  console.log('✓ Built models.html');
}

function buildSearchData() {
  const searchData = {
    parts: data.products.map(p => ({
      id: p.id,
      partNumber: p.extracted_part_number || p.part_number || '',
      name: cleanTitle(p.title),
      price: p.price || '0',
      image: p.images?.[0]?.src || '',
      handle: p.handle || `product-${p.id}`
    })),
    models: Object.keys(data.models)
  };
  
  fs.writeFileSync(
    path.join(DOCS_DIR, 'search-data.json'),
    JSON.stringify(searchData, null, 2)
  );
  console.log(`✓ Built search-data.json (${searchData.parts.length} parts, ${searchData.models.length} models)`);
}

// Run build
buildAll();

function buildEEBrandPage() {
  const eeProducts = data.products.filter(p => p.vendor === 'Energized Engines');
  
  const html = `${getHeader('EE Brand Parts', 'ee-brand')}
<div class="wrap" style="padding:var(--s-8) 0">
<h1>EE Brand Replacement Parts</h1>
<p style="margin:var(--s-4) 0">Energized Engines aftermarket replacement parts for Sumner lifts. ${eeProducts.length} parts available.</p>
<div class="grid-cards" style="margin-top:var(--s-6)">
${eeProducts.slice(0, 100).map(p => renderProductCard(p)).join('')}
</div>
${eeProducts.length > 100 ? `<p style="text-align:center;margin:var(--s-6) 0;color:var(--muted)">Showing first 100 of ${eeProducts.length} EE parts. <a href="${BASE_PATH}/search.html?q=energized">Search all</a></p>` : ''}
</div>
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'ee-brand.html'), html);
  console.log('✓ Built ee-brand.html');
}

function buildSeriesPage(seriesName, exactModels) {
  const seriesKey = seriesName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  // Collect all products for this series using exact model names
  const seriesProducts = new Map();
  exactModels.forEach(modelName => {
    if (data.models[modelName]) {
      data.models[modelName].forEach(p => seriesProducts.set(p.id, p));
    }
  });
  
  const products = Array.from(seriesProducts.values());
  
  const html = `${getHeader(seriesName + ' Parts', 'models')}
<div class="wrap" style="padding-top:var(--s-8)">
<h1>${seriesName.toUpperCase()} PARTS</h1>
<p style="margin:var(--s-4) 0">Parts for ${seriesName} Sumner lifts. ${products.length} parts shown.</p>
${products.length === 0 ? '<p style="margin:var(--s-6) 0;color:var(--muted)">No parts cataloged for this series yet. <a href="mailto:Sales@EnergizedEngines.com">Contact us</a> for availability.</p>' : ''}
${products.length > 0 ? `<div class="grid-cards" style="margin-top:var(--s-6)">
${products.slice(0, 100).map(p => renderProductCard(p)).join('')}
</div>` : ''}
${products.length > 100 ? `<p style="text-align:center;margin:var(--s-6) 0;color:var(--muted)">Showing first 100 of ${products.length} parts</p>` : ''}
</div>
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'series', `${seriesKey}.html`), html);
  console.log(`✓ Built series/${seriesKey}.html (${products.length} parts)`);
}

