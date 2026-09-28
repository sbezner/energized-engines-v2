const fs = require('fs');
const https = require('https');

// Load our catalog
const productsData = JSON.parse(fs.readFileSync('data/processed-products.json', 'utf8'));
const allProducts = Object.values(productsData.models).flat();

// Get OEM Sumner parts only
const sumnerParts = allProducts.filter(p => p.vendor === 'Sumner' && p.part_number);
const partLookup = new Map();
sumnerParts.forEach(p => partLookup.set(p.part_number, p));

console.log(`Processing ${sumnerParts.length} OEM Sumner parts...`);

const results = {
  checked: 0,
  found: 0,
  not_found: 0,
  conflict: 0,
  house_brand: 0
};

const upcMatches = [];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function fetchSumnerOutletProducts() {
  const products = [];
  let page = 1;
  
  while (true) {
    console.log(`Fetching Sumner Outlet products page ${page}...`);
    const url = `https://sumneroutlet.com/products.json?limit=250&page=${page}`;
    const data = await httpsGet(url);
    
    if (!data || !data.products || data.products.length === 0) {
      break;
    }
    
    products.push(...data.products);
    page++;
    await sleep(1000);
  }
  
  console.log(`Found ${products.length} total products on Sumner Outlet`);
  return products;
}

async function fetchProductDetails(handle) {
  const url = `https://sumneroutlet.com/products/${handle}.js`;
  const data = await httpsGet(url);
  return data;
}

function extractPartNumber(handle, title) {
  // Try to extract 6-digit Sumner part number from handle or title
  // Pattern: sumner-NNNNNN or just NNNNNN
  const handleMatch = handle.match(/sumner[_-]?(\d{6})/i);
  if (handleMatch) return handleMatch[1];
  
  const titleMatch = title.match(/sumner[_\s-]?(\d{6})/i);
  if (titleMatch) return titleMatch[1];
  
  // Try just 6 digits
  const sixDigits = handle.match(/(\d{6})/);
  if (sixDigits) return sixDigits[1];
  
  return null;
}

async function main() {
  // Fetch all Sumner Outlet products
  const outletProducts = await fetchSumnerOutletProducts();
  
  // Build a map of part number to outlet product
  const outletMap = new Map();
  outletProducts.forEach(p => {
    const partNum = extractPartNumber(p.handle, p.title);
    if (partNum) {
      outletMap.set(partNum, p);
    }
  });
  
  console.log(`\nMatched ${outletMap.size} part numbers from Sumner Outlet`);
  console.log(`\nProcessing ${sumnerParts.length} OEM parts from our catalog...\n`);
  
  // Process each part
  for (const part of sumnerParts) {
    results.checked++;
    
    if (results.checked % 50 === 0) {
      console.log(`Processed ${results.checked}/${sumnerParts.length}...`);
    }
    
    const outletProduct = outletMap.get(part.part_number);
    
    if (!outletProduct) {
      results.not_found++;
      upcMatches.push({
        part_number: part.part_number,
        brand: 'Sumner',
        upc_gtin: '',
        source_url: '',
        source_name: '',
        status: 'not_found'
      });
      continue;
    }
    
    // Fetch detailed product JSON to get barcode
    const details = await fetchProductDetails(outletProduct.handle);
    await sleep(1000); // Rate limit
    
    if (!details || !details.variants || details.variants.length === 0) {
      results.not_found++;
      upcMatches.push({
        part_number: part.part_number,
        brand: 'Sumner',
        upc_gtin: '',
        source_url: `https://sumneroutlet.com/products/${outletProduct.handle}.js`,
        source_name: 'Sumner Outlet',
        status: 'not_found'
      });
      continue;
    }
    
    // Get barcode from first variant
    const barcode = details.variants[0].barcode;
    
    if (!barcode || barcode === '') {
      results.not_found++;
      upcMatches.push({
        part_number: part.part_number,
        brand: 'Sumner',
        upc_gtin: '',
        source_url: `https://sumneroutlet.com/products/${outletProduct.handle}.js`,
        source_name: 'Sumner Outlet',
        status: 'not_found'
      });
      continue;
    }
    
    results.found++;
    upcMatches.push({
      part_number: part.part_number,
      brand: 'Sumner',
      upc_gtin: barcode,
      source_url: `https://sumneroutlet.com/products/${outletProduct.handle}.js`,
      source_name: 'Sumner Outlet',
      status: 'found'
    });
  }
  
  // Mark house brand parts
  const houseBrandParts = allProducts.filter(p => p.vendor === 'Energized Engines' && p.part_number);
  houseBrandParts.forEach(p => {
    results.house_brand++;
    upcMatches.push({
      part_number: p.part_number,
      brand: 'Energized Engines',
      upc_gtin: '',
      source_url: '',
      source_name: '',
      status: 'house_brand',
      note: 'needs GS1 codes'
    });
  });
  
  // Write UPC matches CSV
  const upcCsv = [
    'part_number,brand,upc_gtin,source_url,source_name,status,note',
    ...upcMatches.map(row => {
      const note = row.note || '';
      return `"${row.part_number}","${row.brand}","${row.upc_gtin}","${row.source_url}","${row.source_name}","${row.status}","${note}"`;
    })
  ].join('\n');
  fs.writeFileSync('notes/upc-matches.csv', upcCsv);
  
  // Update catalog cleanup CSV
  const catalogCleanup = allProducts.map(product => {
    const match = upcMatches.find(m => m.part_number === product.part_number);
    return {
      part_number: product.part_number || '',
      title: product.title || '',
      vendor: product.vendor || '',
      price: product.price || '',
      model: (product.models || []).join('; '),
      upc_gtin: match ? match.upc_gtin : '',
      upc_source: match ? match.source_name : ''
    };
  });
  
  const cleanupCsv = [
    'part_number,title,vendor,price,model,upc_gtin,upc_source',
    ...catalogCleanup.map(row => 
      `"${row.part_number}","${row.title}","${row.vendor}","${row.price}","${row.model}","${row.upc_gtin}","${row.upc_source}"`
    )
  ].join('\n');
  fs.writeFileSync('notes/catalog-cleanup.csv', cleanupCsv);
  
  // Report
  console.log(`\n\n=== UPC SEARCH RESULTS ===`);
  console.log(`OEM Parts Checked: ${results.checked}`);
  console.log(`Found: ${results.found}`);
  console.log(`Not Found: ${results.not_found}`);
  console.log(`Conflict: ${results.conflict}`);
  console.log(`House Brand: ${results.house_brand}`);
  console.log(`\nTotal rows in upc-matches.csv: ${upcMatches.length}`);
}

main().catch(console.error);
