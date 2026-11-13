// Search and typeahead functionality
(function() {
  'use strict';
  
  let searchData = null;
  const BASE_PATH = window.EEConfig?.BASE_PATH || '';
  
  // Load search data
  fetch(BASE_PATH + '/search-data.json')
    .then(r => r.json())
    .then(data => {
      searchData = data;
      initTypeahead();
    })
    .catch(e => console.error('Failed to load search data:', e));
  
  function initTypeahead() {
    const inputs = document.querySelectorAll('.search input[type="search"]');
    const typeahead = document.getElementById('typeahead');
    
    if (!typeahead) return;
    
    inputs.forEach(input => {
      let debounceTimer;
      
      input.addEventListener('input', function(e) {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
          typeahead.classList.remove('show');
          return;
        }
        
        debounceTimer = setTimeout(() => {
          showTypeahead(query, typeahead);
        }, 120);
      });
      
      input.addEventListener('blur', function() {
        setTimeout(() => typeahead.classList.remove('show'), 200);
      });
    });
  }
  
  function showTypeahead(query, container) {
    if (!searchData) return;
    
    const lowerQuery = query.toLowerCase();
    
    // Search parts
    const matchedParts = searchData.parts.filter(part => {
      return part.partNumber.toLowerCase().includes(lowerQuery) ||
             part.name.toLowerCase().includes(lowerQuery);
    }).slice(0, 5);
    
    // Search models
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
        const price = part.price ? `$${parseFloat(part.price).toFixed(2)}` : 'Call';
        
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
})();
