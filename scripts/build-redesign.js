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

// Helper to get product price from variants or fallback
function getPrice(p) {
  return parseFloat(p.variants?.[0]?.price ?? p.price ?? 0);
}

console.log('Loading data...');
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// Normalize and clean model list
function normalizeModelKey(model) {
  return model.replace(/\s+/g, '').toUpperCase();
}

// EE SKUs that aren't Sumner models
const EE_SKUS_TO_EXCLUDE = ['2001', '2003', '2004', '2005', '2017', '2021'];
// Genie models to exclude
const GENIE_MODELS = ['SLC-18', 'SLC-24'];

// Build clean model list with normalized keys (for model pages only)
// Keep all models in data.models for series page building, but track which should have pages
const normalizedModels = {};
const seenKeys = new Set();
const excludeSet = new Set([...EE_SKUS_TO_EXCLUDE, ...GENIE_MODELS].map(normalizeModelKey));
const EXCLUDED_MODEL_KEYS = [];

Object.keys(data.models).forEach(model => {
  const normalizedKey = normalizeModelKey(model);
  
  // Track excluded models but keep them in data.models for product lookups
  if (excludeSet.has(normalizedKey)) {
    console.log(`Excluding model page: ${model}`);
    EXCLUDED_MODEL_KEYS.push(model);
    return;
  }
  
  // Skip if already seen (case-insensitive duplicate)
  if (seenKeys.has(normalizedKey)) {
    console.log(`Skipping duplicate model: ${model} (already have ${normalizedKey})`);
    EXCLUDED_MODEL_KEYS.push(model);
    return;
  }
  
  seenKeys.add(normalizedKey);
  normalizedModels[model] = data.models[model];
});

const MODEL_COUNT = Object.keys(normalizedModels).length;
console.log(`Cleaned model count: ${MODEL_COUNT} (excluded ${EXCLUDED_MODEL_KEYS.length}, kept ${Object.keys(data.models).length} in data.models for lookups)`);

// Load manual sources
let manualSources = {};
let manualsData = [];
if (fs.existsSync(MANUAL_SOURCES_FILE)) {
  const manualCsv = fs.readFileSync(MANUAL_SOURCES_FILE, 'utf8');
  manualCsv.split('\n').slice(1).forEach(line => {
    if (!line.trim()) return;
    const match = line.match(/^"([^"]+)","([^"]+)","([^"]+)","([^"]+)"/);
    if (match) {
      const [, model, title, url, status] = match;
      manualSources[model] = { title, url };
      manualsData.push({ model, manual_title: title, manual_url: url, http_status: status });
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

// Extract part number from product, including EE XXXX patterns
function getPartNumber(product) {
  if (product.extracted_part_number) {
    return product.extracted_part_number;
  }
  if (product.part_number) {
    return product.part_number;
  }
  // For EE products without extracted_part_number, try to extract from title
  if (product.vendor === 'Energized Engines' && product.title) {
    const eeMatch = product.title.match(/EE\s*(\d+)/i);
    if (eeMatch) {
      return eeMatch[1];
    }
  }
  return '';
}

// Filter fitment models to avoid confusion with EE part numbers
function getFilteredModels(product) {
  const partNumber = getPartNumber(product);
  const isEE = product.vendor === 'Energized Engines';
  let models = product.models || [];
  
  // For EE products, filter out models that match the EE part number
  // to avoid confusing chips like "Fits 2021" on EE 2021
  if (isEE && partNumber && models.includes(partNumber)) {
    models = models.filter(m => m !== partNumber);
  }
  
  return models;
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
<div class="util d-only"><div class="wrap"><span>${icons.truck}<b>Free ground shipping</b> on orders over $250, Lower 48</span>
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
<div class="m-only m-search"><div class="search"><form role="search" action="${BASE_PATH}/search.html" method="get"><input type="search" name="q" placeholder="Search part number, model or keyword" aria-label="Search"><button aria-label="Search">${icons.search}</button></form>
<div class="ta" id="typeaheadMobile"></div></div></div></div></header>
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
<div class="ship-meter" id="shippingMeter"><span id="shippingText">Add $250.00 for free ground shipping</span><div class="bar"><i id="shippingBar" style="width:0%"></i></div></div>
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
<div class="legal"><span>&copy; 2026 Energized Engines. Sumner is a trademark of its owner. Sumner part numbers are shown for reference.</span><span>Demo checkout: no payment is taken</span></div></div></footer>
<script src="${BASE_PATH}/cart.js"></script>
<script src="${BASE_PATH}/search.js"></script>
</body></html>`;
}

// Product card component
function renderProductCard(product) {
  const partNumber = getPartNumber(product);
  const price = getPrice(product);
  const isEE = product.vendor === 'Energized Engines';
  const cleanedTitle = cleanTitle(product.title);
  const handle = product.handle || `product-${product.id}`;
  
  // Filter out 225x225 Sumner logo placeholder
  const validImages = (product.images || []).filter(img => !(img.width === 225 && img.height === 225));
  const image = validImages[0]?.src || '';
  const displayImage = image;
  
  // Get filtered fitment models (limit to 3 on cards, 2 on mobile via CSS)
  const filteredModels = getFilteredModels(product);
  const models = filteredModels.slice(0, 3).map(m => 
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
      if (sumnerProduct) {
        sumnerPrice = getPrice(sumnerProduct);
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
  
  // Format part number for EE products: "EE 1021" instead of just "1021"
  const displayPartNumber = (isEE && partNumber) ? `EE ${partNumber}` : partNumber;
  
  // Only show part number line if we have a part number
  const partNumberLine = partNumber ? 
    `<div class="pn">${escapeHtml(displayPartNumber)}${replaces ? `<span class="rep"> · replaces ${replaces}</span>` : ''}</div>` : '';
  
  return `<a class="card" href="${BASE_PATH}/products/${handle}.html">
<div class="im"><div class="tl">${badges.join('')}</div>${imageHtml}</div>
<div class="bd">${partNumberLine}
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

// Return policy text from live site (copied faithfully section by section)
const REFUND_POLICY_TEXT = {
  intro: `Returns are accepted within 14 days of ship date. Customer pays return shipping fees plus a 20% restocking fee.`,
  
  ineligible: `CIRCUIT BOARDS, CIRCUIT CARDS, ELECTRONIC PARTS OF ANY KIND, Hardware, Sheet Metal, Nameplates, Service Kits, Non-standard or Made-To-Order Items, Partial Pack Quantities, Bulk Cable, Memory Cards, or any item considered low usage ARE NOT ELIGIBLE FOR RETURNS. Please make sure you have the correct part number before ordering these products.

THIS POLICY IS STRICTLY ENFORCED.`,
  
  policy14day: `We have a 14-day return policy on eligible items, which means you have 14 days after receiving your item to request a return.`,
  
  eligibility: `Eligible items must be in the same condition that you received it, unworn or unused, with tags, and in its original packaging. You'll also need the receipt or proof of purchase. To start a return, you can contact us at sales@energizedengines.com. Please note that returns will need to be sent to the following address: 16225 St. Hellier, Jersey Village, TX, 77040 If your return is accepted, we'll send you return instructions on how and where to send your package. Items sent back to us without first requesting a return will not be accepted. You can always contact us for any return question at sales@energizedengines.com.`,
  
  damages: `Damages and issues Please inspect your order upon reception and contact us immediately if the item is defective, damaged or if you receive the wrong item, so that we can evaluate the issue and make it right.`,
  
  exchanges: `Exchanges The fastest way to ensure you get what you want is to return the item you have, and once the return is accepted, make a separate purchase for the new item.`,
  
  refunds: `Refunds We will notify you once we've received and inspected your return, and let you know if the refund was approved or not. If approved, you'll be automatically refunded on your original payment method within 10 business days. Please remember it can take some time for your bank or credit card company to process and post the refund too. If more than 15 business days have passed since we've approved your return, please contact us at sales@energizedengines.com.`
};

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
  // Include ALL model keys that products might have, even excluded ones, so series pages show all parts
  const seriesConfig = [
    { name: '2000', models: ['2000', '2001', '2003', '2004', '2005', '2008', '2010', '2012', '2014', '2015', '2017', '2018', '2020', '2021', '2024', '2025'] },
    { name: '2100', models: ['2100', '2112', '2118', '2124'] },
    { name: '2400', models: ['2400', '2412', '2416'] },
    { name: 'Roust-A-Bout', models: ['R-100', 'R-150', 'R-180', 'R-250', 'Roust-A-Bout'] },
    { name: 'Eventer', models: ['EVENTER 16', 'EVENTER 20', 'EVENTER 25', 'EVENTER25', 'Eventer 16', 'Eventer 20', 'Eventer 25'] },
    { name: 'Gantry', models: ['Gantry', 'GH2T'] }
  ];
  
  const seriesModels = new Set();
  seriesConfig.forEach(({ name, models }) => {
    buildSeriesPage(name, models);
    models.forEach(m => seriesModels.add(m));
  });
  
  // Build individual model pages (skip those in series and excluded models)
  let modelCount = 0;
  Object.keys(normalizedModels).forEach(model => {
    if (!seriesModels.has(model)) {
      buildModelPage(model, data.models[model]);
      modelCount++;
    }
  });
  console.log(`✓ Built ${seriesConfig.length} series pages + ${modelCount} individual model pages`);
  
  // Create redirects for excluded models (EE SKUs and duplicates)
  const redirectModels = ['2001', '2003', '2004', '2005', '2017', '2021', 'eventer25', 'Eventer 20', 'Eventer 16'];
  redirectModels.forEach(model => {
    const seriesKey = model.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const redirectHtml = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${BASE_PATH}/search.html?q=${encodeURIComponent(model)}"><title>Redirecting...</title></head><body><p>Redirecting to search results for ${model}...</p></body></html>`;
    fs.writeFileSync(path.join(DOCS_DIR, 'series', `${seriesKey}.html`), redirectHtml);
  });
  console.log(`✓ Created ${redirectModels.length} redirect pages`);
  
  // Build search data
  buildSearchData();
  
  // Build extra pages
  buildEEBrandPage();
  
  console.log('\n✅ Build complete!');
  console.log(`   - ${productCount} product pages`);
  console.log(`   - ${seriesConfig.length} series + ${modelCount} model pages`);
  console.log(`   - 11 static pages`);
}

// Build functions
function buildHomePage() {
  const stats = {
    parts: data.products.length,
    models: MODEL_COUNT,
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
  
  // Get popular parts: EE parts with photos (non-placeholder)
  const popularParts = data.products
    .filter(p => p.vendor === 'Energized Engines' && p.images && p.images.length > 0 && !(p.images[0].width === 225 && p.images[0].height === 225))
    .slice(0, 8);
  
  // Get EE parts with positive Sumner comparison (savings >= 1%)
  const eeCompare = data.products
    .filter(p => {
      if (p.vendor !== 'Energized Engines') return false;
      const price = getPrice(p);
      if (!price || price === 0) return false;
      
      // Extract Sumner part number from title
      const sumnerMatch = p.title.match(/After Market Sumner (\d+)/i);
      if (!sumnerMatch) return false;
      
      const sumnerPartNum = sumnerMatch[1];
      const sumnerPart = data.products.find(s => 
        s.extracted_part_number === sumnerPartNum && s.vendor === 'Sumner'
      );
      if (!sumnerPart) return false;
      
      const sumnerPrice = getPrice(sumnerPart);
      if (!sumnerPrice || sumnerPrice <= price) return false;
      
      // Check savings is >= 1%
      const savingPercent = ((sumnerPrice - price) / sumnerPrice) * 100;
      return savingPercent >= 1;
    })
    .slice(0, 4);
  
  // ID plate SVG
  const plateSVG = `<svg viewBox="0 0 320 180" class="plate" aria-hidden="true"><rect x="6" y="6" width="308" height="168" rx="10" fill="#E9ECEF" stroke="#9AA2AC" stroke-width="2"/>
<circle cx="24" cy="24" r="5" fill="#9AA2AC"/><circle cx="296" cy="24" r="5" fill="#9AA2AC"/><circle cx="24" cy="156" r="5" fill="#9AA2AC"/><circle cx="296" cy="156" r="5" fill="#9AA2AC"/>
<text x="40" y="58" font-family="Inter" font-size="13" font-weight="600" fill="#4A525D">MODEL NO.</text><rect x="40" y="66" width="240" height="34" rx="4" fill="#fff" stroke="#EA0917" stroke-width="2.5"/>
<text x="52" y="90" font-family="JetBrains Mono" font-size="18" font-weight="600" fill="#14171C">2118</text>
<text x="40" y="128" font-family="Inter" font-size="13" font-weight="600" fill="#4A525D">SERIAL NO.</text><rect x="40" y="136" width="240" height="24" rx="4" fill="#fff" stroke="#9AA2AC" stroke-width="1.5"/>
<text x="52" y="154" font-family="JetBrains Mono" font-size="14" fill="#6B737E">123456</text></svg>`;
  
  const html = `${getHeader('Sumner lift parts', 'home')}
<section class="hero"><div class="wrap hero-g"><div class="hero-l"><div class="eyebrow">Sumner lift parts · OEM and EE brand</div><h1>Find parts for your lift</h1>
<p class="lede">Pick your Sumner series and model to see every part that fits it, or search by part number.</p>
<div class="finder">
<div class="f-grid" id="modelFinder"><label class="sel"><span>Series</span><select id="seriesSelect" class="selbox"><option value="">Select series</option>${[
  { series: '2000', label: 'Series 2000' },
  { series: '2100', label: 'Series 2100' },
  { series: '2400', label: 'Series 2400' },
  { series: 'roust-a-bout', label: 'Roust-A-Bout' },
  { series: 'eventer', label: 'Eventer' },
  { series: 'gantry', label: 'Gantry' }
].map(s => `<option value="${s.series}">${s.label}</option>`).join('')}</select></label>
<label class="sel"><span>Model</span><select id="modelSelect" class="selbox" disabled><option value="">Select model</option></select></label>
<button type="button" class="btn btn-red" id="showPartsBtn" disabled>Show parts</button></div>
<div class="or">OR</div>
<form action="${BASE_PATH}/search.html" method="get" style="width:100%"><div class="f-pn"><label class="sel" style="flex:1"><span>Part number</span><input class="selbox inp" name="q" type="text" placeholder="e.g. 779002" style="border:0;padding:0;font-family:var(--font-mono)"></label><button type="submit" class="btn btn-dark">Search</button></div></form></div>
<div class="hero-stats"><div><b class="num">${stats.parts.toLocaleString()}</b><span>parts listed</span></div><div><b class="num">${stats.models}</b><span>Sumner models</span></div><div><b class="num">${stats.eeParts}</b><span>EE brand parts</span></div></div></div>
<div class="hero-r d-only"><div class="plate-card"><div class="eyebrow" style="color:var(--ink-2)">Not sure of your model?</div><h3 style="margin:6px 0 4px">It's on the plate on the mast</h3>
<p>The model number is stamped on the ID plate near the base of the mast. Have the serial number too if you call us.</p>${plateSVG}</div></div></div></section>

<section class="sec"><div class="wrap"><div class="sec-h"><div><h2>Shop by lift model</h2><p>Every part we list, sorted by the Sumner lift it fits.</p></div><a href="${BASE_PATH}/models.html">All ${stats.models} models</a></div>
<div class="mgrid">
${[
  { series: '2000', exactModels: ['2000', '2008', '2010', '2012', '2014', '2015', '2018', '2020', '2024', '2025'], display: '2010 2015 2020 2025' },
  { series: '2100', exactModels: ['2100', '2112', '2118', '2124'], display: '2112 2118 2124' },
  { series: '2400', exactModels: ['2400', '2412', '2416'], display: '2412 2416' },
  { series: 'Roust-A-Bout', exactModels: ['R-100', 'R-150', 'R-180', 'R-250', 'Roust-A-Bout'], display: 'R-100 R-150 R-180 R-250' },
  { series: 'Eventer', exactModels: ['EVENTER 16', 'EVENTER 20', 'EVENTER 25'], display: '16 20 25' },
  { series: 'Gantry', exactModels: ['Gantry', 'GH2T'], display: '2 Ton Gantry GH2T' }
].map(({ series, exactModels, display }) => {
  const seriesKey = series.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const count = getSeriesCount(exactModels);
  return `<a class="mtile" href="${BASE_PATH}/series/${seriesKey}.html"><div><h3>${series}</h3><div class="mono models">${display}</div></div><div class="mt-f"><span class="num">${count} parts</span>${icons.chevronRight}</div></a>`;
}).join('')}
</div></div></section>

<section class="sec" style="padding-top:0"><div class="wrap"><div class="sec-h"><div><h2>Popular parts</h2><p>EE brand parts with photos. Hand-picked until order history exists.</p></div><a href="${BASE_PATH}/search.html">See all parts</a></div>
<div class="grid-cards">${popularParts.map(p => renderProductCard(p)).join('')}</div></div></section>

<section class="eeband"><div class="wrap"><div class="sec-h"><div><div class="eyebrow" style="color:var(--on-dark-2)">EE brand</div><h2>Our own replacement parts, priced below the Sumner part</h2>
<p style="color:var(--on-dark-2)">Save on wear parts like rollers, casters, and load lines. EE brand parts fit the same as Sumner OEM.</p></div><a href="${BASE_PATH}/search.html?q=ee">Shop all ${stats.eeParts} EE brand parts</a></div>
<div class="grid-cards">${eeCompare.map(p => {
  const sumnerPart = data.products.find(s => s.part_number === p.replaces_part_number && s.vendor !== 'Energized Engines');
  return renderProductCard(p, sumnerPart);
}).join('')}</div></div></section>

<section class="trust"><div class="wrap trust-g"><div><svg viewBox="0 0 24 24"><path d="M2 6h12v10H2zM14 9h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg><b>Free ground shipping over $250</b><span>Lower 48. Free local delivery within 10 miles of Jersey Village, TX.</span></div>
<div><svg viewBox="0 0 24 24"><path d="M4 10h11a5 5 0 0 1 0 10h-3"/><path d="m8 6-4 4 4 4"/></svg><b>14-day returns</b><span>Customer pays return shipping plus a 20% restocking fee. See <a href="${BASE_PATH}/return-policy.html" style="color:inherit;text-decoration:underline">return policy</a>.</span></div>
<div><svg viewBox="0 0 24 24"><path d="M18 8h-3.3A7 7 0 0 0 5 8H2M18 16h-3.3A7 7 0 0 1 5 16H2M12 8v8"/></svg><b>Talk to a parts person</b><span>Call or text 832-444-5426 with your model and serial number.</span></div>
<div><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg><b>Demo checkout: no payment is taken</b><span>This is a test site. Shop at energizedengines.com for real orders.</span></div></div></section>

<section class="sec"><div class="wrap man-g"><div class="man-l"><div class="eyebrow">Manuals and diagrams</div><h2>Find the part on the exploded diagram</h2><p>Assembly diagrams and parts manuals from Sumner, linked directly from sumner.com.</p><a href="${BASE_PATH}/manuals.html" class="btn">Browse manuals and diagrams</a></div>
<div class="man-list">${manualsData.filter(m => m.manual_url && m.http_status === '200').slice(0, 4).map(m => `<a href="${m.manual_url}" target="_blank" rel="noopener" class="man-row"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
<div><div class="man-t">${m.manual_title}</div><div class="man-meta">Fits ${m.model} · Sumner PDF</div></div>${icons.chevronRight}</a>`).join('')}</div></div></section>

<section class="svc"><div class="wrap svc-g"><div><b>Lift rentals</b><span>Sumner 2118, 2124, 2412 and 2416. Daily, weekly or monthly.</span><a class="link" href="mailto:Sales@EnergizedEngines.com?subject=Lift%20rental">Ask about rentals</a></div>
<div><b>Winch rebuilds</b><span>Send us your Sumner winch and we rebuild it.</span><a class="link" href="mailto:Sales@EnergizedEngines.com?subject=Winch%20rebuild">Ask about a rebuild</a></div></div></section>
${getFooter().replace('</body></html>', '<script src="' + BASE_PATH + '/home.js"></script></body></html>')}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), html);
  console.log('✓ Built index.html');
}

function buildProductPage(product) {
  const partNumber = getPartNumber(product);
  const title = cleanTitle(product.title);
  const price = getPrice(product);
  const isEE = product.vendor === 'Energized Engines';
  const handle = product.handle || `product-${product.id}`;
  // Filter out 225x225 Sumner logo placeholder images
  const images = (product.images || []).filter(img => !(img.width === 225 && img.height === 225));
  const filteredModels = getFilteredModels(product);
  
  // Get diagram info
  const diagrams = diagramMap[partNumber] || [];
  const hasDiagram = diagrams.length > 0;
  
  // Build fits panel - show ALL badges from diagram map
  let fitsHtml = '';
  if (filteredModels.length > 0 || hasDiagram) {
    fitsHtml = `<div class="fitbox"><div class="fb-h"><h3>Fits these models</h3></div>`;
    
    if (filteredModels.length > 0) {
      // Group models by series
      const modelsBySeries = {};
      filteredModels.forEach(m => {
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
  
  // Build gallery with thumbnails for multi-image products
  let galleryHtml = '';
  if (images.length === 0) {
    galleryHtml = '<div class="gal"><div class="gal-main"><div style="color:var(--muted);text-align:center;padding:var(--s-12)">No photo yet</div></div></div>';
  } else if (images.length === 1) {
    // Single image: one column with full-size main image
    galleryHtml = `<div class="gal"><div class="gal-main"><img src="${images[0].src}" alt="${escapeHtml(title)}" loading="lazy" style="object-fit:contain;max-height:600px"></div></div>`;
  } else {
    // Multiple images: thumbnails + main image
    const thumbnails = images.map((img, i) => 
      `<button class="gal-thumb${i === 0 ? ' active' : ''}" onclick="document.querySelectorAll('.gal-thumb').forEach(t=>t.classList.remove('active'));this.classList.add('active');document.querySelector('.gal-main img').src='${img.src}'"><img src="${img.src}" alt="${escapeHtml(title)}" loading="lazy"></button>`
    ).join('');
    galleryHtml = `<div class="gal gal-multi"><div class="gal-thumbs">${thumbnails}</div><div class="gal-main"><img src="${images[0].src}" alt="${escapeHtml(title)}" loading="lazy" style="object-fit:contain;max-height:600px"></div></div>`;
  }
  
  // Format part number for display: "EE 1021" for EE products, plain for others
  const displayPartNumber = (isEE && partNumber) ? `EE ${partNumber}` : partNumber;
  
  // Get Sumner comparison data for EE parts
  let sumnerPartNum = null;
  let sumnerPrice = null;
  let savings = 0;
  let savingPercent = 0;
  
  if (isEE && product.title) {
    const sumnerMatch = product.title.match(/After Market Sumner (\d+)/i);
    if (sumnerMatch) {
      sumnerPartNum = sumnerMatch[1];
      const sumnerProduct = data.products?.find(p => 
        p.extracted_part_number === sumnerPartNum && p.vendor === 'Sumner'
      );
      if (sumnerProduct) {
        sumnerPrice = getPrice(sumnerProduct);
        if (sumnerPrice && price && sumnerPrice > price) {
          savings = sumnerPrice - price;
          savingPercent = Math.round((savings / sumnerPrice) * 100);
        }
      }
    }
  }
  
  const hasPositiveSavings = savingPercent > 0;
  
  // Build breadcrumb
  const breadcrumb = isEE 
    ? `<nav class="crumbs"><a href="${BASE_PATH}/">Home</a>${icons.chevronRight}<a href="${BASE_PATH}/ee-brand.html">EE house brand</a>${icons.chevronRight}<span>${displayPartNumber}</span></nav>`
    : `<nav class="crumbs"><a href="${BASE_PATH}/">Home</a>${icons.chevronRight}<span>${displayPartNumber || 'Product'}</span></nav>`;
  
  // Build EE comparison section
  let eeCompareHtml = '';
  if (isEE && sumnerPartNum) {
    eeCompareHtml = `<div class="ee-compare">
<div class="ee-chip"><span class="chip">Replacement for Sumner ${sumnerPartNum}</span></div>`;
    
    if (hasPositiveSavings && sumnerPrice) {
      eeCompareHtml += `<div class="ee-save-info">
<div><span class="muted-s">Sumner ${sumnerPartNum} is</span> <b>${formatPrice(sumnerPrice)}</b></div>
<div style="color:var(--green);font-weight:600;font-size:var(--fs-15)">You save $${savings.toFixed(2)} (${savingPercent}%)</div>
</div>
<table class="compare-table">
<thead><tr><th></th><th>Part number</th><th>Price</th></tr></thead>
<tbody>
<tr><td><b>EE brand</b></td><td class="mono">${partNumber}</td><td><b>${formatPrice(price)}</b></td></tr>
<tr><td>Sumner OEM</td><td class="mono">${sumnerPartNum}</td><td>${formatPrice(sumnerPrice)}</td></tr>
</tbody>
</table>`;
    }
    
    eeCompareHtml += `</div>`;
  }
  
  // Only show part number row if we have a part number
  const partNumberRow = partNumber ? 
    `<div class="pdp-pn"><span>Part number</span><b class="mono">${escapeHtml(displayPartNumber)}</b></div>` : '';
  
  const html = `${getHeader(title, '', 'pdp-page')}
<div class="wrap">${breadcrumb}
<div class="pdp-g">
${galleryHtml}
<div class="buy">
${hasDiagram ? `<div class="buy-tags"><span class="badge b-man">Diagram</span></div>` : ''}
<h1 class="pdp-t">${escapeHtml(title)}</h1>
${partNumberRow}
${eeCompareHtml}
<div class="pdp-price"><b class="num">${formatPrice(price) || 'Call for price'}</b></div>
<div class="stockbox"><div><span class="stock st-ok">In stock</span> <span class="muted-s">Ships from Jersey Village, TX</span></div></div>
<div class="atc"><div class="qty"><button onclick="const q=document.getElementById('productQty');q.textContent=Math.max(1,parseInt(q.textContent)-1)">−</button><span class="num" id="productQty">1</span><button onclick="const q=document.getElementById('productQty');q.textContent=parseInt(q.textContent)+1">+</button></div>
<button class="btn btn-pri" id="addToCartBtn" data-id="${product.id}" data-part-number="${escapeHtml(partNumber)}" data-name="${escapeHtml(title)}" data-price="${price}" data-image="${images[0]?.src || ''}">${icons.cart}Add to cart</button></div>
${fitsHtml}
<div class="pdp-help"><p style="margin:0 0 var(--s-2);color:var(--muted);font-size:var(--fs-14)">Not sure this fits your lift? Call or text us at <b style="color:var(--ink)">832-444-5426</b> with your model and serial number.</p></div>
<div class="mini-trust" style="display:flex;gap:var(--s-4);margin-top:var(--s-4);padding:var(--s-4);background:var(--bg-2);border-radius:var(--r-2);font-size:var(--fs-13)">
<div style="display:flex;align-items:center;gap:6px">${icons.truck}<span>Free shipping over $250</span></div>
<div style="display:flex;align-items:center;gap:6px">${icons.returns}<span><a href="${BASE_PATH}/return-policy.html" style="color:inherit;text-decoration:underline">14-day returns</a>. Customer pays return shipping plus a 20% restocking fee. See return policy.</span></div>
</div>
</div></div>
<div class="sticky-atc"><div><b class="num">${formatPrice(price) || 'Call for price'}</b><span class="stock st-ok">In stock</span></div>
<button class="btn btn-pri" onclick="document.getElementById('addToCartBtn').click()">Add to cart</button></div></div>
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
<p style="margin:var(--s-4) 0">${escapeHtml(REFUND_POLICY_TEXT.intro)}</p>
<p style="margin:var(--s-4) 0">${escapeHtml(REFUND_POLICY_TEXT.ineligible).replace(/\n/g, '<br><br>')}</p>
<p style="margin:var(--s-4) 0">${escapeHtml(REFUND_POLICY_TEXT.policy14day)}</p>
<p style="margin:var(--s-4) 0">${escapeHtml(REFUND_POLICY_TEXT.eligibility)}</p>
<p style="margin:var(--s-4) 0"><b>${REFUND_POLICY_TEXT.damages.split(' ')[0]}</b> ${escapeHtml(REFUND_POLICY_TEXT.damages.substring(REFUND_POLICY_TEXT.damages.indexOf(' ')))}</p>
<p style="margin:var(--s-4) 0"><b>${REFUND_POLICY_TEXT.exchanges.split(' ')[0]}</b> ${escapeHtml(REFUND_POLICY_TEXT.exchanges.substring(REFUND_POLICY_TEXT.exchanges.indexOf(' ')))}</p>
<p style="margin:var(--s-4) 0"><b>${REFUND_POLICY_TEXT.refunds.split(' ')[0]}</b> ${escapeHtml(REFUND_POLICY_TEXT.refunds.substring(REFUND_POLICY_TEXT.refunds.indexOf(' ')))}</p>
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
<style>
@media (min-width: 768px) {
  .cart-layout { display: grid; grid-template-columns: 1fr 400px; gap: var(--s-10); }
}
</style>
<div class="wrap" style="padding-top:var(--s-8);padding-bottom:var(--s-12)">
<h1>Shopping Cart</h1>
<div class="cart-layout" style="margin-top:var(--s-6)">
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
</div></div>
</div>
${getFooter()}`;
  
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
<div class="wrap srp-wrap">
<div class="srp-side"><h3>Filters</h3>
<div class="fg open"><div class="fg-h" onclick="this.parentElement.classList.toggle('open')"><b>Brand</b>${icons.chevronDown}</div>
<div class="fg-b"><label class="chk"><input type="checkbox" id="filterEE" value="ee"><span>EE brand</span></label>
<label class="chk"><input type="checkbox" id="filterSumner" value="sumner"><span>Sumner OEM</span></label></div></div>
<div class="fg open"><div class="fg-h" onclick="this.parentElement.classList.toggle('open')"><b>Photo</b>${icons.chevronDown}</div>
<div class="fg-b"><label class="chk"><input type="checkbox" id="filterPhoto" value="photo"><span>Has photo</span></label></div></div>
<div class="fg open"><div class="fg-h" onclick="this.parentElement.classList.toggle('open')"><b>Series</b>${icons.chevronDown}</div>
<div class="fg-b" id="seriesFilters"></div></div>
<button class="btn btn-sec btn-sm" onclick="clearFilters()" style="margin-top:var(--s-4);width:100%">Clear filters</button></div>
<div class="srp-main"><div class="srp-bar"><div id="searchCount"><h2>Loading...</h2></div><div class="srp-sort"><label class="sel sel-sm"><span>Sort</span><select id="sortSelect" class="selbox sm"><option value="relevance">Relevance</option><option value="price-asc">Price: Low to High</option><option value="price-desc">Price: High to Low</option><option value="part-number">Part Number</option></select></label></div></div>
<div id="searchResults"></div>
<button id="showMoreBtn" class="btn btn-sec" style="display:none;margin:var(--s-6) auto">Show more</button></div>
</div>
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'search.html'), html);
  console.log('✓ Built search.html');
}

function buildModelsIndexPage() {
  const html = `${getHeader('Shop by Model', 'models')}
<div class="wrap" style="padding:var(--s-8) 0">
<h1>Shop by Lift Model</h1>
<p style="margin:var(--s-4) 0;color:var(--ink-2)">Browse all ${MODEL_COUNT} Sumner lift models.</p>
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
    parts: data.products.map(p => {
      const pn = getPartNumber(p);
      const isEE = p.vendor === 'Energized Engines';
      // Filter out 225x225 placeholder
      const validImages = (p.images || []).filter(img => !(img.width === 225 && img.height === 225));
      // Format part number for display: "EE 1021" for EE products
      const displayPartNumber = (isEE && pn) ? `EE ${pn}` : pn;
      
      // Get Sumner price if EE part (same logic as renderProductCard)
      let oldPrice = null;
      if (isEE && p.title) {
        const sumnerMatch = p.title.match(/After Market Sumner (\d+)/i);
        if (sumnerMatch) {
          const sumnerPartNum = sumnerMatch[1];
          const sumnerProduct = data.products?.find(s => 
            s.extracted_part_number === sumnerPartNum && s.vendor === 'Sumner'
          );
          if (sumnerProduct) {
            const sumnerPrice = getPrice(sumnerProduct);
            const eePrice = getPrice(p);
            // Only set oldPrice if Sumner price is higher and savings >= 1%
            if (sumnerPrice && eePrice && sumnerPrice > eePrice) {
              const savingPercent = ((sumnerPrice - eePrice) / sumnerPrice) * 100;
              if (savingPercent >= 1) {
                oldPrice = sumnerPrice.toString();
              }
            }
          }
        }
      }
      
      return {
        id: p.id,
        partNumber: displayPartNumber,
        normalized_pn: pn.toString().replace(/[^A-Z0-9]/gi, '').toUpperCase(),
        name: p.title,
        price: (p.variants?.[0]?.price || 0).toString(),
        oldPrice: oldPrice,
        image: validImages[0]?.src || '',
        handle: p.handle || `product-${p.id}`,
        models: getFilteredModels(p),
        vendor: p.vendor
      };
    }),
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
${eeProducts.map(p => renderProductCard(p)).join('')}
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
${products.map(p => renderProductCard(p)).join('')}
</div>` : ''}
${products.length > 100 ? `<p style="text-align:center;margin:var(--s-6) 0;color:var(--muted)">Showing first 100 of ${products.length} parts</p>` : ''}
</div>
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'series', `${seriesKey}.html`), html);
  console.log(`✓ Built series/${seriesKey}.html (${products.length} parts)`);
}

