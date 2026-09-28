#!/usr/bin/env node

/**
 * Fetch product catalog from Energized Engines public API
 * Read-only: fetches products.json endpoint (paginated)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://energizedengines.com/products.json';
const LIMIT = 250;
const OUTPUT_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'raw-products.json');

function fetchPage(pageNum) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}?limit=${LIMIT}&page=${pageNum}`;
    console.log(`Fetching page ${pageNum}`);
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Energized-Engines-Preview-Bot/1.0)'
      }
    };
    
    https.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error(`Failed to parse JSON from page ${pageNum}: ${e.message}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function fetchAllProducts() {
  const allProducts = [];
  let pageNum = 1;
  let hasMore = true;
  
  while (hasMore) {
    try {
      const result = await fetchPage(pageNum);
      
      if (result.products && result.products.length > 0) {
        allProducts.push(...result.products);
        console.log(`  → Got ${result.products.length} products (total: ${allProducts.length})`);
        
        if (result.products.length < LIMIT) {
          hasMore = false;
        } else {
          pageNum++;
          // Rate limiting: wait 1 second between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error(`Error fetching page ${pageNum}:`, error.message);
      throw error;
    }
  }
  
  return allProducts;
}

async function main() {
  console.log('Fetching Energized Engines catalog...');
  console.log('This is read-only: we never modify the live store.\n');
  
  try {
    const products = await fetchAllProducts();
    
    console.log(`\nFetched ${products.length} total products`);
    
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    // Save raw data
    const output = {
      fetched_at: new Date().toISOString(),
      source: 'https://energizedengines.com/products.json',
      total_products: products.length,
      products: products
    };
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`\nSaved to ${OUTPUT_FILE}`);
    console.log('Done!');
    
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main();
