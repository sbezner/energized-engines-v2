#!/usr/bin/env node

/**
 * Build static site matching live energizedengines.com style
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'processed-products.json');
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const BASE_PATH = '/energized-engines-v2';
const MANUAL_SOURCES_FILE = path.join(__dirname, '..', 'notes', 'manual-sources.csv');
const DIAGRAM_MAP_FILE = path.join(__dirname, '..', 'notes', 'diagram-map.csv');

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
    const match = line.match(/^"([^"]+)","([^"]+)","([^"]+)","([^"]+)","([^"]+)","([^"]*)","([^"]*)"/);
    if (match) {
      const [, partNum, model, manualTitle, manualUrl, page, diagramRef, note] = match;
      if (!diagramMap[partNum]) diagramMap[partNum] = [];
      diagramMap[partNum].push({ model, manualTitle, manualUrl, page, diagramRef, note });
    }
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function stripHtml(html) {
  if (!html) return '';
  // P0-6: Decode entities before processing to avoid double-escaping
  const decoded = html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
  return decoded.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatPrice(price) {
  // P0-6: Handle $0.00 and missing prices
  if (!price || parseFloat(price) === 0) {
    return '<a href="tel:+18324445426" style="color: #b22234; text-decoration: none;" class="call-price">Call for price</a>';
  }
  return `$${parseFloat(price).toFixed(2)}`;
}

// Fix double-encoded UTF-8/cp1252 sequences
function cleanUTF8(text) {
  if (!text) return text;
  return text
    .replace(/â€™/g, "'")  // right single quote (longest first)
    .replace(/â€œ/g, '"')  // left double quote
    .replace(/â€\x9d/g, '"')  // right double quote with control char
    .replace(/â€\u201d/g, '—')  // em dash (â€ + U+201D right double quote)
    .replace(/â€\u201c/g, '–')  // en dash (â€ + U+201C left double quote)
    .replace(/â€"/g, '—')  // em dash fallback
    .replace(/â€"/g, '–')  // en dash fallback
    .replace(/â€¦/g, '…')  // ellipsis
    .replace(/â€/g, '"')   // bare right double quote (after longer patterns)
    .replace(/Â°/g, '°')   // degree symbol
    .replace(/Â(?=[\s\u00a0.,])/g, '')  // stray Â before space/punctuation
    .replace(/[\x80-\x9f]/g, '')  // control characters
    .replace(/Â /g, ' ')  // non-breaking space
    .replace(/Â+/g, ' ')  // any remaining Â sequences
    .trim();  // trim whitespace
}

function getHeader(title, activePage = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>${escapeHtml(title)} - Energized Engines</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@700&family=Questrial&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="${BASE_PATH}/styles.css">
</head>
<body>
    <div class="preview-banner" role="note">
        <span class="banner-desktop">⚠️ Preview only. This is not the official Energized Engines store. Orders are placed at <a href="https://energizedengines.com" target="_blank" rel="noopener">energizedengines.com</a></span>
        <span class="banner-mobile">⚠️ Preview only. Order at <a href="https://energizedengines.com" target="_blank" rel="noopener">energizedengines.com</a></span>
    </div>
    <header>
        <div class="container">
            <!-- P1-2: Mobile header with hamburger, centered logo, search icon -->
            <div class="header-mobile">
                <button class="hamburger-btn" aria-label="Menu" aria-expanded="false" aria-controls="mobileMenu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <a href="${BASE_PATH}/" class="logo-link-mobile">
                    <img src="${BASE_PATH}/logo.png" alt="Energized Engines" class="logo">
                </a>
                <button class="search-icon-btn" aria-label="Search" aria-expanded="false" aria-controls="mobileSearchRow">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2"/>
                        <path d="M12.5 12.5L17 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
            
            <!-- Desktop header (existing) -->
            <div class="header-desktop">
                <div class="header-content">
                    <a href="${BASE_PATH}/" class="logo-link">
                        <img src="${BASE_PATH}/logo.png" alt="Energized Engines" class="logo">
                    </a>
                    <div class="contact-info">
                        <a href="tel:+18324445426">832-444-5426</a>
                        <a href="mailto:Sales@EnergizedEngines.com">Sales@EnergizedEngines.com</a>
                    </div>
                </div>
                <nav>
                    <a href="${BASE_PATH}/" ${activePage === 'home' ? 'class="active"' : ''}>Home</a>
                    <a href="${BASE_PATH}/models.html" ${activePage === 'models' ? 'class="active"' : ''}>Parts by Model</a>
                    <a href="${BASE_PATH}/search.html" ${activePage === 'search' ? 'class="active"' : ''}>Search Parts</a>
                    <a href="${BASE_PATH}/about.html" ${activePage === 'about' ? 'class="active"' : ''}>About</a>
                    <a href="${BASE_PATH}/return-policy.html" ${activePage === 'return-policy' ? 'class="active"' : ''}>Returns</a>
                </nav>
            </div>
            
            <!-- Mobile menu drawer -->
            <div class="mobile-menu-backdrop" id="mobileMenuBackdrop"></div>
            <div class="mobile-menu" id="mobileMenu">
                <nav class="mobile-nav">
                    <a href="${BASE_PATH}/" ${activePage === 'home' ? 'class="active"' : ''}>Home</a>
                    <a href="${BASE_PATH}/models.html" ${activePage === 'models' ? 'class="active"' : ''}>Parts by Model</a>
                    <a href="${BASE_PATH}/search.html" ${activePage === 'search' ? 'class="active"' : ''}>Search Parts</a>
                    <a href="${BASE_PATH}/about.html" ${activePage === 'about' ? 'class="active"' : ''}>About</a>
                    <a href="${BASE_PATH}/return-policy.html" ${activePage === 'return-policy' ? 'class="active"' : ''}>Returns</a>
                    <div class="mobile-contact-pills">
                        <a href="tel:+18324445426" class="contact-pill">Call 832-444-5426</a>
                        <a href="mailto:Sales@EnergizedEngines.com" class="contact-pill">Email us</a>
                    </div>
                </nav>
            </div>
        </div>
    </header>
    <div class="mobile-search-row" id="mobileSearchRow">
        <form action="${BASE_PATH}/search.html" method="get">
            <input type="search" name="q" placeholder="Search parts..." aria-label="Search parts">
            <button type="submit">Search</button>
        </form>
    </div>
    <main class="container">`;
}

function getFooter() {
  return `    </main>
    <footer>
        <div class="container">
            <h3><a href="tel:+18324445426">832-444-5426</a></h3>
            <h3><a href="mailto:Sales@EnergizedEngines.com">Sales@EnergizedEngines.com</a></h3>
            <p>Call, Text or Email</p>
            <p>We offer free standard ground shipping on parts orders over $150 shipped within the contiguous U.S. (Lower 48 states).</p>
            <p>Free delivery on in-stock items to locations within 10 miles of Jersey Village, TX.</p>
            <p>20% restocking fee on eligible returns. See our <a href="${BASE_PATH}/return-policy.html">Return Policy</a> for details.</p>
            <p class="small">PLEASE NOTE: Not all parts are kept in stock. If you need expedited service, contact us to confirm availability.</p>
            <p class="small">Prices may adjust occasionally due to supplier increases. We work hard to keep our listings current - thank you for rolling with us!</p>
        </div>
    </footer>
    <script src="${BASE_PATH}/script.js"></script>
</body>
</html>`;
}

// Build home page
function buildHomePage() {
  const html = `${getHeader('Home', 'home')}
        <!-- P1-7: Hero with search -->
        <section class="hero">
            <h1>Sumner Lift Parts</h1>
            <p>OEM and aftermarket parts for Sumner material lifts, Roust-A-Bouts, and Eventer lifts.</p>
            <div class="hero-search">
                <form action="${BASE_PATH}/search.html" method="get" class="search-form">
                    <input type="text" name="q" placeholder="Search by part number or keyword..." aria-label="Search parts">
                    <button type="submit" class="btn btn-primary">Search</button>
                </form>
                <a href="${BASE_PATH}/models.html" class="hero-link">or shop by model</a>
            </div>
        </section>

        <section class="services">
            <div class="service-card">
                <h3>Parts</h3>
                <p>OEM Sumner parts and house-brand aftermarket replacement parts for all major models.</p>
                <a href="${BASE_PATH}/models.html" class="btn">Shop by model</a>
            </div>
            
            <!-- P1-7: Updated rental CTA -->
            <div class="service-card">
                <h3>Rentals</h3>
                <p>Sumner 2118, 2124, 2412, and 2416 lifts available for rent. Daily, weekly, or monthly rates.</p>
                <a href="mailto:Sales@EnergizedEngines.com?subject=Lift%20rental" class="btn btn-secondary">Email about rentals</a>
            </div>
            
            <!-- P1-7: Updated winch rebuild CTA -->
            <div class="service-card">
                <h3>Winch Rebuilds</h3>
                <p>We offer affordable winch rebuild services for Sumner winches.</p>
                <a href="mailto:Sales@EnergizedEngines.com?subject=Winch%20rebuild" class="btn btn-secondary">Ask about a rebuild</a>
            </div>
        </section>

        <!-- P1-7: Removed redundant find-parts section as search is now in hero -->
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), html);
  console.log('Built: index.html');
}

// Build About page
function buildAboutPage() {
  const html = `${getHeader('About', 'about')}
        <h1>About Sumner Lifts and Parts</h1>
        
        <section class="model-section">
            <h2>Sumner Roust-A-Bout Lifts</h2>
            <p>Heavy-duty, high load capacity and reach, used in industrial material handling and portable pipe lifting.</p>
            <p><strong>Models:</strong> Sumner R-100, Sumner R-150, Sumner R-180, Sumner R-250</p>
        </section>

        <section class="model-section">
            <h2>Sumner Series 2000 Material Lifts</h2>
            <p>General-purpose, various lift heights and load capacities, different base and wheel options. Also called a Duct Jack.</p>
            <p><strong>Models:</strong> Sumner 2010, Sumner 2015, Sumner 2020, Sumner 2025</p>
        </section>

        <section class="model-section">
            <h2>Series 2100 Contractor Lifts</h2>
            <p>Similar to 2400 series, various load capacities and heights, robust construction for heavy-duty use. Also called a Duct Jack.</p>
            <p><strong>Models:</strong> Sumner 2112, Sumner 2118, Sumner 2124</p>
        </section>

        <section class="model-section">
            <h2>Series 2400 Contractor Lifts</h2>
            <p>Versatile for construction, adjustable masts, durable and maneuverable. Also called a Duct Jack.</p>
            <p><strong>Models:</strong> Sumner 2412, Sumner 2416, Sumner 2420, Sumner 2424</p>
        </section>

        <section class="model-section">
            <h2>Eventer Lifts</h2>
            <p>Designed for entertainment venues and live events, easy transport and setup, safety features for public spaces. Also called an Entertainment Lift.</p>
            <p><strong>Models:</strong> Sumner Eventer 16, Sumner Eventer 20, Sumner Eventer 25</p>
        </section>
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'about.html'), html);
  console.log('Built: about.html');
}

console.log('Building site in live store style...\n');
buildHomePage();
buildAboutPage();
console.log('\nBasic pages built!');

// Build Return Policy page
function buildReturnPolicyPage() {
  const html = `${getHeader('Return Policy', 'return-policy')}
        <div class="draft-notice">
            ⚠️ <strong>Draft Policy - Pending Owner Review</strong><br>
            This return policy is a draft. It must be reviewed and approved by the owner before use.
        </div>

        <h1>Return Policy</h1>
        
        <section class="policy-content">
            <h2>Return Window</h2>
            <p>You have 30 days from delivery to return eligible items for a refund or exchange.</p>
            
            <h2>Eligible Returns</h2>
            <p>To be eligible for return, items must be:</p>
            <ul>
                <li>Unused and uninstalled in original condition</li>
                <li>In original packaging with all included documentation</li>
                <li>Not damaged, modified, or altered</li>
                <li>Accompanied by proof of purchase</li>
            </ul>
            
            <h2>Non-Returnable Items</h2>
            <p>The following items cannot be returned:</p>
            <ul>
                <li>Electrical parts and components</li>
                <li>Special orders and custom parts</li>
                <li>Installed or used parts</li>
                <li>Consumables (cables, safety decals, hardware kits opened or partially used)</li>
                <li>Items marked as final sale at time of purchase</li>
            </ul>
            
            <h2>Restocking Fee</h2>
            <p>A 20% restocking fee applies to all eligible returns. This covers inspection, repackaging, and return to inventory.</p>
            
            <h2>Return Shipping</h2>
            <p>Customer pays return shipping costs unless the return is due to our error (wrong item shipped, defective item). We recommend using a trackable shipping method.</p>
            
            <p>For heavy or oversized items (lifts, large assemblies), contact us before returning to arrange freight pickup or return authorization.</p>
            
            <h2>Refunds</h2>
            <p>Once your return is received and inspected, we will notify you of approval or rejection. Approved refunds are processed to your original payment method within 5-7 business days.</p>
            
            <p>Refund amount equals purchase price minus restocking fee minus original shipping cost (if applicable).</p>
            
            <h2>Defective or Damaged Items</h2>
            <p>If you receive a defective or damaged item, contact us within 48 hours of delivery. We will arrange for replacement or full refund at no cost to you. Photos of damage may be required.</p>
            
            <h2>How to Initiate a Return</h2>
            <p>Contact us before returning any item:</p>
            <ul>
                <li>Email: sales@energizedengines.com</li>
                <li>Phone: 832-444-5426</li>
            </ul>
            <p>Provide your order number, items to return, and reason for return. We will issue a Return Authorization (RA) number and instructions.</p>
            
            <p><strong>Do not return items without an RA number.</strong> Unauthorized returns may be refused or subject to additional fees.</p>
            
            <h2>Questions</h2>
            <p>For questions about returns, contact us at sales@energizedengines.com or 832-444-5426.</p>
        </section>
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'return-policy.html'), html);
  console.log('Built: return-policy.html');
}

// Build individual product pages
function buildProductPages() {
  const productsDir = path.join(DOCS_DIR, 'products');
  if (!fs.existsSync(productsDir)) {
    fs.mkdirSync(productsDir, { recursive: true });
  }
  
  let count = 0;
  data.products.forEach(product => {
    const slug = product.handle || `product-${product.id}`;
    const price = formatPrice(product.variants?.[0]?.price);
    const partNumber = product.extracted_part_number;
    const rawDescription = stripHtml(product.body_html);
    const description = rawDescription ? cleanUTF8(rawDescription) : null;
    // Deduplicate models (normalize case and spacing) and filter out EE part numbers
    const eePartNumbers = ['2001', '2003', '2004', '2005', '2017', '2021', 'EVENTER25'];
    const rawModels = product.models || [];
    const uniqueModels = [];
    const seenModels = new Set();
    rawModels.forEach(m => {
      const normalized = m.trim().toUpperCase().replace(/\s+/g, '');
      // Skip EE part numbers
      if (eePartNumbers.includes(m.trim().toUpperCase())) {
        return;
      }
      if (!seenModels.has(normalized)) {
        seenModels.add(normalized);
        uniqueModels.push(m);
      }
    });
    const models = uniqueModels;
    const isAftermarket = product.vendor === 'Energized Engines';
    const cleanTitle = cleanUTF8(product.title);
    
    // P2-3: Product images with performance optimizations
    let imageHtml = '';
    if (product.images && product.images.length > 0) {
      const primaryImage = product.images[0].src;
      const imageWidth = product.images[0].width || 600;
      const imageHeight = product.images[0].height || 600;
      
      // Check if it's the Sumner logo placeholder
      const isSumnerLogo = primaryImage && primaryImage.includes('Sumner_Logo');
      
      if (isSumnerLogo) {
        imageHtml = `
        <div class="product-images photo-placeholder">
          <div class="photo-coming-soon">
            Photo coming soon
          </div>
        </div>`;
      } else {
        // Build srcset for Shopify image variants
        const baseUrl = primaryImage.split('?')[0];
        const srcset = [400, 800, 1200].map(w => `${baseUrl}?width=${w} ${w}w`).join(', ');
        
        imageHtml = `
        <div class="product-images">
          <img 
            src="${primaryImage}" 
            srcset="${srcset}"
            sizes="(min-width: 769px) 45vw, 100vw"
            width="${imageWidth}"
            height="${imageHeight}"
            alt="${escapeHtml(cleanTitle)}" 
            loading="eager"
            fetchpriority="high"
            onerror="this.parentElement.innerHTML='<div class=&quot;photo-coming-soon&quot;>Photo coming soon</div>'">
        </div>`;
      }
    } else {
      // No images at all - show placeholder
      imageHtml = `
        <div class="product-images photo-placeholder">
          <div class="photo-coming-soon">
            Photo coming soon
          </div>
        </div>`;
    }
    
    // Check for diagram references
    let diagramHtml = '';
    const diagrams = diagramMap[partNumber];
    if (diagrams && diagrams.length > 0) {
      const diagramLinks = diagrams.map(d => 
        `<li>
          ${escapeHtml(d.model)}: 
          <a href="${d.manualUrl}" target="_blank" rel="noopener">
            ${escapeHtml(d.manualTitle)}, p. ${d.page}
            ${d.diagramRef ? `, Figure ${escapeHtml(d.diagramRef)}` : ''}
          </a>
          ${d.note ? `<br><span class="small">${escapeHtml(d.note)}</span>` : ''}
        </li>`
      ).join('');
      diagramHtml = `
        <section class="diagram-info">
          <h3>📐 Diagram References</h3>
          <ul class="diagram-list">${diagramLinks}</ul>
        </section>`;
    }
    
    // P2-3: Fitment panel with series-level matching
    // Series mapping: series number -> specific models in that series
    const seriesMap = {
      '2000': ['2010', '2015', '2020', '2025', '2012S'],
      '2100': ['2112', '2118', '2124', '2112G', '2118G', '2124G'],
      '2200': ['2208', '2210'],
      '2400': ['2412', '2416', '2412G', '2416G'],
      '2600': ['2615']
    };
    
    let fitmentHtml = '';
    const verifications = new Map(); // model -> {manual, url, page, diagramModels[]}
    
    if (diagrams && partNumber) {
      models.forEach(productModel => {
        // Check for exact match
        const exactMatch = diagrams.find(d => d.manualUrl && d.page && d.model === productModel);
        if (exactMatch) {
          verifications.set(productModel, {
            manual: exactMatch.manualTitle,
            url: exactMatch.manualUrl,
            page: exactMatch.page,
            diagramModels: [exactMatch.model],
            isSeries: false
          });
        }
        // Check for series-level match
        else if (seriesMap[productModel]) {
          const seriesModels = seriesMap[productModel];
          const seriesMatches = diagrams.filter(d => 
            d.manualUrl && d.page && seriesModels.includes(d.model)
          );
          
          if (seriesMatches.length > 0) {
            const match = seriesMatches[0];
            // Filter covered models to only those in the same manual as the match
            // Also exclude 2012S if citing the standard Series 2000 manual
            const isStandardSeries2000Manual = match.manualUrl && match.manualUrl.includes('Series-2000') && !match.manualUrl.includes('Short-Stack');
            const coveredModels = [...new Set(seriesMatches
              .filter(m => m.manualUrl === match.manualUrl)
              .filter(m => !(isStandardSeries2000Manual && m.model === '2012S'))
              .map(m => m.model))].sort();
            verifications.set(productModel, {
              manual: match.manualTitle,
              url: match.manualUrl,
              page: match.page,
              diagramModels: coveredModels,
              isSeries: true,
              seriesName: productModel
            });
          }
        }
      });
    }
    
    // Build per-model fitment display
    let fitmentLines = [];
    
    if (models.length === 0) {
      fitmentLines.push(`<p>Models not listed yet.</p>`);
    } else {
      // Show plain "Fits:" line with models
      fitmentLines.push(`<p><strong>Fits:</strong> ${models.map(m => escapeHtml(m)).join(', ')}</p>`);
      
      // Show verification badges only where verified
      models.forEach(model => {
        const verification = verifications.get(model);
        
        if (verification) {
          let citation = '';
          if (verification.isSeries) {
            citation = `<p><strong>${escapeHtml(model)}:</strong> <span class="fitment-flag fitment-flag--verified">✓ Listed in Series ${escapeHtml(verification.seriesName)} parts manual, p. ${verification.page}</span> <a href="${verification.url}" target="_blank" rel="noopener" class="fitment-verified-link">${escapeHtml(verification.manual)}</a></p>`;
          } else {
            citation = `<p><strong>${escapeHtml(model)}:</strong> <span class="fitment-flag fitment-flag--verified">✓ Verified in Sumner ${escapeHtml(model)} parts manual, p. ${verification.page}</span> <a href="${verification.url}" target="_blank" rel="noopener" class="fitment-verified-link">${escapeHtml(verification.manual)}</a></p>`;
          }
          fitmentLines.push(citation);
        }
      });
    }
    
    fitmentHtml = `
        <section class="fitment-info">
          ${fitmentLines.join('\n')}
        </section>`;
    
    // P2-3: Accurate breadcrumbs
    let breadcrumbPath = '';
    if (models.length > 0) {
      const firstModel = models[0];
      const modelSlug = firstModel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      breadcrumbPath = `<a href="${BASE_PATH}/models.html">Parts by Model</a> › <a href="${BASE_PATH}/models/${modelSlug}.html">Sumner ${escapeHtml(firstModel)}</a>`;
    } else {
      breadcrumbPath = `<a href="${BASE_PATH}/search.html">Search Parts</a>`;
    }
    
    const html = `${getHeader(cleanTitle)}
        <div class="breadcrumb">
            <a href="${BASE_PATH}/">Home</a> › ${breadcrumbPath} › ${escapeHtml(cleanTitle)}
        </div>
        
        <article class="product-page">
            <h1>${escapeHtml(cleanTitle)}</h1>
            
            <div class="product-layout">
                ${imageHtml}
                
                <div class="product-info-panel">
                    ${partNumber ? `<p class="part-number"><strong>Part Number:</strong> ${escapeHtml(partNumber)}</p>` : ''}
                    ${isAftermarket ? (() => { const m = (product.title || '').match(/\b7[78]\d{4}\b/); return m ? `<p class="replaces-note">Replaces Sumner ${escapeHtml(m[0])}</p>` : ''; })() : ''}
                    <p class="price-display">${price}</p>
                    ${isAftermarket ? '<p class="vendor-badge aftermarket-badge">Aftermarket Part</p>' : '<p class="vendor-badge oem-badge">OEM Part</p>'}
                    
                    <!-- P2-3: Button with www. to avoid redirect -->
                    <a href="https://www.energizedengines.com/products/${slug}" class="btn btn-primary">Buy on energizedengines.com</a>
                </div>
            </div>
            
            <!-- P2-3: Fitment above description -->
            ${fitmentHtml}
            
            ${diagramHtml}
            
            <!-- P2-3: Description without repeated "Orders are placed at..." -->
            ${description ? `<section class="description">
                <h3>Description</h3>
                <p>${escapeHtml(description)}</p>
            </section>` : ''}
        </article>
${getFooter()}`;
    
    fs.writeFileSync(path.join(productsDir, `${slug}.html`), html);
    count++;
  });
  
  console.log(`Built: ${count} product pages`);
}

// Build models index page
function buildModelsPage() {
  // Normalize model names case-insensitively to merge duplicates (including space removal)
  const normalizedModels = {};
  Object.keys(data.models).forEach(model => {
    const normalizedKey = model.trim().toUpperCase().replace(/\s+/g, '');
    if (!normalizedModels[normalizedKey]) {
      normalizedModels[normalizedKey] = {
        canonical: model,
        products: [],
        seen: new Set()
      };
    }
    // Deduplicate products by ID
    data.models[model].forEach(product => {
      if (!normalizedModels[normalizedKey].seen.has(product.id)) {
        normalizedModels[normalizedKey].seen.add(product.id);
        normalizedModels[normalizedKey].products.push(product);
      }
    });
  });
  
  // Use normalized data for grouping
  // Filter out EE part numbers that were parsed as models
  const eePartNumbers = ['2001', '2003', '2004', '2005', '2017', '2021', 'EVENTER25'];
  const models = Object.values(normalizedModels)
    .map(m => m.canonical)
    .filter(m => !eePartNumbers.includes(m.trim().toUpperCase()));
  
  // P2-1: Fixed model grouping with proper series organization
  const modelGroups = {
    'Series 2000': [],
    'Series 2100': [],
    'Series 2200': [],
    'Series 2400': [],
    'Series 2500': [],
    'Series 2600': [],
    'Roust-A-Bout (R-Series)': [],
    'Eventer Series': [],
    'Gantry': [],
    'Other Parts': [],  // Added for products not linked to model pages
    'Other': []
  };
  
  models.forEach(model => {
    const modelNorm = model.trim().toUpperCase();
    
    // Series 2000 - Full 2000 family: 2000, 2001-2018, 2020, 2024, 2025, etc.
    // Keep 2020 and 2025 in Series 2000 per user instruction
    if (modelNorm.match(/^20(0\d|1[0-8]|2[0-5]|24)[A-Z]?$/)) {
      modelGroups['Series 2000'].push(model);
    }
    // Series 2100 - Add 2100 exact match
    else if (modelNorm.match(/^21\d{2}[A-Z]?$/)) {
      modelGroups['Series 2100'].push(model);
    }
    // Series 2200
    else if (modelNorm.match(/^220[0-9][A-Z]?$/) || modelNorm.match(/^2208[A-Z]?$/) || modelNorm.match(/^2210[A-Z]?$/)) {
      modelGroups['Series 2200'].push(model);
    }
    // Series 2400 - only if data exists
    else if (modelNorm.match(/^241[0-9][A-Z]?$/) || modelNorm.match(/^2412[A-Z]?$/) || modelNorm.match(/^2416[A-Z]?$/)) {
      modelGroups['Series 2400'].push(model);
    }
    // Series 2500
    else if (modelNorm.match(/^25[01][0-9][A-Z]?$/)) {
      modelGroups['Series 2500'].push(model);
    }
    // Series 2600
    else if (modelNorm.match(/^26[01][0-9][A-Z]?$/)) {
      modelGroups['Series 2600'].push(model);
    }
    // Roust-A-Bout / R-series
    else if (modelNorm.includes('ROUST') || modelNorm.match(/^R-[0-9]+/)) {
      modelGroups['Roust-A-Bout (R-Series)'].push(model);
    }
    // Eventer
    else if (modelNorm.includes('EVENTER')) {
      modelGroups['Eventer Series'].push(model);
    }
    // Gantry
    else if (modelNorm.includes('GANTRY') || modelNorm.includes('GH')) {
      modelGroups['Gantry'].push(model);
    }
    // Everything else
    else {
      modelGroups['Other'].push(model);
    }
  });
  
  // Find products that only have EE part numbers as models (orphans)
  const orphanProducts = data.products.filter(product => {
    const productModels = product.models || [];
    if (productModels.length === 0) return false;
    // Check if all models are EE part numbers
    return productModels.every(m => eePartNumbers.includes(m.trim().toUpperCase()));
  });
  
  if (orphanProducts.length > 0) {
    modelGroups['Other Parts'].push('other-parts');
  }
  
  // P2-1: Build series jump chips
  const seriesChips = Object.entries(modelGroups)
    .filter(([group, models]) => models.length > 0)
    .map(([group]) => {
      const slug = group.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return `<a href="#${slug}" class="series-chip">${group}</a>`;
    })
    .join('');
  
  let modelsHtml = '';
  Object.entries(modelGroups).forEach(([group, groupModels]) => {
    if (groupModels.length > 0) {
      const slug = group.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      modelsHtml += `
        <section class="model-group" id="${slug}">
            <h2>${group}</h2>
            <div class="model-grid">`;
      
      groupModels.sort().forEach(model => {
        const modelNorm = model.trim().toUpperCase().replace(/\s+/g, '');
        let count, displayName;
        
        if (model === 'other-parts') {
          // Special case for Other Parts
          count = orphanProducts.length;
          displayName = 'Other Parts';
        } else {
          count = normalizedModels[modelNorm] ? normalizedModels[modelNorm].products.length : 0;
          displayName = model;
        }
        
        const modelSlug = model.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        modelsHtml += `
                <a href="${BASE_PATH}/models/${modelSlug}.html" class="model-card">
                    <strong>${escapeHtml(displayName)}</strong>
                    <span>${count} ${count === 1 ? 'part' : 'parts'}</span>
                </a>`;
      });
      
      modelsHtml += `
            </div>
        </section>`;
    }
  });
  
  const html = `${getHeader('Parts by Model', 'models')}
        <h1>Parts by Model</h1>
        
        <!-- P2-1: Series jump chips (sticky) -->
        <div class="series-chips">
            ${seriesChips}
        </div>
        
        <!-- P2-1: Inline model search -->
        <div class="model-search">
            <input type="text" id="modelSearchInput" placeholder="Search models..." aria-label="Search models">
        </div>
        
        <p>Select your Sumner lift model to browse parts.</p>
        <div id="modelGroupsContainer">
            ${modelsHtml}
        </div>
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'models.html'), html);
  console.log('Built: models.html');
}

// Build individual model pages
function buildModelPages() {
  const modelsDir = path.join(DOCS_DIR, 'models');
  // Clean the models directory before writing
  if (fs.existsSync(modelsDir)) {
    fs.rmSync(modelsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(modelsDir, { recursive: true });
  
  // Filter out EE part numbers before normalization
  const eePartNumbers = ['2001', '2003', '2004', '2005', '2017', '2021', 'EVENTER25'];
  
  // Normalize model names case-insensitively (including space removal)
  const normalizedModels = {};
  Object.keys(data.models).forEach(model => {
    // Skip EE part numbers
    if (eePartNumbers.includes(model.trim().toUpperCase())) {
      return;
    }
    
    const normalizedKey = model.trim().toUpperCase().replace(/\s+/g, '');
    if (!normalizedModels[normalizedKey]) {
      normalizedModels[normalizedKey] = {
        canonical: model,
        products: [],
        seen: new Set()
      };
    }
    // Deduplicate products by ID
    data.models[model].forEach(product => {
      if (!normalizedModels[normalizedKey].seen.has(product.id)) {
        normalizedModels[normalizedKey].seen.add(product.id);
        normalizedModels[normalizedKey].products.push(product);
      }
    });
  });
  
  Object.values(normalizedModels).forEach(({ canonical: model, products }) => {
    const slug = model.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Check for parts manual
    let manualHtml = '';
    const manual = manualSources[model] || manualSources[model.toUpperCase()] || 
                   manualSources[model.toLowerCase()];
    if (manual) {
      manualHtml = `
        <section class="manual-section">
          <h3>📘 Parts Manual</h3>
          <p><a href="${manual.url}" target="_blank" rel="noopener" class="btn btn-secondary">
            ${escapeHtml(manual.title)} (PDF)
          </a></p>
          <p class="small">Official Sumner parts manual and exploded diagrams</p>
        </section>`;
    }
    
    // Series mapping for model pages
    const seriesMap = {
      '2000': ['2010', '2015', '2020', '2025', '2012S'],
      '2100': ['2112', '2118', '2124', '2112G', '2118G', '2124G'],
      '2200': ['2208', '2210'],
      '2400': ['2412', '2416', '2412G', '2416G'],
      '2600': ['2615']
    };
    
    let productsHtml = '';
    products.forEach(product => {
      const fullProduct = data.products.find(p => p.id === product.id);
      if (!fullProduct) return;
      
      const price = formatPrice(product.price);
      const partNumber = product.part_number;
      const rawDesc = stripHtml(fullProduct.body_html);
      const description = rawDesc ? cleanUTF8(rawDesc).substring(0, 150) + '...' : null;
      const isAftermarket = product.vendor === 'Energized Engines';
      const productSlug = fullProduct.handle || `product-${fullProduct.id}`;
      const cleanTitle = cleanUTF8(product.title);
      
      // Extract models from title for "Fits:" line
      const modelMatches = cleanTitle.match(/\b(20\d{2}[A-Z]?|Eventer[- ]?\d+|R-?\d+|Roust[- ]?A[- ]?Bout|GH2T|Gantry|SLC[- ]?\d+)\b/gi);
      const fitsModels = modelMatches ? [...new Set(modelMatches)].join(', ') : model;
      let fitmentLine = `<p><strong>Fits:</strong> ${escapeHtml(fitsModels)}</p>`;
      
      // Check if this part is verified for this model
      if (diagramMap && partNumber && diagramMap[partNumber]) {
        const partDiagrams = diagramMap[partNumber];
        
        // Check for exact match first
        const exactMatch = partDiagrams.find(d => d.manualUrl && d.page && d.model === model);
        if (exactMatch) {
          fitmentLine += `<p><span class="fitment-flag fitment-flag--verified">✓ Verified in Sumner ${escapeHtml(model)} parts manual, p. ${exactMatch.page}</span> <a href="${exactMatch.manualUrl}" target="_blank" rel="noopener" class="fitment-verified-link">${escapeHtml(exactMatch.manualTitle)}</a></p>`;
        } 
        // Check for series-level match (model page IS a series like "2000" or "2100")
        else if (seriesMap[model]) {
          const seriesModels = seriesMap[model];
          const seriesMatch = partDiagrams.find(d => 
            d.manualUrl && d.page && seriesModels.includes(d.model)
          );
          if (seriesMatch) {
            fitmentLine += `<p><span class="fitment-flag fitment-flag--verified">✓ Listed in Series ${model} parts manual, p. ${seriesMatch.page}</span> <a href="${seriesMatch.manualUrl}" target="_blank" rel="noopener" class="fitment-verified-link">${escapeHtml(seriesMatch.manualTitle)}</a></p>`;
          }
        }
      }
      
      productsHtml += `
            <div class="product-card">
                <h3><a href="${BASE_PATH}/products/${productSlug}.html">${escapeHtml(cleanTitle)}</a></h3>
                ${isAftermarket ? '<span class="badge aftermarket">Aftermarket</span>' : '<span class="badge oem">OEM</span>'}
                ${partNumber ? `<p class="part-number">Part #: ${escapeHtml(partNumber)}</p>` : ''}
                ${fitmentLine}
                ${description ? `<p class="description">${escapeHtml(description)}</p>` : ''}
                <div class="product-footer">
                    <span class="price">${price}</span>
                    <a href="${BASE_PATH}/products/${productSlug}.html" class="btn btn-sm">Details</a>
                </div>
            </div>`;
    });
    
    const html = `${getHeader(`${model} Parts`, 'models')}
        <div class="breadcrumb">
            <a href="${BASE_PATH}/">Home</a> › 
            <a href="${BASE_PATH}/models.html">Parts by Model</a> › 
            Sumner ${escapeHtml(model)}
        </div>
        
        <!-- P2-2: Updated h1 and count line -->
        <h1>Sumner ${escapeHtml(model)} parts</h1>
        <p class="parts-count">${products.length} ${products.length === 1 ? 'part' : 'parts'}</p>
        
        ${manualHtml}
        
        <!-- P2-2: Filter input and OEM/Aftermarket toggle -->
        <div class="model-page-filters">
            <input type="text" id="filterPartsInput" placeholder="Filter these parts..." aria-label="Filter parts">
            <div class="vendor-toggle">
                <button class="toggle-btn active" data-filter="all">All</button>
                <button class="toggle-btn" data-filter="oem">OEM</button>
                <button class="toggle-btn" data-filter="aftermarket">Aftermarket</button>
            </div>
        </div>
        
        <div class="products-grid" id="productsGrid">
            ${productsHtml}
        </div>
${getFooter()}`;
    
    fs.writeFileSync(path.join(modelsDir, `${slug}.html`), html);
  });
  
  // Build Other Parts page for products with only EE part numbers
  const orphanProducts = data.products.filter(product => {
    const productModels = product.models || [];
    if (productModels.length === 0) return false;
    return productModels.every(m => eePartNumbers.includes(m.trim().toUpperCase()));
  });
  
  if (orphanProducts.length > 0) {
    let orphanHtml = '';
    orphanProducts.forEach(product => {
      const fullProduct = data.products.find(p => p.id === product.id);
      if (!fullProduct) return;
      
      const price = formatPrice(product.price);
      const isAftermarket = product.vendor === 'Energized Engines';
      const productSlug = fullProduct.handle || `product-${fullProduct.id}`;
      const cleanTitle = cleanUTF8(product.title);
      
      orphanHtml += `
          <div class="product-card">
              <h3><a href="${BASE_PATH}/products/${productSlug}.html">${escapeHtml(cleanTitle)}</a></h3>
              ${isAftermarket ? '<span class="badge aftermarket">Aftermarket</span>' : '<span class="badge oem">OEM</span>'}
              
              <div class="product-footer">
                  <span class="price">${price}</span>
                  <a href="${BASE_PATH}/products/${productSlug}.html" class="btn btn-sm">Details</a>
              </div>
          </div>`;
    });
    
    const otherPartsHtml = `${getHeader('Other Parts', 'models')}
        <div class="breadcrumb">
            <a href="${BASE_PATH}/">Home</a> › 
            <a href="${BASE_PATH}/models.html">Parts by Model</a> › 
            Other Parts
        </div>
        
        <h1>Other Parts</h1>
        <p class="parts-count">${orphanProducts.length} ${orphanProducts.length === 1 ? 'part' : 'parts'}</p>
        
        <p>Accessories and universal parts not specific to one model.</p>
        
        <div class="products-grid">
            ${orphanHtml}
        </div>
${getFooter()}`;
    
    fs.writeFileSync(path.join(modelsDir, 'other-parts.html'), otherPartsHtml);
  }
  
  console.log(`Built: ${Object.keys(data.models).length} model pages`);
}

// Build search page
function buildSearchPage() {
  // Series mapping for verification
  const seriesMap = {
    '2000': ['2010', '2015', '2020', '2025', '2012S'],
    '2100': ['2112', '2118', '2124', '2112G', '2118G', '2124G'],
    '2200': ['2208', '2210'],
    '2400': ['2412', '2416', '2412G', '2416G'],
    '2600': ['2615']
  };
  
  const searchData = data.products.map(p => {
    // Compute verified models for this product, split by exact vs series
    const exactVerified = [];
    const seriesListed = [];
    const partNumber = p.extracted_part_number;
    const models = p.models || [];
    
    if (diagramMap && partNumber && diagramMap[partNumber]) {
      const diagrams = diagramMap[partNumber];
      models.forEach(model => {
        // Check exact match
        const exactMatch = diagrams.find(d => d.manualUrl && d.page && d.model === model);
        if (exactMatch) {
          exactVerified.push(model);
        }
        // Check series match
        else if (seriesMap[model]) {
          const seriesModels = seriesMap[model];
          const seriesMatch = diagrams.find(d => 
            d.manualUrl && d.page && seriesModels.includes(d.model)
          );
          if (seriesMatch) {
            seriesListed.push(model);
          }
        }
      });
    }
    
    return {
      id: p.id,
      title: cleanUTF8(p.title),
      handle: p.handle,
      part_number: p.extracted_part_number,
      normalized_pn: p.normalized_part_number,
      price: p.variants?.[0]?.price,
      vendor: p.vendor,
      models: p.models,
      exact_verified: exactVerified,
      series_listed: seriesListed,
      url: p.url
    };
  });
  
  fs.writeFileSync(path.join(DOCS_DIR, 'search-data.json'), JSON.stringify(searchData));
  console.log('Wrote: search-data.json');
  
  const html = `${getHeader('Search Parts', 'search')}
        <h1>Search Part Numbers</h1>
        <p>Type a Sumner or EE part number.</p>
        
        <form role="search" class="search-box" id="search-form">
            <input type="search" id="search-input" placeholder="Enter part number (e.g. 783540)" aria-label="Part number">
            <button type="submit" id="search-btn" class="btn btn-primary">Search</button>
        </form>
        
        <div id="search-results"></div>
        
        <script>
        let productsData = [];
        let allMatches = [];
        let displayedCount = 0;
        const PAGE_SIZE = 24;
        
        document.addEventListener('DOMContentLoaded', function() {
          const searchForm = document.getElementById('search-form');
          if (searchForm) {
            searchForm.addEventListener('submit', function(e) {
              e.preventDefault();
              performSearch();
            });
          }
        });
        
        fetch('${BASE_PATH}/search-data.json')
          .then(response => response.json())
          .then(data => {
            productsData = data;
            const urlParams = new URLSearchParams(window.location.search);
            const q = urlParams.get('q');
            if (q) {
              document.getElementById('search-input').value = q;
              performSearch();
            }
          })
          .catch(err => {
            console.error('Failed to load search data:', err);
            document.getElementById('search-results').innerHTML = '<p class="warning">Failed to load product data. Please refresh the page.</p>';
          });
        
        function normalizePN(pn) {
          if (!pn) return '';
          return pn.toString().replace(/[\\s\\-_]/g, '').toUpperCase();
        }
        
        function performSearch(append = false) {
          const query = document.getElementById('search-input').value.trim();
          const results = document.getElementById('search-results');
          
          if (!append) {
            const url = new URL(window.location);
            if (query) {
              url.searchParams.set('q', query);
            } else {
              url.searchParams.delete('q');
            }
            history.replaceState({}, '', url);
          }
          
          if (!query || query.length < 2) {
            results.innerHTML = '<p class="info">Enter at least 2 characters to search.</p>';
            return;
          }
          
          if (productsData.length === 0) {
            results.innerHTML = '<p class="warning">Loading product data. Please wait and try again.</p>';
            return;
          }
          
          if (!append) {
            const normalizedQuery = normalizePN(query);
            const exact = [];
            const startsWith = [];
            const contains = [];
            const titleMatch = [];
            
            productsData.forEach(p => {
              const normalizedPN = p.normalized_pn || '';
              const normalizedTitle = normalizePN(p.title);
              if (normalizedPN && normalizedPN === normalizedQuery) {
                exact.push(p);
              } else if (normalizedPN && normalizedPN.startsWith(normalizedQuery)) {
                startsWith.push(p);
              } else if (normalizedPN && normalizedPN.includes(normalizedQuery)) {
                contains.push(p);
              } else if (normalizedTitle && normalizedTitle.includes(normalizedQuery)) {
                titleMatch.push(p);
              }
            });
            
            allMatches = [...exact, ...startsWith, ...contains, ...titleMatch];
            displayedCount = 0;
          }
          
          if (allMatches.length === 0) {
            results.innerHTML = \`
              <div class="search-empty-state">
                <p>No parts match "\${escapeHtml(query)}"</p>
                <p>Double-check spelling, try a different keyword, or <a href="${BASE_PATH}/models.html">browse by model</a>.</p>
                <div class="empty-state-actions">
                  <a href="tel:+18324445426" class="btn btn-primary">Call 832-444-5426</a>
                  <a href="${BASE_PATH}/models.html" class="btn btn-secondary">Shop by model</a>
                  <a href="https://www.energizedengines.com/pages/parts-manuals" class="btn btn-secondary">Parts Manuals</a>
                </div>
              </div>
            \`;
            return;
          }
          
          const nextBatch = allMatches.slice(displayedCount, displayedCount + PAGE_SIZE);
          displayedCount += nextBatch.length;
          
          let html = '';
          if (!append) {
            html += '<h2 class="search-count">' + allMatches.length + ' ' + (allMatches.length === 1 ? 'part matches' : 'parts match') + ' ' + escapeHtml(query) + '</h2>';
            html += '<div class="products-grid">';
          }
          
          nextBatch.forEach(product => {
            const price = (product.price && parseFloat(product.price) !== 0) 
              ? '$' + parseFloat(product.price).toFixed(2) 
              : '<a href="tel:+18324445426" class="call-price">Call for price</a>';
            const isAftermarket = product.vendor === 'Energized Engines';
            const slug = product.handle || 'product-' + product.id;
            let replacesLine = '';
            if (isAftermarket) {
              const sumnerMatch = (product.title || '').match(/\\b7[78]\\d{4}\\b/g);
              if (sumnerMatch) {
                replacesLine = \`<p class="replaces-note">Replaces Sumner \${sumnerMatch.map(n => escapeHtml(n)).join(', ')}</p>\`;
              }
            }
            
            const fitsModels = product.models ? product.models.join(', ') : '';
            let fitmentLabel = fitsModels ? '<p><strong>Fits:</strong> ' + escapeHtml(fitsModels) + '</p>' : '';
            
            if (product.exact_verified && product.exact_verified.length > 0) {
              const models = product.exact_verified.join(', ');
              fitmentLabel += '<p><span class="fitment-flag fitment-flag--verified">✓ Verified in Sumner ' + escapeHtml(models) + ' parts manual</span></p>';
            } else if (product.series_listed && product.series_listed.length > 0) {
              const hasBoth = product.series_listed.includes('2000') && product.series_listed.includes('2100');
              const series = hasBoth ? '2000 and 2100' : (product.series_listed.includes('2000') ? '2000' : '2100');
              fitmentLabel += '<p><span class="fitment-flag fitment-flag--verified">✓ Listed in Series ' + series + ' parts manual' + (hasBoth ? 's' : '') + '</span> see details</p>';
            }
            
            html += \`
              <div class="product-card">
                <h3><a href="${BASE_PATH}/products/\${slug}.html">\${escapeHtml(product.title)}</a></h3>
                \${isAftermarket ? '<span class="badge aftermarket">Aftermarket</span>' : '<span class="badge oem">OEM</span>'}
                \${product.part_number ? \`<p class="part-number">Part #: \${escapeHtml(product.part_number)}</p>\` : ''}
                \${replacesLine}
                \${fitmentLabel}
                <div class="product-footer">
                  <span class="price">\${price}</span>
                  <a href="${BASE_PATH}/products/\${slug}.html" class="btn btn-sm">Details</a>
                </div>
              </div>
            \`;
          });
          
          if (displayedCount < allMatches.length) {
            html += '</div>';
          } else {
            html += '</div>';
          }
          
          if (append) {
            const showMoreBtn = results.querySelector('.show-more-btn');
            if (showMoreBtn) showMoreBtn.remove();
            
            const firstNewCardIndex = displayedCount - PAGE_SIZE;
            
            results.querySelector('.products-grid').insertAdjacentHTML('beforeend', nextBatch.map(product => {
              const price = (product.price && parseFloat(product.price) !== 0)
                ? '$' + parseFloat(product.price).toFixed(2)
                : '<a href="tel:+18324445426" class="call-price">Call for price</a>';
              const isAftermarket = product.vendor === 'Energized Engines';
              const slug = product.handle || 'product-' + product.id;
              let replacesLine = '';
              if (isAftermarket) {
                const sumnerMatch = (product.title || '').match(/\\b7[78]\\d{4}\\b/g);
                if (sumnerMatch) {
                  replacesLine = \`<p class="replaces-note">Replaces Sumner \${sumnerMatch.map(n => escapeHtml(n)).join(', ')}</p>\`;
                }
              }
              const fitsModels = product.models ? product.models.join(', ') : '';
              let fitmentLabel = fitsModels ? '<p><strong>Fits:</strong> ' + escapeHtml(fitsModels) + '</p>' : '';
              
              if (product.exact_verified && product.exact_verified.length > 0) {
                const models = product.exact_verified.join(', ');
                fitmentLabel += '<p><span class="fitment-flag fitment-flag--verified">✓ Verified in Sumner ' + escapeHtml(models) + ' parts manual</span></p>';
              } else if (product.series_listed && product.series_listed.length > 0) {
                const hasBoth = product.series_listed.includes('2000') && product.series_listed.includes('2100');
                const series = hasBoth ? '2000 and 2100' : (product.series_listed.includes('2000') ? '2000' : '2100');
                fitmentLabel += '<p><span class="fitment-flag fitment-flag--verified">✓ Listed in Series ' + series + ' parts manual' + (hasBoth ? 's' : '') + '</span> see details</p>';
              }
              return \`
                <div class="product-card">
                  <h3><a href="${BASE_PATH}/products/\${slug}.html">\${escapeHtml(product.title)}</a></h3>
                  \${isAftermarket ? '<span class="badge aftermarket">Aftermarket</span>' : '<span class="badge oem">OEM</span>'}
                  \${product.part_number ? \`<p class="part-number">Part #: \${escapeHtml(product.part_number)}</p>\` : ''}
                  \${replacesLine}
                  \${fitmentLabel}
                  <div class="product-footer">
                    <span class="price">\${price}</span>
                    <a href="${BASE_PATH}/products/\${slug}.html" class="btn btn-sm">Details</a>
                  </div>
                </div>
              \`;
            }).join(''));
            if (displayedCount < allMatches.length) {
              const showMoreBtn = document.createElement('button');
              showMoreBtn.className = 'btn btn-secondary show-more-btn';
              showMoreBtn.textContent = 'Show more parts (' + (allMatches.length - displayedCount) + ' remaining)';
              showMoreBtn.addEventListener('click', function() {
                const currentFirstNew = displayedCount - PAGE_SIZE;
                performSearch(true);
                setTimeout(function() {
                  const cards = document.querySelectorAll('.products-grid .product-card');
                  if (cards[currentFirstNew]) {
                    cards[currentFirstNew].querySelector('a')?.focus();
                  }
                }, 100);
              });
              results.appendChild(showMoreBtn);
            }
          } else {
            results.innerHTML = html;
            if (displayedCount < allMatches.length) {
              const showMoreBtn = document.createElement('button');
              showMoreBtn.className = 'btn btn-secondary show-more-btn';
              showMoreBtn.textContent = 'Show more parts (' + (allMatches.length - displayedCount) + ' remaining)';
              showMoreBtn.addEventListener('click', function() {
                performSearch(true);
                setTimeout(function() {
                  const cards = document.querySelectorAll('.products-grid .product-card');
                  if (cards[PAGE_SIZE]) {
                    cards[PAGE_SIZE].querySelector('a')?.focus();
                  }
                }, 100);
              });
              results.appendChild(showMoreBtn);
            }
          }
        }
        
        function escapeHtml(text) {
          if (!text) return '';
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        }
        </script>
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'search.html'), html);
  console.log('Built: search.html');
}

// Build all pages
buildReturnPolicyPage();
buildProductPages();
buildModelsPage();
buildModelPages();
buildSearchPage();
console.log('\nSite built successfully in live store style!');
