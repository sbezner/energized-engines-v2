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
<span>${icons.returns}30-day returns on unused parts</span><span>${icons.phone}Call or text <b>832-444-5426</b></span></div></div>
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
