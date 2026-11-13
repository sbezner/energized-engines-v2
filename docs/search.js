// Search and typeahead functionality
(function() {
  'use strict';
  
  let searchData = null;
  const BASE_PATH = window.EEConfig?.BASE_PATH || '';
  const PAGE_SIZE = 24;
  let currentResults = [];
  let displayedCount = 0;
  
  // Load search data
  fetch(BASE_PATH + '/search-data.json')
    .then(r => r.json())
    .then(data => {
      searchData = data;
      initTypeahead();
      initSearch();
    })
    .catch(e => console.error('Failed to load search data:', e));
  
  function initTypeahead() {
    const desktopInput = document.querySelector('.d-only .search input[type="search"]');
    const mobileInput = document.querySelector('.m-only .search input[type="search"]');
    const desktopTypeahead = document.getElementById('typeahead');
    const mobileTypeahead = document.getElementById('typeaheadMobile');
    
    function attachTypeahead(input, container) {
      if (!input || !container) return;
      
      let debounceTimer;
      
      input.addEventListener('input', function(e) {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
          container.classList.remove('show');
          return;
        }
        
        debounceTimer = setTimeout(() => {
          showTypeahead(query, container);
        }, 120);
      });
      
      input.addEventListener('blur', function() {
        setTimeout(() => container.classList.remove('show'), 200);
      });
    }
    
    attachTypeahead(desktopInput, desktopTypeahead);
    attachTypeahead(mobileInput, mobileTypeahead);
  }
  
  function showTypeahead(query, container) {
    if (!searchData) return;
    
    const results = searchParts(query);
    const matchedParts = results.slice(0, 5);
    
    // Search models
    const lowerQuery = query.toLowerCase();
    const matchedModels = searchData.models.filter(model => 
      model.toLowerCase().includes(lowerQuery)
    ).slice(0, 3);
    
    if (matchedParts.length === 0 && matchedModels.length === 0) {
      container.classList.remove('show');
      return;
    }
    
    let html = '';
    
    if (matchedParts.length > 0) {
      html += '<div class="grp">Parts</div>';
      matchedParts.forEach(part => {
        const highlightedPN = highlightMatch(part.partNumber, query);
        const highlightedName = highlightMatch(part.name, query);
        const price = part.price && parseFloat(part.price) > 0 ? `$${parseFloat(part.price).toFixed(2)}` : 'Call for price';
        
        html += `<a class="it" href="${BASE_PATH}/products/${part.handle}.html">
          <img src="${part.image || BASE_PATH + '/images/placeholder.jpg'}" alt="" onerror="this.src='${BASE_PATH}/images/placeholder.jpg'">
          <div><div class="t">${highlightedName}</div><div class="pn">${highlightedPN}</div></div>
          <div class="p">${price}</div>
        </a>`;
      });
    }
    
    if (matchedModels.length > 0) {
      html += '<div class="grp">Lift models</div><div class="model">';
      matchedModels.forEach(model => {
        html += `<span class="chip sm">${escapeHtml(model)}</span>`;
      });
      html += '</div>';
    }
    
    html += `<div class="ta-foot">See all results for "${escapeHtml(query)}"</div>`;
    
    container.innerHTML = html;
    container.classList.add('show');
  }
  
  function searchParts(query) {
    if (!searchData || !query) return [];
    
    const normalizedQuery = query.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const lowerQuery = query.toLowerCase();
    
    // Ranking: exact PN → starts-with PN → contains PN → title match
    const exact = [];
    const startsWith = [];
    const contains = [];
    const titleMatch = [];
    
    searchData.parts.forEach(part => {
      const pn = part.normalized_pn || '';
      const title = part.name.toLowerCase();
      
      if (pn === normalizedQuery) {
        exact.push(part);
      } else if (pn.startsWith(normalizedQuery)) {
        startsWith.push(part);
      } else if (pn.includes(normalizedQuery)) {
        contains.push(part);
      } else if (title.includes(lowerQuery)) {
        titleMatch.push(part);
      }
    });
    
    return [...exact, ...startsWith, ...contains, ...titleMatch];
  }
  
  function initSearch() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    const resultsDiv = document.getElementById('searchResults');
    
    if (!query || !resultsDiv) {
      console.log('initSearch: missing query or results div', { query, hasDiv: !!resultsDiv });
      return;
    }
    
    if (!searchData) {
      console.log('initSearch: searchData not loaded yet');
      return;
    }
    
    const searchInput = document.querySelector('input[name="q"]');
    if (searchInput) searchInput.value = query;
    
    currentResults = searchParts(query);
    displayedCount = 0;
    
    if (currentResults.length === 0) {
      resultsDiv.innerHTML = '<p style="text-align:center;color:var(--muted);padding:var(--s-12)">No results found for "' + escapeHtml(query) + '"</p>';
      return;
    }
    
    resultsDiv.innerHTML = `<h2>${currentResults.length} results for "${escapeHtml(query)}"</h2><div class="grid-cards" id="searchGrid"></div>`;
    
    showMoreResults();
  }
  
  function showMoreResults() {
    const grid = document.getElementById('searchGrid');
    if (!grid) return;
    
    const nextBatch = currentResults.slice(displayedCount, displayedCount + PAGE_SIZE);
    
    nextBatch.forEach(part => {
      const card = document.createElement('a');
      card.className = 'card product-card';
      card.href = `${BASE_PATH}/products/${part.handle}.html`;
      
      const price = parseFloat(part.price || 0);
      const priceHtml = price > 0 ? `<b>$${price.toFixed(2)}</b>` : 'Call for price';
      
      card.innerHTML = `
        <div class="im"><img src="${part.image || BASE_PATH + '/images/placeholder.jpg'}" alt="" loading="lazy" onerror="this.src='${BASE_PATH}/images/placeholder.jpg'"></div>
        <div class="bd">
          <div class="pn">${escapeHtml(part.partNumber)}</div>
          <div class="nm">${escapeHtml(part.name)}</div>
          <div class="pr">${priceHtml}</div>
        </div>
      `;
      
      grid.appendChild(card);
    });
    
    displayedCount += nextBatch.length;
    
    // Show more button
    const existingBtn = document.querySelector('.show-more-btn');
    if (existingBtn) existingBtn.remove();
    
    if (displayedCount < currentResults.length) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-sec show-more-btn';
      btn.textContent = `Show ${Math.min(PAGE_SIZE, currentResults.length - displayedCount)} more`;
      btn.style.cssText = 'margin:var(--s-8) auto 0;display:block';
      btn.onclick = showMoreResults;
      grid.parentElement.appendChild(btn);
    }
  }
  
  function highlightMatch(text, query) {
    if (!text) return '';
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return escapeHtml(text).replace(regex, '<mark>$1</mark>');
  }
  
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Expose showMoreResults for button onclick
  window.EESearchShowMore = showMoreResults;
})();
