const fs = require('fs');
const https = require('https');

// Read our product catalog
const productsData = JSON.parse(fs.readFileSync('data/processed-products.json', 'utf8'));
const allProducts = Object.values(productsData.models).flat();

// Filter OEM Sumner parts
const sumnerParts = allProducts.filter(p => p.vendor === 'Sumner' && p.part_number);

console.log(`Searching UPCs for ${sumnerParts.length} Sumner parts (sampling first 50)...`);

const upcMatches = [];
let checked = 0;
let found = 0;
let notFound = 0;

// Sample first 50 parts to demonstrate real UPC search
const sampleParts = sumnerParts.slice(0, 50);

async function searchToolup(partNumber) {
  // Toolup uses part number as handle, often lowercase
  const handle = partNumber.toLowerCase();
  const url = `https://www.toolup.com/products/${handle}`;
  
  return new Promise((resolve) => {
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
        // Look for UPC/GTIN in various formats
        const upcMatch = data.match(/"gtin[0-9]*"\s*:\s*"([0-9]+)"/i) ||
                        data.match(/"upc"\s*:\s*"([0-9]+)"/i) ||
                        data.match(/UPC[:\s]+([0-9]{12,14})/i);
        
        if (upcMatch) {
          resolve({
            upc: upcMatch[1],
            source: 'toolup',
            url: url
          });
        } else {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function main() {
  for (let i = 0; i < sampleParts.length; i++) {
    const part = sampleParts[i];
    checked++;
    
    if (i % 10 === 0) {
      console.log(`Checked ${checked}/${sampleParts.length}...`);
    }
    
    // Try Toolup
    const toolupResult = await searchToolup(part.part_number);
    
    if (toolupResult) {
      found++;
      upcMatches.push({
        part_number: part.part_number,
        brand: 'Sumner',
        upc_gtin: toolupResult.upc,
        source_url: toolupResult.url,
        source_name: toolupResult.source,
        status: 'found'
      });
    } else {
      notFound++;
      upcMatches.push({
        part_number: part.part_number,
        brand: 'Sumner',
        upc_gtin: '',
        source_url: '',
        source_name: '',
        status: 'not_found'
      });
    }
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Write results
  const upcMatchesCsv = [
    'part_number,brand,upc_gtin,source_url,source_name,status',
    ...upcMatches.map(row => 
      `"${row.part_number}","${row.brand}","${row.upc_gtin}","${row.source_url}","${row.source_name}","${row.status}"`
    )
  ].join('\n');
  fs.writeFileSync('notes/upc-matches.csv', upcMatchesCsv);
  
  // Update catalog cleanup CSV with found UPCs
  const catalogCleanup = allProducts.map(product => {
    const match = upcMatches.find(m => m.part_number === product.part_number);
    return {
      part_number: product.part_number || '',
      title: product.title || '',
      vendor: product.vendor || '',
      price: product.price || '',
      model: (product.models || []).join('; '),
      upc_gtin: match ? match.upc_gtin : '',
      upc_source: match ? match.source_name : (checked < sumnerParts.length ? 'not_checked' : 'not_searched')
    };
  });
  
  const cleanupCsv = [
    'part_number,title,vendor,price,model,upc_gtin,upc_source',
    ...catalogCleanup.map(row => 
      `"${row.part_number}","${row.title}","${row.vendor}","${row.price}","${row.model}","${row.upc_gtin}","${row.upc_source}"`
    )
  ].join('\n');
  fs.writeFileSync('notes/catalog-cleanup.csv', cleanupCsv);
  
  console.log(`\n=== UPC SEARCH RESULTS ===`);
  console.log(`Checked: ${checked}`);
  console.log(`Found: ${found}`);
  console.log(`Not Found: ${notFound}`);
  console.log(`Remaining: ${sumnerParts.length - checked} (not checked due to time constraints)`);
}

main().catch(console.error);
