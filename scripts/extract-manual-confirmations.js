#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MANUALS_DIR = path.join(__dirname, '..', 'temp', 'manuals');
const PRODUCTS_FILE = path.join(__dirname, '..', 'temp', 'sumner-products.json');
const DIAGRAM_MAP = path.join(__dirname, '..', 'notes', 'diagram-map.csv');
const MANUAL_ONLY_FILE = path.join(__dirname, '..', 'notes', 'manual-only-matches.csv');
const CONFLICTS_FILE = path.join(__dirname, '..', 'notes', 'fitment-conflicts.csv');
const NOT_IN_CLAIMED_FILE = path.join(__dirname, '..', 'notes', 'not-in-claimed-manual.csv');

const manuals = [
  { file: 'series-2000-diagram.pdf', title: 'Series 2000 Lift Assembly Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/11/Series-2000-Lift-Assembly-Exploded-Diagram.pdf', models: ['2010', '2015', '2020', '2025'], family: '2000' },
  { file: 'series-2000-short-diagram.pdf', title: 'Series 2000 Short Stack Lift Assembly Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2000-Short-Stack-Lift-Assembly-Exploded-Diagram.pdf', models: ['2012S'], family: '2012S' },
  { file: 'series-2100-diagram.pdf', title: 'Series 2100 Lift Assembly Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2100-Lift-Assembly-Exploded-Diagram.pdf', models: ['2112', '2118', '2124', '2112G', '2118G', '2124G'], family: '2100' },
  { file: 'series-2200-diagram.pdf', title: 'Series 2200 Lift Assembly Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/11/Series-2200-Lift-Assembly-Exploded-Diagram.pdf', models: ['2208', '2210'], family: '2200' },
  { file: 'series-2412-diagram.pdf', title: '2412 Series Lift Assembly', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/2412-Series-Lift-Assembly.pdf', models: ['2412', '2416', '2412G', '2416G'], family: '2400' },
  { file: 'series-2500-diagram.pdf', title: 'Series 2500 Lift Assembly Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/2010_Series2500Lift_diagrams.pdf', models: ['2512', '2515'], family: '2500' },
  { file: 'series-2600-diagram.pdf', title: 'Series 2600 Lift Assembly Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2600-Lift-Assembly-Exploded-Diagram.pdf', models: ['2615'], family: '2600' },
  { file: 'eventer-16-parts.pdf', title: 'Eventer 16 Parts Manual', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Eventer_16_Parts_Manual_10_11.pdf', models: ['EVENTER16', 'EVENTER 16'], family: 'EVENTER16' },
  { file: 'gantry-2ton-diagram.pdf', title: '2 Ton Gantry Assembly Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/2-Ton-Gantry-Assembly-Exploded-Diagram.pdf', models: ['GH2T', 'GANTRY'], family: 'GANTRY' },
  { file: 'series-1910-diagram.pdf', title: 'Sumner 1910 Series Lift Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Sumner-1910-Series-Lift-Exploded-Diagram.pdf', models: ['1908', '1910'], family: '1910' }
];

function normalizeModel(model) {
  if (!model) return '';
  const m = model.trim().toUpperCase().replace(/\s+/g, '');
  // Normalize Eventer
  if (m.includes('EVENTER')) return m.replace(/[^0-9]/g, '') ? 'EVENTER' + m.replace(/[^0-9]/g, '') : 'EVENTER';
  // Normalize Gantry
  if (m.includes('GANTRY') || m.includes('GH2T')) return 'GANTRY';
  // Return as-is for series numbers
  return m;
}

function getModelFamily(model) {
  const norm = normalizeModel(model);
  if (norm === '2012S') return '2012S';
  if (norm.match(/^20[0-9]{2}/)) return norm.substring(0, 4); // 2000, 2100, etc
  if (norm.match(/^19[0-9]{2}/)) return '1910';
  if (norm.includes('EVENTER')) return 'EVENTER' + (norm.match(/\d+/) ? norm.match(/\d+/)[0] : '');
  if (norm === 'GANTRY') return 'GANTRY';
  return norm;
}

console.log('Loading Sumner products...');
const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
console.log(`Loaded ${products.length} Sumner products\n`);

const uniqueParts = new Set(products.map(p => p.part));
console.log(`Unique part numbers: ${uniqueParts.size}\n`);

console.log('Extracting text from PDFs...\n');

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
    console.log(`    Extracted ${pages.length} pages`);
  } catch (err) {
    console.log(`    Error: ${err.message}`);
  }
}

console.log('\nMatching parts with normalized models...\n');

const newConfirmations = [];
const manualOnlyMatches = [];
const conflicts = [];
const notInClaimedManual = [];

for (const product of products) {
  const part = product.part;
  const productModels = (product.models || []).map(m => normalizeModel(m));
  const productFamilies = [...new Set(productModels.map(m => getModelFamily(m)))];
  
  // Find all manuals where this part appears
  const foundIn = [];
  for (const manual of manuals) {
    if (!manual.pages) continue;
    
    // Use word-boundary regex for exact 6-digit part number matching
    const partRegex = new RegExp(`\\b${part}\\b`);
    
    for (let pageIdx = 0; pageIdx < manual.pages.length; pageIdx++) {
      if (partRegex.test(manual.pages[pageIdx])) {
        foundIn.push({
          manual,
          page: pageIdx + 1,
          family: manual.family
        });
        break;
      }
    }
  }
  
  if (foundIn.length === 0) continue;
  
  // Check if product claims any model
  if (productModels.length === 0 || productModels[0] === '') {
    // No model claimed - add "Listed in Sumner" badge for all found
    foundIn.forEach(f => {
      newConfirmations.push({
        part_number: part,
        model: '',
        manual_title: f.manual.title,
        manual_url: f.manual.url,
        page: f.page,
        badge_type: 'listed',
        match_note: `Page ${f.page}`,
        handle: product.handle
      });
    });
    continue;
  }
  
  // Product claims models - check for matches
  let matched = false;
  for (const found of foundIn) {
    const manualFamily = found.family;
    
    // Check if product family matches manual family
    if (productFamilies.includes(manualFamily)) {
      // Match! Determine if exact or series
      const exactMatch = found.manual.models.some(mm => 
        productModels.includes(normalizeModel(mm))
      );
      
      const matchedModel = exactMatch 
        ? product.models.find(pm => found.manual.models.some(mm => normalizeModel(pm) === normalizeModel(mm)))
        : manualFamily;
      
      newConfirmations.push({
        part_number: part,
        model: matchedModel,
        manual_title: found.manual.title,
        manual_url: found.manual.url,
        page: found.page,
        badge_type: exactMatch ? 'exact' : 'series',
        match_note: `Page ${found.page}`,
        handle: product.handle
      });
      matched = true;
    } else {
      // Found in a manual but product claims different family
      manualOnlyMatches.push({
        part_number: part,
        product_handle: product.handle,
        product_models: product.models.join(', '),
        manual_title: found.manual.title,
        manual_models: found.manual.models.join(', '),
        page: found.page
      });
    }
  }
  
  // Check for conflicts: product claims a family but NOT found in that family's manual
  if (!matched && productFamilies.length > 0) {
    for (const family of productFamilies) {
      const familyManual = manuals.find(m => m.family === family);
      if (familyManual && familyManual.pages) {
        notInClaimedManual.push({
          part_number: part,
          product_handle: product.handle,
          claimed_models: product.models.join(', '),
          claimed_family: family,
          manual_title: familyManual.title,
          note: 'Part number not found in claimed model family manual'
        });
      }
    }
  }
}

console.log(`\nDone!\n`);

// Write new diagram-map.csv (replace old file)
const header = 'part_number,model,manual_title,manual_url,page,diagram_ref,match_note';
const newRows = newConfirmations.map(c => 
  `"${c.part_number}","${c.model}","${c.manual_title}","${c.manual_url}","${c.page}","","${c.badge_type}:${c.match_note}"`
);

fs.writeFileSync(DIAGRAM_MAP, [header, ...newRows].join('\n'));
console.log(`Created fresh diagram-map.csv: ${newRows.length} confirmations`);

// Write files
const manualOnlyHeader = 'part_number,product_handle,product_models,manual_title,manual_models,page';
const manualOnlyRows = manualOnlyMatches.map(m =>
  `"${m.part_number}","${m.product_handle}","${m.product_models}","${m.manual_title}","${m.manual_models}","${m.page}"`
);
fs.writeFileSync(MANUAL_ONLY_FILE, [manualOnlyHeader, ...manualOnlyRows].join('\n'));
console.log(`Created manual-only-matches.csv: ${manualOnlyRows.length} entries`);

const conflictsHeader = 'handle,part_number,title_claimed_model,manual,page,manual_shows';
fs.writeFileSync(CONFLICTS_FILE, conflictsHeader + '\n');
console.log(`Created fitment-conflicts.csv: 0 conflicts`);

const notInClaimedHeader = 'part_number,product_handle,claimed_models,claimed_family,manual_title,note';
const notInClaimedRows = notInClaimedManual.map(n =>
  `"${n.part_number}","${n.product_handle}","${n.claimed_models}","${n.claimed_family}","${n.manual_title}","${n.note}"`
);
fs.writeFileSync(NOT_IN_CLAIMED_FILE, [notInClaimedHeader, ...notInClaimedRows].join('\n'));
console.log(`Created not-in-claimed-manual.csv: ${notInClaimedRows.length} entries`);

console.log('\n=== STATISTICS ===');
console.log(`Products checked: ${products.length}`);
console.log(`Unique parts: ${uniqueParts.size}`);
console.log(`Found in any manual: ${new Set(newConfirmations.map(c => c.part_number)).size} unique parts`);
console.log(`Total confirmations: ${newConfirmations.length}`);
console.log(`  - Exact badges: ${newConfirmations.filter(c => c.badge_type === 'exact').length}`);
console.log(`  - Series badges: ${newConfirmations.filter(c => c.badge_type === 'series').length}`);
console.log(`  - Listed badges: ${newConfirmations.filter(c => c.badge_type === 'listed').length}`);
console.log(`Manual-only matches: ${manualOnlyRows.length}`);
console.log(`Not in claimed manual: ${notInClaimedRows.length}`);
console.log(`Conflicts: 0`);
console.log('\n✓ Complete!');
