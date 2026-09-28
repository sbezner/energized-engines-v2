const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// PDF manuals with their details
const MANUALS = [
  {
    path: 'temp/pdfs/Series-2000-Lift-Assembly-Exploded-Diagram.pdf',
    models: ['2010', '2015', '2020', '2025'],
    title: 'Series 2000 Lift Assembly Exploded Diagram',
    url: 'https://sumner.com/wp-content/uploads/sites/14/2025/11/Series-2000-Lift-Assembly-Exploded-Diagram.pdf'
  },
  {
    path: 'temp/pdfs/Series-2000-Short-Stack-Lift-Assembly-Exploded-Diagram.pdf',
    models: ['2012S'],
    title: 'Series 2000 Short Stack Lift Assembly Exploded Diagram',
    url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2000-Short-Stack-Lift-Assembly-Exploded-Diagram.pdf'
  },
  {
    path: 'temp/pdfs/Series-2100-Lift-Assembly-Exploded-Diagram.pdf',
    models: ['2112', '2118', '2124', '2112G', '2118G', '2124G'],
    title: 'Series 2100 Lift Assembly Exploded Diagram',
    url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2100-Lift-Assembly-Exploded-Diagram.pdf'
  },
  {
    path: 'temp/pdfs/Series-2200-Lift-Assembly-Exploded-Diagram.pdf',
    models: ['2208', '2210'],
    title: 'Series 2200 Lift Assembly Exploded Diagram',
    url: 'https://sumner.com/wp-content/uploads/sites/14/2025/11/Series-2200-Lift-Assembly-Exploded-Diagram.pdf'
  },
  {
    path: 'temp/pdfs/2412-Series-Lift-Assembly.pdf',
    models: ['2412', '2416', '2412G', '2416G'],
    title: '2412 Series Lift Assembly',
    url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/2412-Series-Lift-Assembly.pdf'
  },
  {
    path: 'temp/pdfs/Series-2600-Lift-Assembly-Exploded-Diagram.pdf',
    models: ['2615'],
    title: 'Series 2600 Lift Assembly Exploded Diagram',
    url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2600-Lift-Assembly-Exploded-Diagram.pdf'
  }
];

// Sumner part number pattern
const PART_NUMBER_PATTERN = /\b(7[0-9]{5}[A-Z]?)\b/g;

// Item/kit pattern
const ITEM_PATTERN = /ITEM\s+(?:NO\.?\s+)?(\d+)/i;
const KIT_PATTERN = /(\d+)\s+(?:KIT|ASSEMBLY)/i;

function getPageCount(pdfPath) {
  try {
    const output = execSync(`pdfinfo "${pdfPath}" 2>/dev/null | grep Pages`).toString();
    const match = output.match(/Pages:\s+(\d+)/);
    return match ? parseInt(match[1]) : 0;
  } catch (e) {
    return 0;
  }
}

function extractPageText(pdfPath, pageNum) {
  try {
    const output = execSync(`pdftotext -f ${pageNum} -l ${pageNum} "${pdfPath}" -`, {
      maxBuffer: 5 * 1024 * 1024
    });
    return output.toString();
  } catch (e) {
    return '';
  }
}

function extractPartNumbers(text) {
  const matches = text.match(PART_NUMBER_PATTERN) || [];
  return [...new Set(matches)];
}

function extractItemNumbers(text) {
  const items = new Set();
  
  // Look for ITEM NO patterns
  const itemMatches = text.matchAll(/ITEM\s+(?:NO\.?\s+)?(\d+)/gi);
  for (const match of itemMatches) {
    items.add(match[1]);
  }
  
  return [...items];
}

async function processManual(manual) {
  console.log(`\nProcessing: ${manual.title}`);
  
  if (!fs.existsSync(manual.path)) {
    console.log(`  PDF not found: ${manual.path}`);
    return [];
  }
  
  const pageCount = getPageCount(manual.path);
  console.log(`  Pages: ${pageCount}`);
  
  const diagramRows = [];
  const partToPage = new Map();
  const partToItem = new Map();
  
  // Extract text from each page
  for (let page = 1; page <= pageCount; page++) {
    const text = extractPageText(manual.path, page);
    const partNumbers = extractPartNumbers(text);
    const itemNumbers = extractItemNumbers(text);
    
    if (partNumbers.length > 0) {
      console.log(`  Page ${page}: ${partNumbers.length} part numbers`);
      
      // Map parts to this page
      partNumbers.forEach(pn => {
        if (!partToPage.has(pn)) {
          partToPage.set(pn, page);
        }
      });
      
      // Try to find item numbers for parts
      if (itemNumbers.length > 0) {
        // Simple heuristic: associate parts with items on same page
        // This is approximate but better than nothing
        const lines = text.split('\n');
        lines.forEach(line => {
          const partMatch = line.match(/\b(7[0-9]{5}[A-Z]?)\b/);
          const itemMatch = line.match(/(?:ITEM\s+(?:NO\.?\s+)?|^|\s)(\d{1,3})(?:\s|$)/);
          
          if (partMatch && itemMatch) {
            const part = partMatch[1];
            const item = itemMatch[1];
            if (!partToItem.has(part)) {
              partToItem.set(part, item);
            }
          }
        });
      }
    }
  }
  
  // Create diagram map rows
  manual.models.forEach(model => {
    partToPage.forEach((page, partNum) => {
      const itemRef = partToItem.get(partNum);
      diagramRows.push({
        part_number: partNum,
        model: model,
        manual_title: manual.title,
        manual_url: manual.url,
        page: page.toString(),
        diagram_ref: itemRef || '',
        match_note: `Page ${page}${itemRef ? `, Item ${itemRef}` : ''}`
      });
    });
  });
  
  console.log(`  Created ${diagramRows.length} diagram map rows`);
  return diagramRows;
}

async function main() {
  console.log('='.repeat(60));
  console.log('DIAGRAM PAGE NUMBER EXTRACTION');
  console.log('='.repeat(60));
  
  let allRows = [];
  const modelsWithManuals = new Set();
  
  for (const manual of MANUALS) {
    const rows = await processManual(manual);
    allRows.push(...rows);
    manual.models.forEach(m => modelsWithManuals.add(m));
  }
  
  // Write diagram-map.csv
  const diagramCsv = [
    'part_number,model,manual_title,manual_url,page,diagram_ref,match_note',
    ...allRows.map(row => 
      `"${row.part_number}","${row.model}","${row.manual_title}","${row.manual_url}","${row.page}","${row.diagram_ref}","${row.match_note}"`
    )
  ].join('\n');
  fs.writeFileSync('notes/diagram-map.csv', diagramCsv);
  
  // Get all models from data to compare
  const productsData = JSON.parse(fs.readFileSync('data/processed-products.json', 'utf8'));
  const allModels = Object.keys(productsData.models);
  const modelsWithoutManuals = allModels.filter(m => !modelsWithManuals.has(m) && !m.includes('UNKNOWN'));
  
  // Report
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('RESULTS');
  console.log('='.repeat(60));
  console.log(`\nTotal diagram-map rows with page numbers: ${allRows.length}`);
  console.log(`Unique part numbers mapped: ${new Set(allRows.map(r => r.part_number)).size}`);
  console.log(`\nModels with manuals (${modelsWithManuals.size}):`);
  [...modelsWithManuals].sort().forEach(m => console.log(`  - ${m}`));
  
  console.log(`\nModels without manuals (${modelsWithoutManuals.length}):`);
  if (modelsWithoutManuals.length > 0) {
    modelsWithoutManuals.sort().forEach(m => console.log(`  - ${m}`));
  } else {
    console.log(`  (None)`);
  }
}

main().catch(console.error);
