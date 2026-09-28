#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MANUALS_DIR = path.join(__dirname, '..', 'temp', 'manuals');
const PRODUCTS_FILE = path.join(__dirname, '..', 'temp', 'sumner-products.json');
const DIAGRAM_MAP = path.join(__dirname, '..', 'notes', 'diagram-map.csv');
const MANUAL_ONLY_FILE = path.join(__dirname, '..', 'notes', 'manual-only-matches.csv');

const manuals = [
  { file: 'series-2000-diagram.pdf', title: 'Series 2000 Lift Assembly Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/11/Series-2000-Lift-Assembly-Exploded-Diagram.pdf', models: ['2010', '2015', '2020', '2025'] },
  { file: 'series-2000-short-diagram.pdf', title: 'Series 2000 Short Stack Lift Assembly Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2000-Short-Stack-Lift-Assembly-Exploded-Diagram.pdf', models: ['2012S'] },
  { file: 'series-2100-diagram.pdf', title: 'Series 2100 Lift Assembly Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2100-Lift-Assembly-Exploded-Diagram.pdf', models: ['2112', '2118', '2124'] },
  { file: 'series-2200-diagram.pdf', title: 'Series 2200 Lift Assembly Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/11/Series-2200-Lift-Assembly-Exploded-Diagram.pdf', models: ['2208', '2210'] },
  { file: 'series-2412-diagram.pdf', title: '2412 Series Lift Assembly', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/2412-Series-Lift-Assembly.pdf', models: ['2412', '2416'] },
  { file: 'series-2500-diagram.pdf', title: 'Series 2500 Lift Assembly Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/2010_Series2500Lift_diagrams.pdf', models: ['2512', '2515'] },
  { file: 'series-2600-diagram.pdf', title: 'Series 2600 Lift Assembly Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2600-Lift-Assembly-Exploded-Diagram.pdf', models: ['2615'] },
  { file: 'eventer-16-parts.pdf', title: 'Eventer 16 Parts Manual', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Eventer_16_Parts_Manual_10_11.pdf', models: ['EVENTER 16'] },
  { file: 'gantry-2ton-diagram.pdf', title: '2 Ton Gantry Assembly Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/2-Ton-Gantry-Assembly-Exploded-Diagram.pdf', models: ['GH2T'] },
  { file: 'series-1910-diagram.pdf', title: 'Sumner 1910 Series Lift Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Sumner-1910-Series-Lift-Exploded-Diagram.pdf', models: ['1908', '1910'] }
];

console.log('Loading Sumner products...');
const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
console.log(`Loaded ${products.length} Sumner products\n`);

const uniqueParts = new Set(products.map(p => p.part));
console.log(`Unique OEM Sumner part numbers: ${uniqueParts.size}\n`);

console.log('Extracting text from PDFs with page markers...\n');
const manualPages = {};

for (const manual of manuals) {
  const pdfPath = path.join(MANUALS_DIR, manual.file);
  if (!fs.existsSync(pdfPath)) {
    console.log(`  ✗ ${manual.file} not found`);
    continue;
  }
  
  console.log(`  Processing ${manual.file}...`);
  
  const textPath = pdfPath.replace('.pdf', '-pages.txt');
  try {
    execSync(`pdftotext -f 1 -layout "${pdfPath}" "${textPath}"`);
    const fullText = fs.readFileSync(textPath, 'utf8');
    const pages = fullText.split('\f');
    manual.pages = pages;
    manualPages[manual.file] = pages;
    console.log(`    Extracted ${pages.length} pages`);
  } catch (err) {
    console.log(`    Error: ${err.message}`);
  }
}

console.log('\nFinding part numbers in manuals with page numbers...\n');

const newConfirmations = [];
const manualOnlyMatches = [];
let checked = 0;
let foundCount = 0;

for (const product of products) {
  checked++;
  if (checked % 500 === 0) {
    console.log(`  Checked ${checked}/${products.length}...`);
  }
  
  const part = product.part;
  const productModels = (product.models || []).map(m => m.trim().toUpperCase());
  
  for (const manual of manuals) {
    if (!manual.pages) continue;
    
    for (let pageIdx = 0; pageIdx < manual.pages.length; pageIdx++) {
      const pageText = manual.pages[pageIdx];
      const pageNum = pageIdx + 1;
      
      if (pageText.includes(part)) {
        foundCount++;
        const manualModels = manual.models.map(m => m.trim().toUpperCase());
        const hasMatchingModel = productModels.some(pm => 
          manualModels.some(mm => pm.includes(mm) || mm.includes(pm))
        );
        
        if (hasMatchingModel) {
          const matchedModel = productModels.find(pm => 
            manualModels.some(mm => pm.includes(mm) || mm.includes(pm))
          );
          
          newConfirmations.push({
            part_number: part,
            model: matchedModel,
            manual_title: manual.title,
            manual_url: manual.url,
            page: pageNum,
            match_note: `Page ${pageNum}`,
            handle: product.handle
          });
        } else {
          manualOnlyMatches.push({
            part_number: part,
            product_handle: product.handle,
            product_models: product.models.join(', '),
            manual_title: manual.title,
            manual_models: manual.models.join(', '),
            page: pageNum
          });
        }
        
        break;
      }
    }
  }
}

console.log(`\nDone! Checked ${checked} products\n`);

const existingMap = [];
if (fs.existsSync(DIAGRAM_MAP)) {
  const lines = fs.readFileSync(DIAGRAM_MAP, 'utf8').split('\n');
  for (const line of lines) {
    if (line && !line.startsWith('part_number')) {
      existingMap.push(line);
    }
  }
}

const header = 'part_number,model,manual_title,manual_url,page,diagram_ref,match_note';
const newRows = newConfirmations.map(c => 
  `"${c.part_number}","${c.model}","${c.manual_title}","${c.manual_url}","${c.page}","","${c.match_note}"`
);

fs.writeFileSync(DIAGRAM_MAP, [header, ...existingMap, ...newRows].join('\n'));
console.log(`Updated diagram-map.csv with ${newRows.length} new confirmations`);

const manualOnlyHeader = 'part_number,product_handle,product_models,manual_title,manual_models,page';
const manualOnlyRows = manualOnlyMatches.map(m =>
  `"${m.part_number}","${m.product_handle}","${m.product_models}","${m.manual_title}","${m.manual_models}","${m.page}"`
);
fs.writeFileSync(MANUAL_ONLY_FILE, [manualOnlyHeader, ...manualOnlyRows].join('\n'));
console.log(`Created manual-only-matches.csv with ${manualOnlyRows.length} entries`);

console.log('\n=== STATISTICS ===');
console.log(`Products checked: ${checked}`);
console.log(`Unique Sumner OEM parts: ${uniqueParts.size}`);
console.log(`Found in manuals: ${new Set(newConfirmations.map(c => c.part_number)).size} parts`);
console.log(`Total confirmations added: ${newConfirmations.length}`);
console.log(`Manual-only matches: ${manualOnlyMatches.length}`);
console.log(`Not found: ${uniqueParts.size - new Set(newConfirmations.map(c => c.part_number)).size}`);
console.log('\n✓ Extraction complete!');
