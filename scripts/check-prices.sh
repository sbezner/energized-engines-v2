#!/bin/bash

# Check prices for common Sumner parts from Toolup and other sites
# This is read-only price research

echo "Part|Our Price|Competitor|Their Price|URL|Date"

# Part 783629 - Load Line 2018/2118
curl -s "https://www.toolup.com/search?q=sumner+783629" -H "User-Agent: Mozilla/5.0" | grep -o 'price.*[0-9]' | head -1 > /tmp/toolup_783629.txt 2>/dev/null || echo ""

# Part 783921 - Pulley Assembly  
curl -s "https://www.toolup.com/search?q=sumner+783921" -H "User-Agent: Mozilla/5.0" | grep -o 'price.*[0-9]' | head -1 > /tmp/toolup_783921.txt 2>/dev/null || echo ""

# Part 783540 - Mast Roller
curl -s "https://www.toolup.com/search?q=sumner+783540" -H "User-Agent: Mozilla/5.0" | grep -o 'price.*[0-9]' | head -1 > /tmp/toolup_783540.txt 2>/dev/null || echo ""

echo "Attempted to fetch prices, but most sites require JavaScript or block scrapers."
echo "Will document manual price checks instead."
