#!/usr/bin/env node

/**
 * Build static site from processed catalog data
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'processed-products.json');
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const BASE_PATH = '/energized-engines-v2';

// Ensure docs directory exists
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// Helper to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper to strip HTML tags
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Helper to format price
function formatPrice(price) {
  if (!price) return 'Price not available';
  return `$${parseFloat(price).toFixed(2)}`;
}

// Generate common header with banner
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
            <p class="small">Generated ${new Date().toLocaleDateString()} from ${data.stats.total_raw_products} products (${data.stats.unique_products} after deduplication)</p>
        </div>
    </footer>
    <script src="${BASE_PATH}/script.js"></script>
</body>
</html>`;
}

// Generate home page
function buildHomePage() {
  const html = `${getHeader('Home', 'home')}
        <section class="hero">
            <h2>Sumner Lift Parts Catalog</h2>
            <p>Welcome to the improved preview of Energized Engines. This demonstration site shows how the catalog could be organized with better data quality, merged duplicates, and model-based navigation.</p>
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
                <li><strong>Merged duplicates:</strong> ${data.stats.duplicate_part_numbers} part numbers that appeared on multiple product pages have been consolidated</li>
                <li><strong>Model organization:</strong> Parts grouped by Sumner lift model (2118, 2124, 2412, R-150, etc.)</li>
                <li><strong>Fast search:</strong> Client-side part number search with fuzzy matching</li>
                <li><strong>Clean data:</strong> Extracted part numbers, identified models, linked duplicates</li>
                <li><strong>Honest descriptions:</strong> No fake claims or unauthorized dealer language</li>
            </ul>
        </section>

        <section class="cta">
            <h3>Browse the Catalog</h3>
            <div class="cta-buttons">
                <a href="${BASE_PATH}/models.html" class="btn btn-primary">Shop by Model</a>
                <a href="${BASE_PATH}/search.html" class="btn btn-secondary">Search Part Numbers</a>
            </div>
        </section>

        <section class="about">
            <h3>About This Preview</h3>
            <p>This site was built from the public product catalog at energizedengines.com. It demonstrates improvements suggested in the September 2026 traffic and advertising analysis:</p>
            <ul>
                <li>Read-only data collection (no modifications to the live store)</li>
                <li>Duplicate detection and merging based on part numbers</li>
                <li>Model extraction from titles, descriptions, and tags</li>
                <li>Clean, mobile-friendly static HTML</li>
            </ul>
            <p>For details, see <a href="https://github.com/sbezner/energized-engines-v2">the GitHub repository</a>.</p>
        </section>
${getFooter()}`;
  
  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), html);
  console.log('Built: index.html');
}

// Generate models page
function buildModelsPage() {
  const models = Object.keys(data.models).sort();
  
  // Normalize model names for better grouping
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

// Generate individual model pages
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
      const description = stripHtml(fullProduct.body_html).substring(0, 200) + '...';
      const isAftermarket = product.vendor === 'Energized Engines';
      const hasDuplicates = fullProduct.duplicate_urls && fullProduct.duplicate_urls.length > 0;
      
      productsHtml += `
            <div class="product-card">
                <div class="product-header">
                    <h4>${escapeHtml(product.title)}</h4>
                    ${isAftermarket ? '<span class="badge aftermarket">Aftermarket</span>' : ''}
                    ${hasDuplicates ? '<span class="badge merged">Merged</span>' : ''}
                </div>
                <p class="part-number">Part #: ${escapeHtml(partNumber)}</p>
                <p class="description">${escapeHtml(description)}</p>
                <div class="product-footer">
                    <span class="price">${price}</span>
                    <a href="${fullProduct.url}" class="btn btn-sm" target="_blank" rel="noopener">View on Store →</a>
                </div>
                ${hasDuplicates ? `<p class="small merged-info">Merged from ${fullProduct.duplicate_urls.length} duplicate ${fullProduct.duplicate_urls.length === 1 ? 'listing' : 'listings'}</p>` : ''}
            </div>`;
    });
    
    const html = `${getHeader(`${model} Parts`, 'models')}
        <div class="breadcrumb">
            <a href="${BASE_PATH}/models.html">← Back to all models</a>
        </div>
        <h2>${escapeHtml(model)} Parts</h2>
        <p class="model-intro">Found ${products.length} ${products.length === 1 ? 'part' : 'parts'} for ${escapeHtml(model)} lift models. <strong>Note:</strong> Fitment information is extracted from product data and may be unverified. Always verify compatibility before ordering.</p>
        <div class="products-grid">
            ${productsHtml}
        </div>
${getFooter()}`;
    
    fs.writeFileSync(path.join(modelsDir, `${slug}.html`), html);
  });
  
  console.log(`Built: ${Object.keys(data.models).length} model pages`);
}

// Generate search page
function buildSearchPage() {
  const html = `${getHeader('Search Parts', 'search')}
        <h2>Search Part Numbers</h2>
        <p>Fast client-side search. Enter a part number (spaces and dashes are ignored).</p>
        
        <div class="search-box">
            <input type="text" id="search-input" placeholder="Enter part number (e.g. 783540, 783921)" autofocus>
            <button id="search-btn" onclick="performSearch()">Search</button>
        </div>
        
        <div id="search-results"></div>
        
        <script>
        const products = ${JSON.stringify(data.products.map(p => ({
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
        })))};
        
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
          
          const normalizedQuery = normalizePN(query);
          const matches = products.filter(p => {
            if (!p.normalized_pn) return false;
            
            // Exact match
            if (p.normalized_pn === normalizedQuery) return true;
            
            // Partial match
            if (p.normalized_pn.includes(normalizedQuery)) return true;
            
            // Check if query is in title
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
            
            html += \`
              <div class="product-card">
                <div class="product-header">
                  <h4>\${escapeHtml(product.title)}</h4>
                  \${isAftermarket ? '<span class="badge aftermarket">Aftermarket</span>' : ''}
                  \${product.is_merged ? '<span class="badge merged">Merged</span>' : ''}
                </div>
                <p class="part-number">Part #: \${escapeHtml(product.part_number || 'N/A')}</p>
                \${product.models.length > 0 ? '<p class="models">Fits: ' + product.models.join(', ') + '</p>' : ''}
                <div class="product-footer">
                  <span class="price">\${price}</span>
                  <a href="\${product.url}" class="btn btn-sm" target="_blank" rel="noopener">View on Store →</a>
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
        
        // Allow Enter key to search
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
console.log('Building static site...\n');
buildHomePage();
buildModelsPage();
buildModelPages();
buildSearchPage();
console.log('\nSite built successfully!');
