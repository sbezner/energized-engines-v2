#!/usr/bin/env node

/**
 * Process the raw catalog:
 * 1. Identify duplicate part numbers
 * 2. Extract Sumner models from titles/tags/descriptions
 * 3. Create normalized product database
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '..', 'data', 'raw-products.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'processed-products.json');
const DUPLICATES_CSV = path.join(__dirname, '..', 'notes', 'duplicates.csv');

// Common Sumner model patterns
const MODEL_PATTERNS = [
  /\b(2[01][01258][0-8])\b/g,  // 2000, 2010, 2015, 2018, 2020, 2024, 2025, 2100, 2118, 2124, 2210, 2400, 2412, 2416, 2500, 2600
  /\b(R-?1[0-9]{2})\b/gi,       // R-100, R-150, R-180, R-250
  /\bR-?\s*150\b/gi,
  /\bR-?\s*180\b/gi,
  /\bR-?\s*250\b/gi,
  /\bEventer\s*(?:16|20|25)\b/gi,
  /\bGH[12T][0-9]?[A-Z]?\b/g,   // GH1, GH2T etc
  /\bSLC-?(?:18|24)\b/gi,       // Genie SLC-18, SLC-24
];

function extractPartNumber(product) {
  // Try SKU first
  if (product.variants && product.variants[0] && product.variants[0].sku) {
    const sku = product.variants[0].sku.trim();
    if (sku && sku !== '' && sku !== 'null') {
      return sku;
    }
  }
  
  // Try extracting from title - look for 6-digit numbers
  const titleMatch = product.title.match(/\b(\d{6})\b/);
  if (titleMatch) {
    return titleMatch[1];
  }
  
  return null;
}

function extractModels(product) {
  const models = new Set();
  const searchText = `${product.title} ${product.body_html || ''} ${(product.tags || []).join(' ')}`;
  
  MODEL_PATTERNS.forEach(pattern => {
    const matches = searchText.matchAll(pattern);
    for (const match of matches) {
      let model = match[1] || match[0];
      // Normalize model name
      model = model.replace(/^R-?/i, 'R-').toUpperCase();
      if (model.startsWith('R-')) {
        model = model.replace(/\s+/g, '');
      }
      models.add(model);
    }
  });
  
  // Special cases from tags
  if (product.tags) {
    product.tags.forEach(tag => {
      const tagLower = tag.toLowerCase();
      if (tagLower.includes('eventer')) {
        const match = tagLower.match(/eventer\s*(\d+)/);
        if (match) models.add(`Eventer ${match[1]}`);
      }
      if (tagLower.includes('gantry')) {
        models.add('Gantry');
      }
      if (tagLower.includes('roust')) {
        models.add('Roust-A-Bout');
      }
    });
  }
  
  // From title
  if (/roust\s*a\s*bout/i.test(product.title)) {
    models.add('Roust-A-Bout');
  }
  if (/eventer/i.test(product.title)) {
    const match = product.title.match(/eventer\s*(\d+)/i);
    if (match) models.add(`Eventer ${match[1]}`);
  }
  
  return Array.from(models);
}

function normalizePartNumber(pn) {
  if (!pn) return null;
  return pn.toString().trim().replace(/[\s\-_]/g, '').toUpperCase();
}

function main() {
  console.log('Processing catalog...\n');
  
  const rawData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  const products = rawData.products;
  
  console.log(`Total products: ${products.length}`);
  
  // Index by part number
  const partNumberMap = new Map(); // normalized part number -> array of products
  const productsWithoutPN = [];
  
  products.forEach((product) => {
    const partNumber = extractPartNumber(product);
    
    if (partNumber) {
      const normalized = normalizePartNumber(partNumber);
      if (!partNumberMap.has(normalized)) {
        partNumberMap.set(normalized, []);
      }
      partNumberMap.get(normalized).push({
        ...product,
        extracted_part_number: partNumber,
        normalized_part_number: normalized,
        models: extractModels(product),
        url: `https://energizedengines.com/products/${product.handle}`
      });
    } else {
      productsWithoutPN.push({
        ...product,
        extracted_part_number: null,
        normalized_part_number: null,
        models: extractModels(product),
        url: `https://energizedengines.com/products/${product.handle}`
      });
    }
  });
  
  console.log(`Products with part numbers: ${partNumberMap.size}`);
  console.log(`Products without part numbers: ${productsWithoutPN.length}`);
  
  // Find duplicates
  const duplicates = [];
  const uniqueProducts = [];
  
  partNumberMap.forEach((productList, partNumber) => {
    if (productList.length > 1) {
      // This is a duplicate
      duplicates.push({
        part_number: partNumber,
        count: productList.length,
        products: productList
      });
      
      // Choose primary (most recently updated, or first if tied)
      const primary = productList.reduce((best, current) => {
        const bestDate = new Date(best.updated_at || best.created_at);
        const currentDate = new Date(current.updated_at || current.created_at);
        return currentDate > bestDate ? current : best;
      });
      
      uniqueProducts.push({
        ...primary,
        is_merged: true,
        duplicate_urls: productList.filter(p => p.id !== primary.id).map(p => p.url)
      });
    } else {
      uniqueProducts.push({
        ...productList[0],
        is_merged: false,
        duplicate_urls: []
      });
    }
  });
  
  // Add products without part numbers
  productsWithoutPN.forEach(p => {
    uniqueProducts.push({
      ...p,
      is_merged: false,
      duplicate_urls: []
    });
  });
  
  console.log(`Unique products after deduplication: ${uniqueProducts.length}`);
  console.log(`Duplicate part numbers found: ${duplicates.length}`);
  
  // Write duplicates CSV
  const csvLines = ['Part Number,Count,Primary URL,Duplicate URLs'];
  duplicates.forEach(dup => {
    const primary = dup.products[0];
    const otherUrls = dup.products.slice(1).map(p => p.url).join(' | ');
    csvLines.push(`${dup.part_number},${dup.count},${primary.url},"${otherUrls}"`);
  });
  fs.writeFileSync(DUPLICATES_CSV, csvLines.join('\n'));
  console.log(`\nWrote duplicates to ${DUPLICATES_CSV}`);
  
  // Extract all models
  const modelMap = new Map();
  uniqueProducts.forEach(product => {
    product.models.forEach(model => {
      if (!modelMap.has(model)) {
        modelMap.set(model, []);
      }
      modelMap.get(model).push(product);
    });
  });
  
  console.log(`\nFound ${modelMap.size} unique models:`);
  const sortedModels = Array.from(modelMap.keys()).sort();
  sortedModels.forEach(model => {
    console.log(`  ${model}: ${modelMap.get(model).length} products`);
  });
  
  // Save processed data
  const output = {
    processed_at: new Date().toISOString(),
    source: rawData.source,
    fetched_at: rawData.fetched_at,
    stats: {
      total_raw_products: products.length,
      unique_products: uniqueProducts.length,
      duplicate_part_numbers: duplicates.length,
      products_without_part_number: productsWithoutPN.length,
      unique_models: modelMap.size
    },
    models: Object.fromEntries(
      Array.from(modelMap.entries()).map(([model, products]) => [
        model,
        products.map(p => ({
          id: p.id,
          title: p.title,
          handle: p.handle,
          part_number: p.extracted_part_number,
          price: p.variants?.[0]?.price,
          vendor: p.vendor
        }))
      ])
    ),
    products: uniqueProducts
  };
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nWrote processed data to ${OUTPUT_FILE}`);
  console.log('Done!');
}

main();
