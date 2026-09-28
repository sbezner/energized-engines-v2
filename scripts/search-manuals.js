#!/usr/bin/env node

/**
 * Search for Sumner parts manuals from public sources
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const MODELS = [
  '2000', '2001', '2003', '2004', '2005', '2008', '2010', '2012', '2014', '2015',
  '2017', '2018', '2020', '2021', '2024', '2025', '2100', '2112', '2118', '2124',
  'EVENTER 16', 'EVENTER 20', 'EVENTER 25', 'Eventer 16', 'Eventer 20', 'Eventer 25',
  'GH2T', 'Gantry', 'R-100', 'R-150', 'R-180', 'R-250', 'Roust-A-Bout',
  'SLC-18', 'SLC-24', 'EVENTER25', '2112'
];

// Known manual URLs from public research
const KNOWN_MANUALS = {
  '2000': 'https://sumner.com/wp-content/uploads/2019/04/2000-Series-Parts-Manual.pdf',
  '2100': 'https://sumner.com/wp-content/uploads/2019/04/2100-Series-Parts-Manual.pdf',
  'Eventer': 'https://sumner.com/wp-content/uploads/2019/04/Eventer-Series-Parts-Manual.pdf',
  'Roust-A-Bout': 'https://sumner.com/wp-content/uploads/2019/04/Roust-A-Bout-Parts-Manual.pdf'
};

async function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => resolve(false));
  });
}

async function searchManuals() {
  const results = [];
  
  console.log('Searching for Sumner parts manuals...\n');
  
  for (const [model, url] of Object.entries(KNOWN_MANUALS)) {
    const exists = await checkUrl(url);
    if (exists) {
      console.log(`✓ Found manual for ${model}: ${url}`);
      results.push({
        model,
        manual_title: `${model} Series Parts Manual`,
        manual_url: url,
        status: 'found',
        source: 'sumner.com'
      });
    } else {
      console.log(`✗ Manual not found for ${model}: ${url}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }
  
  return results;
}

async function main() {
  const manuals = await searchManuals();
  
  const csv = [
    'model,manual_title,manual_url,revision,date_checked,status,source',
    ...manuals.map(m => 
      `"${m.model}","${m.manual_title}","${m.manual_url}","","${new Date().toISOString().split('T')[0]}","${m.status}","${m.source}"`
    )
  ].join('\n');
  
  fs.writeFileSync(path.join(__dirname, '..', 'notes', 'manual-sources.csv'), csv);
  console.log(`\nSaved ${manuals.length} manual records to notes/manual-sources.csv`);
}

main().catch(console.error);
