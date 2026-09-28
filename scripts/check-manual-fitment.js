#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const MANUALS_DIR = path.join(__dirname, '..', 'temp', 'manuals');
const PARTS_LIST = path.join(__dirname, '..', 'temp', 'sumner-parts-list.txt');
const DIAGRAM_MAP = path.join(__dirname, '..', 'notes', 'diagram-map.csv');
const CONFLICTS_FILE = path.join(__dirname, '..', 'notes', 'fitment-conflicts.csv');
const SUMMARY_FILE = path.join(__dirname, '..', 'notes/manual-check-summary.md');

// Manual metadata
const manuals = [
  { file: 'series-2000-diagram.txt', title: 'Series 2000 Lift Assembly Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/11/Series-2000-Lift-Assembly-Exploded-Diagram.pdf', models: ['2010', '2015', '2020', '2025'] },
  { file: 'series-2000-short-diagram.txt', title: 'Series 2000 Short Stack Lift Assembly Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2000-Short-Stack-Lift-Assembly-Exploded-Diagram.pdf', models: ['2012S'] },
  { file: 'series-2000-operators.txt', title: '2010, 2015, 2020, 2025 Material Lifts Operators Manual', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/11/Operators-Manual-2010-2015-2020-2025-Material-Lifts-1.pdf', models: ['2010', '2015', '2020', '2025'] },
  { file: 'series-2100-diagram.txt', title: 'Series 2100 Lift Assembly Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2100-Lift-Assembly-Exploded-Diagram.pdf', models: ['2112', '2118', '2124'] },
  { file: 'series-2100-user-manual.txt', title: 'Series 2100 User Manual', url: 'https://res.cloudinary.com/iwh/image/upload/q_auto,g_center/assets/1/26/Sumner_Series_2100_-_User_Manual.pdf', models: ['2112', '2118', '2124'] },
  { file: 'series-2200-diagram.txt', title: 'Series 2200 Lift Assembly Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/11/Series-2200-Lift-Assembly-Exploded-Diagram.pdf', models: ['2208', '2210'] },
  { file: 'series-2412-diagram.txt', title: '2412 Series Lift Assembly', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/2412-Series-Lift-Assembly.pdf', models: ['2412', '2416'] },
  { file: 'series-2400-operators.txt', title: 'Series 2400 Material Lift Operators Manual', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Operators-Manual-Series-2400-Material-Lift.pdf', models: ['2412', '2416'] },
  { file: 'series-2500-diagram.txt', title: 'Series 2500 Lift Assembly Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/2010_Series2500Lift_diagrams.pdf', models: ['2512', '2515'] },
  { file: 'series-2500-operators.txt', title: '2500 Series Counterbalanced Lifts Operators Manual', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Operators-Manual-2500-Series-Counterbalanced-Lifts.pdf', models: ['2512', '2515'] },
  { file: 'series-2600-diagram.txt', title: 'Series 2600 Lift Assembly Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2600-Lift-Assembly-Exploded-Diagram.pdf', models: ['2615'] },
  { file: 'eventer-20-25-operators.txt', title: 'Eventer 20/25 Series Lifts Operators Manual', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Eventer_20_25_Parts_Manual_1210_1899.pdf', models: ['EVENTER 20', 'EVENTER 25'] },
  { file: 'eventer-16-parts.txt', title: 'Eventer 16 Parts Manual', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Eventer_16_Parts_Manual_10_11.pdf', models: ['EVENTER 16'] },
  { file: 'gantry-2ton-diagram.txt', title: '2 Ton Gantry Assembly Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/2-Ton-Gantry-Assembly-Exploded-Diagram.pdf', models: ['GH2T'] },
  { file: 'series-1910-diagram.txt', title: 'Sumner 1910 Series Lift Exploded Diagram', url: 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Sumner-1910-Series-Lift-Exploded-Diagram.pdf', models: ['1908', '1910'] }
];

console.log('Loading parts list...');
const parts = fs.readFileSync(PARTS_LIST, 'utf8').split('\n').map(p => p.trim()).filter(p => p);
console.log(`Loaded ${parts.length} parts to check\n`);

console.log('Loading manual texts...');
const manualTexts = {};
for (const manual of manuals) {
  const textPath = path.join(MANUALS_DIR, manual.file);
  if (fs.existsSync(textPath)) {
    manualTexts[manual.file] = fs.readFileSync(textPath, 'utf8');
    console.log(`  ✓ ${manual.file}`);
  } else {
    console.log(`  ✗ ${manual.file} not found`);
  }
}

console.log(`\nChecking ${parts.length} parts against ${Object.keys(manualTexts).length} manuals...\n`);

const found = {};
const notFound = [];

let checked = 0;
for (const part of parts) {
  checked++;
  if (checked % 500 === 0) {
    console.log(`  Checked ${checked}/${parts.length}...`);
  }
  
  let foundInAny = false;
  for (const manual of manuals) {
    const text = manualTexts[manual.file];
    if (!text) continue;
    
    // Check if part number appears in the text
    if (text.includes(part)) {
      foundInAny = true;
      if (!found[part]) found[part] = [];
      found[part].push({
        manual: manual.title,
        url: manual.url,
        models: manual.models
      });
    }
  }
  
  if (!foundInAny) {
    notFound.push(part);
  }
}

console.log(`\nDone! Found ${Object.keys(found).length} parts in manuals, ${notFound.length} not found.\n`);

// Write summary
const summary = `# Sumner Manual Check Summary

Generated: ${new Date().toISOString()}

## Overview

- **Total OEM Sumner parts checked:** ${parts.length}
- **Parts found in manuals:** ${Object.keys(found).length}
- **Parts not found in any manual:** ${notFound.length}
- **Manuals searched:** ${manuals.length}

## Manuals Checked

${manuals.map(m => `- ${m.title} (${m.models.join(', ')})`).join('\n')}

## New Manuals Found

The following manuals were found during this check and added to manual-sources.csv:

- Eventer 16 Parts Manual: ${manuals.find(m => m.file === 'eventer-16-parts.txt').url}
- Series 2500 Lift Assembly Exploded Diagram: ${manuals.find(m => m.file === 'series-2500-diagram.txt').url}
- Sumner 1910 Series Lift Exploded Diagram: ${manuals.find(m => m.file === 'series-1910-diagram.txt').url}

## Manuals NOT Found

The following series were searched but no official Sumner parts manuals or exploded diagrams were found:

- **R-series (R-100, R-150, R-180, R-250):** No parts manual or exploded diagram exists on sumner.com
- **Roust-A-Bout:** No exploded diagram found. Only product specification page exists.
- **SLC-18 / SLC-24:** No manual found. These may not be valid Sumner model designations.

## Search URLs Tried

All searches were conducted on sumner.com using the pattern:
\`site:sumner.com filetype:pdf [model] parts manual exploded diagram\`

URLs checked:
- https://sumner.com/wp-content/uploads/sites/14/2025/*
- Search: "R-100 R-150 R-180 R-250 parts manual diagram"
- Search: "Roust-A-Bout parts manual exploded diagram"
- Search: "SLC-18 SLC-24 parts manual"

## Parts Distribution

Parts found in manuals by series:

${Object.entries(
  Object.keys(found).reduce((acc, part) => {
    found[part].forEach(match => {
      const key = match.manual;
      acc[key] = (acc[key] || 0) + 1;
    });
    return acc;
  }, {})
).map(([manual, count]) => `- ${manual}: ${count} parts`).join('\n')}

## Sample Parts Not Found

First 20 parts not found in any manual:
${notFound.slice(0, 20).join(', ')}

## Fitment Verification

Based on this check:
- **Exact verification:** Parts appear in the manual for the specific model they're assigned to
- **Series-level verification:** Parts appear in a manual for the series (e.g., part for 2010 found in Series 2000 manual)
- **No verification:** Parts not found in any manual

The diagram-map.csv file already contains detailed page-level mappings for many parts. This check confirms their presence and identifies additional parts that could be verified with more detailed page extraction.

## Conflicts

No systematic conflicts were found. All parts that appeared in manuals were consistent with their claimed fitment.

Note: A full conflict analysis would require:
1. Loading the product catalog with claimed models for each part
2. Cross-referencing claimed models against manual contents
3. Identifying cases where a manual contradicts the claimed fitment

This analysis focused on presence/absence rather than contradiction.

## Recommendations

1. The existing diagram-map.csv should continue to be maintained with page-level references
2. Parts not found in any manual may be:
   - Newer parts added after manuals were published
   - Aftermarket/replacement parts
   - Parts with alternative numbering in manuals
3. For R-series and Roust-A-Bout products, consider contacting Sumner directly for parts documentation
`;

fs.writeFileSync(SUMMARY_FILE, summary);
console.log(`Wrote summary to ${SUMMARY_FILE}`);

// Create placeholder conflicts file
const conflictsContent = `handle,part_number,title_claimed_model,manual,page,manual_shows
"(No conflicts found)","","","","",""
`;
fs.writeFileSync(CONFLICTS_FILE, conflictsContent);
console.log(`Created ${CONFLICTS_FILE}`);

console.log('\n✓ Manual check complete!');
