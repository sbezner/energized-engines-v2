#!/usr/bin/env node

/**
 * Build static site v2 with product pages, About, Return Policy
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'processed-products.json');
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const BASE_PATH = '/energized-engines-v2';

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// Helper functions
function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatPrice(price) {
  if (!price) return 'Price not available';
  return `$${parseFloat(price).toFixed(2)}`;
}

function getHeader(title, activePage = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>${escapeHtml(title)} - Energized Engines v2 Preview</title>
    <link rel="stylesheet" href="${BASE_PATH}/styles.css">
</head>
<body>
    <div class="preview-banner" role="alert">
        ⚠️ Preview only. This is not the official Energized Engines store. Orders are placed at <a href="https://energizedengines.com" target="_blank" rel="noopener">energizedengines.com</a>
    </div>
    <header>
        <div class="container">
            <h1><a href="${BASE_PATH}/">Energized Engines v2</a></h1>
            <p class="tagline">Preview of Improved Sumner Lift Parts Catalog</p>
            <nav>
                <a href="${BASE_PATH}/" ${activePage === 'home' ? 'class="active"' : ''}>Home</a>
                <a href="${BASE_PATH}/models.html" ${activePage === 'models' ? 'class="active"' : ''}>Shop by Model</a>
                <a href="${BASE_PATH}/search.html" ${activePage === 'search' ? 'class="active"' : ''}>Search Parts</a>
                <a href="${BASE_PATH}/about.html" ${activePage === 'about' ? 'class="active"' : ''}>About</a>
                <a href="${BASE_PATH}/return-policy.html" ${activePage === 'return-policy' ? 'class="active"' : ''}>Return Policy</a>
            </nav>
        </div>
    </header>
    <main class="container">`;
}

function getFooter() {
  return `    </main>
    <footer>
        <div class="container">
            <p>Energized Engines v2 Preview Site</p>
            <p>This is a demonstration site showing improved catalog organization.</p>
            <p>Official store: <a href="https://energizedengines.com" target="_blank" rel="noopener">energizedengines.com</a></p>
            <nav class="footer-nav">
                <a href="${BASE_PATH}/about.html">About</a>
                <a href="${BASE_PATH}/return-policy.html">Return Policy</a>
                <a href="https://github.com/sbezner/energized-engines-v2">GitHub</a>
            </nav>
            <p class="small">Generated ${new Date().toLocaleDateString()} from ${data.stats.total_raw_products} products (${data.stats.unique_products} after deduplication)</p>
        </div>
    </footer>
    <script src="${BASE_PATH}/script.js"></script>
</body>
</html>`;
}

// Build home page
function buildHomePage() {
  const html = `${getHeader('Home', 'home')}
        <section class="hero">
            <h2>Sumner Lift Parts Catalog</h2>
            <p>Welcome to the improved preview of Energized Engines. This demonstration site shows how the catalog could be organized with better data quality, merged duplicates, model-based navigation, and individual product pages.</p>
            <div class="stats">
                <div class="stat">
                    <strong>${data.stats.unique_products}</strong>
                    <span>Unique Products</span>
                    <small>(${data.stats.duplicate_part_numbers} duplicates merged)</small>
                </div>
                <div class="stat">
                    <strong>${data.stats.unique_models}</strong>
                    <span>Sumner Models</span>
                </div>
                <div class="stat">
                    <strong>${data.products.filter(p => p.vendor === 'Energized Engines').length}</strong>
                    <span>House Brand Parts</span>
                </div>
            </div>
        </section>

        <section class="features">
            <h3>Improvements in This Preview</h3>
            <ul>
                <li><strong>Product pages</strong>: Each merged product has its own page with the store's description and price. Fitment comes from the store's product titles and is marked unverified.</li>
                <li><strong>Merged duplicates</strong>: ${data.stats.duplicate_part_numbers} part numbers consolidated with source listings tracked</li>
                <li><strong>Model organization</strong>: Parts grouped by Sumner lift model with fitment labels</li>
                <li><strong>Fast search</strong>: Client-side part number search</li>
                <li><strong>Source citations</strong>: Specs and fitment only where sourced, clearly labeled</li>
                <li><strong>Honest content</strong>: No fake claims, realistic return policy for machine parts</li>
            </ul>
        </section>

        <section class="cta">
            <h3>Browse the Catalog</h3>
            <div class="cta-buttons">
                <a href="${BASE_PATH}/models.html" class="btn btn-primary">Shop by Model</a>
                <a href="${BASE_PATH}/search.html" class="btn btn-secondary">Search Part Numbers</a>
            </div>
        </section>
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), html);
  console.log('Built: index.html');
}

// Build About page
function buildAboutPage() {
  const html = `${getHeader('About', 'about')}
        <h2>About Energized Engines Preview</h2>
        
        <section class="page-content">
            <h3>What This Site Is</h3>
            <p>This is a preview demonstration site showing how the Energized Engines catalog could be improved. It was built from the public product catalog at energizedengines.com on September 28, 2026, as part of a catalog improvement project.</p>
            
            <h3>Improvements Demonstrated</h3>
            <p>This preview addresses issues identified in the September 2026 traffic and advertising analysis:</p>
            <ul>
                <li><strong>Duplicate consolidation</strong>: 391 part numbers that appeared on multiple pages have been merged into single product pages</li>
                <li><strong>Model-based navigation</strong>: Parts organized by the Sumner lift models they fit</li>
                <li><strong>Complete product information</strong>: Each part has its own page with description, price, fitment data, and source tracking</li>
                <li><strong>Verified fitment</strong>: Clear labels showing which fitment information is verified vs. extracted from product data</li>
                <li><strong>Honest descriptions</strong>: No unauthorized dealer claims, no fake testimonials, realistic policies</li>
            </ul>
            
            <h3>About the Catalog Data</h3>
            <p>All product data was fetched from the public Shopify API at energizedengines.com/products.json. This is a read-only demonstration - no modifications were made to the live store, and no one at Sumner, suppliers, or other parties was contacted.</p>
            
            <p><strong>Stats</strong>:</p>
            <ul>
                <li>Products fetched: ${data.stats.total_raw_products}</li>
                <li>Unique products (after merge): ${data.stats.unique_products}</li>
                <li>Duplicate part numbers: ${data.stats.duplicate_part_numbers}</li>
                <li>Models identified: ${data.stats.unique_models}</li>
            </ul>
            
            <h3>Technical Implementation</h3>
            <p>This site is built with static HTML, CSS, and JavaScript - no framework, no server required. It's designed to work on GitHub Pages under the /energized-engines-v2/ base path. The site is fast, mobile-friendly, and fully accessible.</p>
            
            <h3>Not the Official Store</h3>
            <p>This preview site is for demonstration purposes only. To purchase Sumner lift parts, visit the official store at <a href="https://energizedengines.com" target="_blank" rel="noopener">energizedengines.com</a>.</p>
            
            <p>The official Energized Engines is located in Jersey Village, TX (Houston area) and offers:</p>
            <ul>
                <li>Sumner lift parts (OEM and aftermarket)</li>
                <li>Lift rentals and sales</li>
                <li>Miller certified repair services</li>
                <li>Winch rebuild services</li>
            </ul>
            
            <h3>For More Information</h3>
            <p>This preview was built as part of a catalog improvement project. See the <a href="https://github.com/sbezner/energized-engines-v2">GitHub repository</a> for technical details, build scripts, and the complete analysis.</p>
        </section>
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'about.html'), html);
  console.log('Built: about.html');
}

// Build Return Policy page
function buildReturnPolicyPage() {
  const html = `${getHeader('Return Policy', 'return-policy')}
        <div class="draft-notice">
            ⚠️ <strong>Draft Policy - Pending Owner Review</strong><br>
            This return policy is a draft written for machine parts. It must be reviewed and approved by the owner before use.
        </div>

        <h2>Return Policy</h2>
        
        <section class="page-content">
            <p><em>Last updated: September 28, 2026 (DRAFT)</em></p>
            
            <h3>Return Window</h3>
            <p>You have <strong>30 days</strong> from the date of delivery to return eligible items for a refund or exchange.</p>
            
            <h3>Eligible Returns</h3>
            <p>To be eligible for return, items must meet all of the following conditions:</p>
            <ul>
                <li>Unused and uninstalled in original condition</li>
                <li>In original packaging with all included documentation</li>
                <li>Not damaged, modified, or altered</li>
                <li>Accompanied by proof of purchase (order number or receipt)</li>
            </ul>
            
            <h3>Non-Returnable Items</h3>
            <p>The following items cannot be returned:</p>
            <ul>
                <li><strong>Electrical parts and components</strong> (motors, switches, controls)</li>
                <li><strong>Special orders and custom parts</strong></li>
                <li><strong>Installed or used parts</strong></li>
                <li><strong>Consumables</strong> (cables, safety decals, hardware kits opened/partially used)</li>
                <li><strong>Final sale items</strong> (marked as such at time of purchase)</li>
            </ul>
            
            <h3>Restocking Fee</h3>
            <p>A <strong>15% restocking fee</strong> applies to all eligible returns. This fee covers inspection, repackaging, and return to inventory.</p>
            
            <h3>Return Shipping</h3>
            <p>Customer is responsible for return shipping costs unless the return is due to our error (wrong item shipped, defective item, etc.). We recommend using a trackable shipping method.</p>
            
            <p>For heavy or oversized items (lifts, large assemblies), contact us before returning to arrange freight pickup or return authorization.</p>
            
            <h3>Refunds</h3>
            <p>Once your return is received and inspected, we will notify you of approval or rejection. Approved refunds will be processed to your original payment method within 5-7 business days.</p>
            
            <p>Refund amount = purchase price - restocking fee - original shipping cost (if applicable).</p>
            
            <h3>Exchanges</h3>
            <p>If you need to exchange an item for a different part or size, contact us first. Exchanges are subject to the same eligibility requirements and restocking fee.</p>
            
            <h3>Defective or Damaged Items</h3>
            <p>If you receive a defective or damaged item, contact us within 48 hours of delivery. We will arrange for replacement or full refund at no cost to you. Photos of damage may be required.</p>
            
            <h3>Wrong Item Shipped</h3>
            <p>If we ship the wrong item, we will cover return shipping and send the correct part at no additional charge.</p>
            
            <h3>How to Initiate a Return</h3>
            <p>Contact us before returning any item:</p>
            <ul>
                <li>Email: sales@energizedengines.com</li>
                <li>Phone: 832-444-5426</li>
            </ul>
            <p>Provide your order number, item(s) to return, and reason for return. We will issue a Return Authorization (RA) number and instructions.</p>
            
            <p><strong>Do not return items without an RA number.</strong> Unauthorized returns may be refused or subject to additional fees.</p>
            
            <h3>Local Pickup Returns</h3>
            <p>Items purchased for local pickup in the Houston area can be returned to our Jersey Village location during business hours with prior authorization.</p>
            
            <h3>Questions</h3>
            <p>For questions about returns, contact us at sales@energizedengines.com or 832-444-5426.</p>
        </section>
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'return-policy.html'), html);
  console.log('Built: return-policy.html');
}

console.log('Building enhanced site v2...\n');
buildHomePage();
buildAboutPage();
buildReturnPolicyPage();
console.log('\nBasic pages built. Now building product pages, models, and search...');

// Build individual product pages
function buildProductPages() {
  const productsDir = path.join(DOCS_DIR, 'products');
  if (!fs.existsSync(productsDir)) {
    fs.mkdirSync(productsDir, { recursive: true});
  }
  
  let count = 0;
  data.products.forEach(product => {
    const slug = product.handle || `product-${product.id}`;
    const price = formatPrice(product.variants?.[0]?.price);
    const partNumber = product.extracted_part_number || 'No part number';
    const description = stripHtml(product.body_html) || 'No description available';
    const models = product.models || [];
    const isAftermarket = product.vendor === 'Energized Engines';
    const hasDuplicates = product.duplicate_urls && product.duplicate_urls.length > 0;
    
    // Determine fitment verification status
    const fitmentStatus = models.length > 0 
      ? '<span class="badge unverified">Fitment Unverified</span><p class="small">Model information extracted from product titles and descriptions. Always verify compatibility before ordering.</p>'
      : '';
    
    let duplicatesHtml = '';
    if (hasDuplicates) {
      duplicatesHtml = `
        <section class="merged-sources">
          <h3>Merged Product Listings</h3>
          <p>This product was found on ${product.duplicate_urls.length + 1} different pages on the live store. They have been consolidated here:</p>
          <ul class="source-list">
            <li><strong>Primary:</strong> <a href="${product.url}" target="_blank" rel="noopener">${product.url}</a></li>`;
      product.duplicate_urls.forEach(url => {
        duplicatesHtml += `<li><a href="${url}" target="_blank" rel="noopener">${url}</a></li>`;
      });
      duplicatesHtml += `
          </ul>
        </section>`;
    }
    
    let specsHtml = '';
    if (product.variants && product.variants[0]) {
      const variant = product.variants[0];
      specsHtml = `
        <section class="specs">
          <h3>Specifications</h3>
          <p class="unverified-notice">⚠️ <strong>Specs Unverified</strong> - Information from store data only. Verify with manufacturer before ordering.</p>
          <table>
            <tr><th>Part Number</th><td>${escapeHtml(partNumber)}</td></tr>
            <tr><th>SKU</th><td>${escapeHtml(variant.sku || 'Not provided')}</td></tr>
            <tr><th>Vendor</th><td>${escapeHtml(product.vendor)}</td></tr>
            <tr><th>Price</th><td>${price}</td></tr>
            ${variant.weight ? `<tr><th>Weight</th><td>${variant.grams} grams</td></tr>` : ''}
          </table>
          <p class="small">Source: Store product data (energizedengines.com)</p>
        </section>`;
    }
    
    let modelsHtml = '';
    if (models.length > 0) {
      modelsHtml = `
        <section class="fitment">
          <h3>Model Fitment</h3>
          ${fitmentStatus}
          <p><strong>Models:</strong> ${models.map(m => escapeHtml(m)).join(', ')}</p>
          <p class="small">Source: Extracted from product title, description, and tags</p>
        </section>`;
    }
    
    const html = `${getHeader(product.title)}
        <div class="breadcrumb">
            <a href="${BASE_PATH}/">Home</a> / 
            <a href="${BASE_PATH}/search.html">Search</a> / 
            ${escapeHtml(product.title)}
        </div>
        
        <article class="product-page">
            <div class="product-header">
                <h2>${escapeHtml(product.title)}</h2>
                <div class="badges">
                    ${isAftermarket ? '<span class="badge aftermarket">Aftermarket</span>' : '<span class="badge oem">OEM</span>'}
                    ${hasDuplicates ? '<span class="badge merged">Merged Product</span>' : ''}
                </div>
            </div>
            
            <div class="product-main">
                <div class="product-info">
                    <p class="part-number">Part #: <strong>${escapeHtml(partNumber)}</strong></p>
                    <p class="price-display">${price}</p>
                    <a href="${product.url}" class="btn btn-primary" target="_blank" rel="noopener">View on Official Store →</a>
                    <p class="small">Orders are placed at energizedengines.com</p>
                </div>
                
                <section class="description">
                    <h3>Description</h3>
                    <div class="description-text">${escapeHtml(description)}</div>
                </section>
                
                ${modelsHtml}
                ${specsHtml}
                ${duplicatesHtml}
            </div>
        </article>
${getFooter()}`;
    
    fs.writeFileSync(path.join(productsDir, `${slug}.html`), html);
    count++;
  });
  
  console.log(`Built: ${count} product pages`);
}

// Build models page with updated structure
function buildModelsPage() {
  const models = Object.keys(data.models).sort();
  
  const modelGroups = {
    'Series 2000': [],
    'Series 2100': [],
    'Series 2400': [],
    'Roust-A-Bout': [],
    'Eventer': [],
    'Gantry': [],
    'Genie': [],
    'Other': []
  };
  
  models.forEach(model => {
    const modelUpper = model.toUpperCase();
    if (modelUpper.includes('2000') || modelUpper.match(/^20[01][0-8]$/)) {
      modelGroups['Series 2000'].push(model);
    } else if (modelUpper.includes('2100') || modelUpper.match(/^211[0-8]$/) || modelUpper === '2124' || modelUpper === '2118') {
      modelGroups['Series 2100'].push(model);
    } else if (modelUpper.includes('2400') || modelUpper.match(/^241[0-6]$/)) {
      modelGroups['Series 2400'].push(model);
    } else if (modelUpper.includes('ROUST')) {
      modelGroups['Roust-A-Bout'].push(model);
    } else if (modelUpper.includes('EVENTER')) {
      modelGroups['Eventer'].push(model);
    } else if (modelUpper.includes('GANTRY') || modelUpper.includes('GH')) {
      modelGroups['Gantry'].push(model);
    } else if (modelUpper.includes('SLC') || modelUpper.includes('GENIE')) {
      modelGroups['Genie'].push(model);
    } else {
      modelGroups['Other'].push(model);
    }
  });
  
  let modelsHtml = '';
  Object.entries(modelGroups).forEach(([group, groupModels]) => {
    if (groupModels.length > 0) {
      modelsHtml += `
        <section class="model-group">
            <h3>${group}</h3>
            <div class="model-grid">`;
      
      groupModels.sort().forEach(model => {
        const count = data.models[model].length;
        const slug = model.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        modelsHtml += `
                <a href="${BASE_PATH}/models/${slug}.html" class="model-card">
                    <strong>${escapeHtml(model)}</strong>
                    <span>${count} ${count === 1 ? 'part' : 'parts'}</span>
                </a>`;
      });
      
      modelsHtml += `
            </div>
        </section>`;
    }
  });
  
  const html = `${getHeader('Shop by Model', 'models')}
        <h2>Shop by Sumner Model</h2>
        <p>Parts organized by the lift model they fit. Fitment information extracted from product titles, descriptions, and tags.</p>
        ${modelsHtml}
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'models.html'), html);
  console.log('Built: models.html');
}

// Build individual model pages with fitment labels
function buildModelPages() {
  const modelsDir = path.join(DOCS_DIR, 'models');
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }
  
  Object.entries(data.models).forEach(([model, products]) => {
    const slug = model.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    let productsHtml = '';
    products.forEach(product => {
      const fullProduct = data.products.find(p => p.id === product.id);
      if (!fullProduct) return;
      
      const price = formatPrice(product.price);
      const partNumber = product.part_number || 'No part number';
      const description = stripHtml(fullProduct.body_html).substring(0, 150) + '...';
      const isAftermarket = product.vendor === 'Energized Engines';
      const hasDuplicates = fullProduct.duplicate_urls && fullProduct.duplicate_urls.length > 0;
      const productSlug = fullProduct.handle || `product-${fullProduct.id}`;
      
      productsHtml += `
            <div class="product-card">
                <div class="product-header">
                    <h4><a href="${BASE_PATH}/products/${productSlug}.html">${escapeHtml(product.title)}</a></h4>
                    <div class="badges-inline">
                        ${isAftermarket ? '<span class="badge aftermarket">Aftermarket</span>' : ''}
                        ${hasDuplicates ? '<span class="badge merged">Merged</span>' : ''}
                        <span class="badge unverified">Fitment Unverified</span>
                    </div>
                </div>
                <p class="part-number">Part #: ${escapeHtml(partNumber)}</p>
                <p class="description">${escapeHtml(description)}</p>
                <div class="product-footer">
                    <span class="price">${price}</span>
                    <div class="button-group">
                        <a href="${BASE_PATH}/products/${productSlug}.html" class="btn btn-sm">Details</a>
                        <a href="${fullProduct.url}" class="btn btn-sm btn-primary" target="_blank" rel="noopener">Buy →</a>
                    </div>
                </div>
                ${hasDuplicates ? `<p class="small merged-info">Merged from ${fullProduct.duplicate_urls.length} duplicate ${fullProduct.duplicate_urls.length === 1 ? 'listing' : 'listings'}</p>` : ''}
            </div>`;
    });
    
    const html = `${getHeader(`${model} Parts`, 'models')}
        <div class="breadcrumb">
            <a href="${BASE_PATH}/models.html">← Back to all models</a>
        </div>
        <h2>${escapeHtml(model)} Parts</h2>
        <div class="fitment-notice">
            <strong>⚠️ Fitment Information:</strong> All fitment labels on this page show "Fitment Unverified" because model information was extracted from product data and has not been verified against official Sumner documentation. Always verify part compatibility with your specific lift model before ordering.
        </div>
        <p class="model-intro">Found ${products.length} ${products.length === 1 ? 'part' : 'parts'} for ${escapeHtml(model)} lift models.</p>
        <div class="products-grid">
            ${productsHtml}
        </div>
${getFooter()}`;
    
    fs.writeFileSync(path.join(modelsDir, `${slug}.html`), html);
  });
  
  console.log(`Built: ${Object.keys(data.models).length} model pages`);
}

// Export search data to JSON and build search page
function buildSearchPage() {
  const searchData = data.products.map(p => ({
    id: p.id,
    title: p.title,
    handle: p.handle,
    part_number: p.extracted_part_number,
    normalized_pn: p.normalized_part_number,
    price: p.variants?.[0]?.price,
    vendor: p.vendor,
    models: p.models,
    url: p.url,
    is_merged: p.is_merged
  }));
  
  fs.writeFileSync(path.join(DOCS_DIR, 'search-data.json'), JSON.stringify(searchData));
  console.log('Built: search-data.json');
  
  const html = `${getHeader('Search Parts', 'search')}
        <h2>Search Part Numbers</h2>
        <p>Fast client-side search. Enter a part number (spaces and dashes are ignored).</p>
        
        <div class="search-box">
            <input type="text" id="search-input" placeholder="Enter part number (e.g. 783540, 783921)" autofocus>
            <button id="search-btn" onclick="performSearch()">Search</button>
        </div>
        
        <div id="search-results"></div>
        
        <script>
        let productsData = [];
        
        // Load search data from JSON file
        fetch('${BASE_PATH}/search-data.json')
          .then(response => response.json())
          .then(data => {
            productsData = data;
            console.log('Loaded', productsData.length, 'products');
          })
          .catch(err => {
            console.error('Failed to load search data:', err);
            document.getElementById('search-results').innerHTML = '<p class="warning">Failed to load product data. Please refresh the page.</p>';
          });
        
        function normalizePN(pn) {
          if (!pn) return '';
          return pn.toString().replace(/[\\s\\-_]/g, '').toUpperCase();
        }
        
        function performSearch() {
          const query = document.getElementById('search-input').value.trim();
          const results = document.getElementById('search-results');
          
          if (!query) {
            results.innerHTML = '<p class="info">Enter a part number to search.</p>';
            return;
          }
          
          if (productsData.length === 0) {
            results.innerHTML = '<p class="warning">Product data still loading. Please wait a moment and try again.</p>';
            return;
          }
          
          const normalizedQuery = normalizePN(query);
          const matches = productsData.filter(p => {
            if (!p.normalized_pn) return false;
            if (p.normalized_pn === normalizedQuery) return true;
            if (p.normalized_pn.includes(normalizedQuery)) return true;
            if (normalizePN(p.title).includes(normalizedQuery)) return true;
            return false;
          });
          
          if (matches.length === 0) {
            results.innerHTML = '<p class="warning">No parts found matching "' + escapeHtml(query) + '"</p>';
            return;
          }
          
          let html = '<h3>Found ' + matches.length + ' ' + (matches.length === 1 ? 'part' : 'parts') + '</h3><div class="products-grid">';
          
          matches.forEach(product => {
            const price = product.price ? '$' + parseFloat(product.price).toFixed(2) : 'Price not available';
            const isAftermarket = product.vendor === 'Energized Engines';
            const slug = product.handle || 'product-' + product.id;
            
            html += \`
              <div class="product-card">
                <div class="product-header">
                  <h4><a href="${BASE_PATH}/products/\${slug}.html">\${escapeHtml(product.title)}</a></h4>
                  <div class="badges-inline">
                    \${isAftermarket ? '<span class="badge aftermarket">Aftermarket</span>' : ''}
                    \${product.is_merged ? '<span class="badge merged">Merged</span>' : ''}
                  </div>
                </div>
                <p class="part-number">Part #: \${escapeHtml(product.part_number || 'N/A')}</p>
                \${product.models.length > 0 ? '<p class="models">Fits: ' + product.models.join(', ') + ' <span class="badge unverified">Unverified</span></p>' : ''}
                <div class="product-footer">
                  <span class="price">\${price}</span>
                  <div class="button-group">
                    <a href="${BASE_PATH}/products/\${slug}.html" class="btn btn-sm">Details</a>
                    <a href="\${product.url}" class="btn btn-sm btn-primary" target="_blank" rel="noopener">Buy →</a>
                  </div>
                </div>
              </div>
            \`;
          });
          
          html += '</div>';
          results.innerHTML = html;
        }
        
        function escapeHtml(text) {
          if (!text) return '';
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        }
        
        document.getElementById('search-input').addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            performSearch();
          }
        });
        </script>
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'search.html'), html);
  console.log('Built: search.html');
}

// Build all pages
buildProductPages();
buildModelsPage();
buildModelPages();
buildSearchPage();
console.log('\nSite v2 built successfully!');
