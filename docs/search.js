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
      let selectedIndex = -1;
      
      // ARIA setup
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-autocomplete', 'list');
      input.setAttribute('aria-expanded', 'false');
      input.setAttribute('aria-controls', container.id);
      container.setAttribute('role', 'listbox');
      
      // Result count aria-live region
      let liveRegion = document.getElementById('typeahead-live-' + container.id);
      if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'typeahead-live-' + container.id;
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        document.body.appendChild(liveRegion);
      }
      
      input.addEventListener('input', function(e) {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        selectedIndex = -1;
        
        if (query.length < 2) {
          container.classList.remove('show');
          input.setAttribute('aria-expanded', 'false');
          return;
        }
        
        debounceTimer = setTimeout(() => {
          const count = showTypeahead(query, container, liveRegion);
          if (count > 0) {
            input.setAttribute('aria-expanded', 'true');
          }
        }, 120);
      });
      
      // Keyboard navigation
      input.addEventListener('keydown', function(e) {
        if (!container.classList.contains('show')) return;
        
        const items = container.querySelectorAll('.it');
        if (items.length === 0) return;
        
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
          updateSelection(items, selectedIndex);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, -1);
          updateSelection(items, selectedIndex);
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
          e.preventDefault();
          items[selectedIndex].click();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          container.classList.remove('show');
          input.setAttribute('aria-expanded', 'false');
          selectedIndex = -1;
        }
      });
      
      function updateSelection(items, index) {
        items.forEach((item, i) => {
          if (i === index) {
            item.classList.add('selected');
            item.setAttribute('aria-selected', 'true');
          } else {
            item.classList.remove('selected');
            item.setAttribute('aria-selected', 'false');
          }
        });
      }
      
      input.addEventListener('blur', function() {
        setTimeout(() => {
          container.classList.remove('show');
          input.setAttribute('aria-expanded', 'false');
          selectedIndex = -1;
        }, 200);
      });
    }
    
    attachTypeahead(desktopInput, desktopTypeahead);
    attachTypeahead(mobileInput, mobileTypeahead);
  }
  
  function showTypeahead(query, container, liveRegion) {
    if (!searchData) return 0;
    
    const results = searchParts(query);
    const matchedParts = results.slice(0, 5);
    
    // Search models
    const lowerQuery = query.toLowerCase();
    const matchedModels = searchData.models.filter(model => 
      model.toLowerCase().includes(lowerQuery)
    ).slice(0, 3);
    
    if (matchedParts.length === 0 && matchedModels.length === 0) {
      container.classList.remove('show');
      return 0;
    }
    
    let html = '';
    
    if (matchedParts.length > 0) {
      html += '<div class="grp">Parts</div>';
      matchedParts.forEach(part => {
        const highlightedPN = highlightMatch(part.partNumber, query);
        const highlightedName = highlightMatch(part.name, query);
        const price = part.price && parseFloat(part.price) > 0 ? `$${parseFloat(part.price).toFixed(2)}` : 'Call for price';
        
        html += `<a class="it" role="option" aria-selected="false" href="${BASE_PATH}/products/${part.handle}.html">
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
    
    // Announce result count
    if (liveRegion) {
      const totalResults = matchedParts.length + matchedModels.length;
      liveRegion.textContent = `${totalResults} suggestions available`;
    }
    
    return matchedParts.length + matchedModels.length;
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
  
  let activeFilters = { brand: [], photo: false, series: [] };
  let activeSortOrder = 'relevance';
  let baseResults = [];
  
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
    
    baseResults = searchParts(query);
    currentResults = baseResults;
    displayedCount = 0;
    
    initFilters();
    renderResults();
  }
  
  function initFilters() {
    // Brand filters
    const filterEE = document.getElementById('filterEE');
    const filterSumner = document.getElementById('filterSumner');
    if (filterEE) filterEE.addEventListener('change', applyFilters);
    if (filterSumner) filterSumner.addEventListener('change', applyFilters);
    
    // Photo filter
    const filterPhoto = document.getElementById('filterPhoto');
    if (filterPhoto) filterPhoto.addEventListener('change', applyFilters);
    
    // Series filters - populate and attach listeners
    const seriesContainer = document.getElementById('seriesFilters');
    if (seriesContainer && searchData) {
      const seriesOptions = ['2000', '2100', '2400', 'Roust-A-Bout', 'Eventer', 'Gantry'];
      seriesOptions.forEach(series => {
        const label = document.createElement('label');
        label.className = 'chk';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'filter-series';
        checkbox.value = series;
        checkbox.addEventListener('change', applyFilters);
        const span = document.createElement('span');
        span.textContent = series;
        label.appendChild(checkbox);
        label.appendChild(span);
        seriesContainer.appendChild(label);
      });
    }
    
    // Sort dropdown
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.addEventListener('change', applySort);
  }
  
  function applyFilters() {
    // Collect active filters
    const filterEE = document.getElementById('filterEE');
    const filterSumner = document.getElementById('filterSumner');
    const filterPhoto = document.getElementById('filterPhoto');
    
    activeFilters.brand = [];
    if (filterEE && filterEE.checked) activeFilters.brand.push('ee');
    if (filterSumner && filterSumner.checked) activeFilters.brand.push('sumner');
    
    activeFilters.photo = filterPhoto && filterPhoto.checked;
    
    activeFilters.series = [];
    document.querySelectorAll('.filter-series:checked').forEach(cb => {
      activeFilters.series.push(cb.value);
    });
    
    // Filter baseResults
    currentResults = baseResults.filter(part => {
      // Brand filter
      if (activeFilters.brand.length > 0) {
        const isEE = part.vendor === 'Energized Engines';
        const isSumner = part.vendor === 'Sumner';
        const matchBrand = (activeFilters.brand.includes('ee') && isEE) ||
                          (activeFilters.brand.includes('sumner') && isSumner);
        if (!matchBrand) return false;
      }
      
      // Photo filter
      if (activeFilters.photo) {
        const hasPhoto = part.image && !part.image.includes('placeholder.jpg');
        if (!hasPhoto) return false;
      }
      
      // Series filter
      if (activeFilters.series.length > 0) {
        const partModels = part.models || [];
        const matchesSeries = activeFilters.series.some(series => {
          if (series === '2000') return partModels.some(m => m.startsWith('20') && ['2000','2001','2003','2004','2005','2008','2010','2012','2014','2015','2017','2018','2020','2021','2024','2025'].includes(m));
          if (series === '2100') return partModels.some(m => m.startsWith('21'));
          if (series === '2400') return partModels.some(m => m.startsWith('24'));
          if (series === 'Roust-A-Bout') return partModels.some(m => m.match(/R-?\d+/i));
          if (series === 'Eventer') return partModels.some(m => m.toLowerCase().includes('eventer'));
          if (series === 'Gantry') return partModels.some(m => m.toLowerCase().includes('gantry'));
          return false;
        });
        if (!matchesSeries) return false;
      }
      
      return true;
    });
    
    applySort();
  }
  
  function applySort() {
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      activeSortOrder = sortSelect.value;
    }
    
    if (activeSortOrder === 'price-asc') {
      currentResults.sort((a, b) => {
        const priceA = parseFloat(a.price || 0);
        const priceB = parseFloat(b.price || 0);
        return priceA - priceB;
      });
    } else if (activeSortOrder === 'price-desc') {
      currentResults.sort((a, b) => {
        const priceA = parseFloat(a.price || 0);
        const priceB = parseFloat(b.price || 0);
        return priceB - priceA;
      });
    } else if (activeSortOrder === 'part-number') {
      currentResults.sort((a, b) => {
        const pnA = a.partNumber || '';
        const pnB = b.partNumber || '';
        return pnA.localeCompare(pnB);
      });
    }
    // 'relevance' keeps the original search order
    
    displayedCount = 0;
    renderResults();
  }
  
  window.clearFilters = function() {
    // Uncheck all filters
    const filterEE = document.getElementById('filterEE');
    const filterSumner = document.getElementById('filterSumner');
    const filterPhoto = document.getElementById('filterPhoto');
    if (filterEE) filterEE.checked = false;
    if (filterSumner) filterSumner.checked = false;
    if (filterPhoto) filterPhoto.checked = false;
    
    document.querySelectorAll('.filter-series').forEach(cb => cb.checked = false);
    
    // Reset sort
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.value = 'relevance';
    
    // Reset filters
    activeFilters = { brand: [], photo: false, series: [] };
    activeSortOrder = 'relevance';
    currentResults = baseResults;
    
    displayedCount = 0;
    renderResults();
  };
  
  function renderResults() {
    const query = new URLSearchParams(window.location.search).get('q');
    const resultsDiv = document.getElementById('searchResults');
    const searchCount = document.getElementById('searchCount');
    
    console.log('renderResults called, currentResults:', currentResults.length, 'searchCount element:', !!searchCount);
    
    if (searchCount) {
      const html = currentResults.length > 0 ? 
        `<h2>${currentResults.length} result${currentResults.length !== 1 ? 's' : ''}</h2>` :
        `<h2>No results</h2>`;
      console.log('Setting searchCount innerHTML to:', html);
      searchCount.innerHTML = html;
    }
    
    if (currentResults.length === 0) {
      if (resultsDiv) {
        resultsDiv.innerHTML = '<p style="text-align:center;color:var(--muted);padding:var(--s-12)">No results found for "' + escapeHtml(query) + '"</p>';
      }
      const showMoreBtn = document.getElementById('showMoreBtn');
      if (showMoreBtn) showMoreBtn.style.display = 'none';
      return;
    }
    
    if (resultsDiv) {
      resultsDiv.innerHTML = '<div class="grid-cards" id="searchGrid"></div>';
    }
    displayedCount = 0;
    showMoreResults();
  }
  
  function showMoreResults() {
    const grid = document.getElementById('searchGrid');
    const showMoreBtn = document.getElementById('showMoreBtn');
    if (!grid) return;
    
    const start = displayedCount;
    const end = Math.min(displayedCount + PAGE_SIZE, currentResults.length);
    const nextBatch = currentResults.slice(start, end);
    
    nextBatch.forEach(part => {
      const card = document.createElement('div');
      card.className = 'card';
      
      const isEE = part.vendor === 'Energized Engines';
      const hasSave = isEE && part.oldPrice && parseFloat(part.oldPrice) > parseFloat(part.price || 0);
      const savePercent = hasSave ? Math.round(((parseFloat(part.oldPrice) - parseFloat(part.price)) / parseFloat(part.oldPrice)) * 100) : 0;
      
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
