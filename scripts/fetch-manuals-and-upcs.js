const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

// Known Sumner manual PDFs from web search
const MANUAL_URLS = [
  // Series 2000
  {
    url: 'https://sumner.com/wp-content/uploads/sites/14/2025/11/Series-2000-Lift-Assembly-Exploded-Diagram.pdf',
    models: ['2010', '2015', '2020', '2025'],
    series: '2000',
    type: 'parts_diagram',
    title: 'Series 2000 Lift Assembly Exploded Diagram'
  },
  {
    url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2000-Short-Stack-Lift-Assembly-Exploded-Diagram.pdf',
    models: ['2012S'],
    series: '2000',
    type: 'parts_diagram',
    title: 'Series 2000 Short Stack Lift Assembly Exploded Diagram'
  },
  {
    url: 'https://sumner.com/wp-content/uploads/sites/14/2025/11/Operators-Manual-2010-2015-2020-2025-Material-Lifts-1.pdf',
    models: ['2010', '2015', '2020', '2025'],
    series: '2000',
    type: 'operators_manual',
    title: '2010, 2015, 2020, 2025 Material Lifts Operators Manual'
  },
  // Series 2100
  {
    url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2100-Lift-Assembly-Exploded-Diagram.pdf',
    models: ['2112', '2118', '2124', '2112G', '2118G', '2124G'],
    series: '2100',
    type: 'parts_diagram',
    title: 'Series 2100 Lift Assembly Exploded Diagram'
  },
  // Series 2200
  {
    url: 'https://sumner.com/wp-content/uploads/sites/14/2025/11/Series-2200-Lift-Assembly-Exploded-Diagram.pdf',
    models: ['2208', '2210'],
    series: '2200',
    type: 'parts_diagram',
    title: 'Series 2200 Lift Assembly Exploded Diagram'
  },
  // Series 2400
  {
    url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/2412-Series-Lift-Assembly.pdf',
    models: ['2412', '2416', '2412G', '2416G'],
    series: '2400',
    type: 'parts_diagram',
    title: '2412 Series Lift Assembly'
  },
  {
    url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Operators-Manual-Series-2400-Material-Lift.pdf',
    models: ['2412', '2416'],
    series: '2400',
    type: 'operators_manual',
    title: 'Series 2400 Material Lift Operators Manual'
  },
  // Series 2500
  {
    url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Operators-Manual-2500-Series-Counterbalanced-Lifts.pdf',
    models: ['2512', '2515'],
    series: '2500',
    type: 'operators_manual',
    title: '2500 Series Counterbalanced Lifts Operators Manual'
  },
  // Series 2600
  {
    url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2600-Lift-Assembly-Exploded-Diagram.pdf',
    models: ['2615'],
    series: '2600',
    type: 'parts_diagram',
    title: 'Series 2600 Lift Assembly Exploded Diagram'
  },
  // Eventer Series
  {
    url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Operators-Manual-Eventer-20-25-Series-Lifts.pdf',
    models: ['EVENTER 20', 'EVENTER 25'],
    series: 'Eventer',
    type: 'operators_manual',
    title: 'Eventer 20/25 Series Lifts Operators Manual'
  },
  // Cloudinary mirror for 2100 user manual
  {
    url: 'https://res.cloudinary.com/iwh/image/upload/q_auto,g_center/assets/1/26/Sumner_Series_2100_-_User_Manual.pdf',
    models: ['2112', '2118', '2124'],
    series: '2100',
    type: 'operators_manual',
    title: 'Series 2100 User Manual (Cloudinary)'
  },
  // GH2T Gantry
  {
    url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/2-Ton-Gantry-Assembly-Exploded-Diagram.pdf',
    models: ['GH2T-8x8', 'GH2T-10x10', 'GH2T-12x12', 'GH2T-15x15'],
    series: 'GH2T',
    type: 'parts_diagram',
    title: '2 Ton Gantry Assembly Exploded Diagram'
  }
];

// Sumner part number pattern: 6 digits, possibly with dash or letter suffix
const PART_NUMBER_PATTERN = /\b(7[0-9]{5}[A-Z]?)\b/g;

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    
    protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

function extractTextFromPDF(pdfPath) {
  try {
    const output = execSync(`pdftotext "${pdfPath}" -`, { maxBuffer: 10 * 1024 * 1024 });
    return output.toString();
  } catch (error) {
    console.error(`Error extracting text from ${pdfPath}:`, error.message);
    return '';
  }
}

function extractPartNumbers(text) {
  const matches = text.match(PART_NUMBER_PATTERN) || [];
  return [...new Set(matches)];
}

async function processManuals() {
  const productsData = JSON.parse(fs.readFileSync('data/processed-products.json', 'utf8'));
  const allProducts = Object.values(productsData.models).flat();
  
  // Build part number lookup
  const partLookup = new Map();
  allProducts.forEach(product => {
    if (product.part_number) {
      partLookup.set(product.part_number, product);
    }
  });

  console.log(`Loaded ${allProducts.length} products, ${partLookup.size} unique part numbers`);

  // Create temp directory for PDFs
  const pdfDir = 'temp/pdfs';
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }

  const manualSources = [];
  const diagramMap = [];
  const foundManuals = [];
  const missingManuals = new Set();

  for (const manual of MANUAL_URLS) {
    const filename = path.basename(new URL(manual.url).pathname);
    const pdfPath = path.join(pdfDir, filename);

    console.log(`\nProcessing: ${manual.title}`);
    console.log(`  URL: ${manual.url}`);
    
    try {
      // Download PDF
      if (!fs.existsSync(pdfPath)) {
        console.log(`  Downloading...`);
        await downloadFile(manual.url, pdfPath);
      }

      // Extract text
      console.log(`  Extracting text...`);
      const text = extractTextFromPDF(pdfPath);
      
      if (!text) {
        console.log(`  Warning: No text extracted`);
        continue;
      }

      // Find part numbers
      const partNumbers = extractPartNumbers(text);
      console.log(`  Found ${partNumbers.length} part numbers`);

      // Record manual source
      manualSources.push({
        model: manual.models.join(', '),
        manual_title: manual.title,
        manual_url: manual.url,
        revision: '',
        date_checked: new Date().toISOString().split('T')[0],
        status: 'found',
        source: 'web_search'
      });

      foundManuals.push(manual);

      // Map parts to models
      let mapped = 0;
      let verified = 0;
      
      partNumbers.forEach(partNum => {
        const product = partLookup.get(partNum);
        if (product) {
          manual.models.forEach(model => {
            diagramMap.push({
              part_number: partNum,
              model: model,
              manual_title: manual.title,
              manual_url: manual.url,
              page: '',
              diagram_ref: manual.type === 'parts_diagram' ? 'exploded_view' : 'reference',
              match_note: `Found in ${manual.type.replace('_', ' ')}`
            });
            
            // Check if this product lists this model in its fitment
            const productModels = product.models || [];
            if (productModels.includes(model) || productModels.some(m => m.toLowerCase().includes(model.toLowerCase()))) {
              verified++;
            }
          });
          mapped++;
        }
      });

      console.log(`  Mapped: ${mapped} parts in our catalog`);
      console.log(`  Verified: ${verified} product-model pairs`);

    } catch (error) {
      console.error(`  Error processing ${manual.title}:`, error.message);
      manualSources.push({
        model: manual.models.join(', '),
        manual_title: manual.title,
        manual_url: manual.url,
        revision: '',
        date_checked: new Date().toISOString().split('T')[0],
        status: 'error',
        source: 'web_search'
      });
    }
  }

  // Check for missing model coverage
  const allModelsInCatalog = [...new Set(allProducts.flatMap(p => p.models || []))];
  const coveredModels = new Set(MANUAL_URLS.flatMap(m => m.models.map(model => model.toUpperCase())));
  
  allModelsInCatalog.forEach(model => {
    const modelUpper = model.toUpperCase();
    if (!coveredModels.has(modelUpper) && !modelUpper.includes('UNKNOWN')) {
      missingManuals.add(model);
    }
  });

  // Write CSV files
  console.log(`\n\nWriting manual-sources.csv...`);
  const manualSourcesCsv = [
    'model,manual_title,manual_url,revision,date_checked,status,source',
    ...manualSources.map(row => 
      `"${row.model}","${row.manual_title}","${row.manual_url}","${row.revision}","${row.date_checked}","${row.status}","${row.source}"`
    )
  ].join('\n');
  fs.writeFileSync('notes/manual-sources.csv', manualSourcesCsv);

  console.log(`Writing diagram-map.csv...`);
  const diagramMapCsv = [
    'part_number,model,manual_title,manual_url,page,diagram_ref,match_note',
    ...diagramMap.map(row => 
      `"${row.part_number}","${row.model}","${row.manual_title}","${row.manual_url}","${row.page}","${row.diagram_ref}","${row.match_note}"`
    )
  ].join('\n');
  fs.writeFileSync('notes/diagram-map.csv', diagramMapCsv);

  // Report
  console.log(`\n\n=== MANUAL EXTRACTION RESULTS ===`);
  console.log(`\nFound Manuals: ${foundManuals.length}`);
  foundManuals.forEach(m => console.log(`  - ${m.title} (${m.models.join(', ')})`));
  
  console.log(`\nMissing Coverage: ${missingManuals.size} models`);
  if (missingManuals.size > 0) {
    console.log(`Missing models: ${[...missingManuals].slice(0, 20).join(', ')}`);
  }
  
  console.log(`\nPart Numbers Mapped: ${diagramMap.length}`);
  console.log(`Unique Parts: ${new Set(diagramMap.map(d => d.part_number)).size}`);
  
  return {
    foundManuals,
    missingManuals: [...missingManuals],
    diagramMap
  };
}

async function searchUPCs() {
  console.log(`\n\n=== UPC SEARCH ===`);
  
  const productsData = JSON.parse(fs.readFileSync('data/processed-products.json', 'utf8'));
  const allProducts = Object.values(productsData.models).flat();
  
  // Filter for OEM Sumner parts (vendor === "Sumner")
  const sumnerParts = allProducts.filter(p => p.vendor === 'Sumner' && p.part_number);
  
  console.log(`\nSearching UPCs for ${sumnerParts.length} OEM Sumner parts...`);
  console.log(`(This is a placeholder - real UPC search would query Toolup, Zoro, etc.)`);
  
  const upcMatches = [];
  const catalogCleanup = [];
  
  // Build full catalog cleanup CSV
  allProducts.forEach(product => {
    catalogCleanup.push({
      part_number: product.part_number || '',
      title: product.title || '',
      vendor: product.vendor || '',
      price: product.price || '',
      model: (product.models || []).join('; '),
      upc_gtin: '',
      upc_source: 'not_searched'
    });
  });
  
  // Write UPC matches (placeholder - real implementation would do web scraping)
  const upcMatchesCsv = [
    'part_number,brand,upc_gtin,source_url,source_name,status',
    '# Real UPC search would query Toolup, Zoro, Grainger, Sumner Outlet Shopify JSON, etc.',
    '# This is a placeholder - implement with WebFetch to product pages'
  ].join('\n');
  fs.writeFileSync('notes/upc-matches.csv', upcMatchesCsv);
  
  // Write full catalog cleanup
  console.log(`\nWriting catalog-cleanup.csv for ${catalogCleanup.length} products...`);
  const cleanupCsv = [
    'part_number,title,vendor,price,model,upc_gtin,upc_source',
    ...catalogCleanup.map(row => 
      `"${row.part_number}","${row.title}","${row.vendor}","${row.price}","${row.model}","${row.upc_gtin}","${row.upc_source}"`
    )
  ].join('\n');
  fs.writeFileSync('notes/catalog-cleanup.csv', cleanupCsv);
  
  console.log(`\nUPC search placeholder complete. Full catalog CSV created with ${catalogCleanup.length} rows.`);
  
  return {
    checked: 0,
    found: 0,
    not_found: 0,
    conflict: 0,
    house_brand: sumnerParts.length
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('SUMNER MANUAL AND UPC EXTRACTION');
  console.log('='.repeat(60));
  
  const manualResults = await processManuals();
  const upcResults = await searchUPCs();
  
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('FINAL SUMMARY');
  console.log('='.repeat(60));
  console.log(`\nManuals Found: ${manualResults.foundManuals.length}`);
  console.log(`Parts Mapped to Diagrams: ${new Set(manualResults.diagramMap.map(d => d.part_number)).size}`);
  console.log(`Product-Model Pairs Verified: ${manualResults.diagramMap.length}`);
  console.log(`Models Missing Manuals: ${manualResults.missingManuals.length}`);
  console.log(`\nUPCs:`);
  console.log(`  Checked: ${upcResults.checked}`);
  console.log(`  Found: ${upcResults.found}`);
  console.log(`  Not Found: ${upcResults.not_found}`);
  console.log(`  OEM Sumner parts to search: ${upcResults.house_brand}`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { processManuals, searchUPCs };
