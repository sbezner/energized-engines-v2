// Energized Engines v2 site scripts

// Mobile search row toggle
function toggleMobileSearch() {
  const searchRow = document.querySelector('.mobile-search-row');
  const searchIcon = document.querySelector('.search-icon-btn');
  if (searchRow) {
    const isActive = searchRow.classList.toggle('active');
    if (searchIcon) {
      searchIcon.setAttribute('aria-expanded', isActive ? 'true' : 'false');
    }
    if (isActive) {
      searchRow.querySelector('input')?.focus();
    }
  }
}

// P1-2: Mobile menu toggle with accessibility improvements
let lastFocusedElement = null;

// Attach event listeners after DOM loads
document.addEventListener('DOMContentLoaded', function() {
  // Hamburger button
  const hamburger = document.querySelector('.hamburger-btn');
  if (hamburger) {
    hamburger.addEventListener('click', toggleMobileMenu);
  }
  
  // Search icon button  
  const searchIcon = document.querySelector('.search-icon-btn');
  if (searchIcon) {
    searchIcon.addEventListener('click', toggleMobileSearch);
  }
  
  // Mobile menu backdrop
  const backdrop = document.querySelector('.mobile-menu-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', toggleMobileMenu);
  }
});

function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const backdrop = document.getElementById('mobileMenuBackdrop');
  const hamburger = document.querySelector('.hamburger-btn');
  
  if (menu && hamburger) {
    const isOpen = menu.classList.contains('open');
    
    if (isOpen) {
      // Close menu
      menu.classList.remove('open');
      if (backdrop) backdrop.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      
      // Return focus to hamburger
      if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
      }
    } else {
      // Open menu
      lastFocusedElement = document.activeElement;
      menu.classList.add('open');
      if (backdrop) backdrop.classList.add('active');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      
      // Set menu top from header bottom
      const header = document.querySelector('header');
      if (header) {
        const headerBottom = header.getBoundingClientRect().bottom;
        menu.style.top = headerBottom + 'px';
      }
      
      // Move focus to first link
      const firstLink = menu.querySelector('a');
      if (firstLink) {
        setTimeout(() => firstLink.focus(), 100);
      }
    }
  }
}

// Trap focus within mobile menu when open
document.addEventListener('keydown', function(event) {
  const menu = document.getElementById('mobileMenu');
  
  if (!menu || !menu.classList.contains('open')) return;
  
  // Close on Escape
  if (event.key === 'Escape') {
    toggleMobileMenu();
    return;
  }
  
  // Trap Tab focus
  if (event.key === 'Tab') {
    const focusableElements = menu.querySelectorAll('a, button');
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
});

// P2-1: Model search on models page
if (document.getElementById('modelSearchInput')) {
  const searchInput = document.getElementById('modelSearchInput');
  const container = document.getElementById('modelGroupsContainer');
  
  searchInput.addEventListener('input', function() {
    const query = this.value.toLowerCase().trim();
    const modelGroups = container.querySelectorAll('.model-group');
    let hasAnyVisibleCards = false;
    
    modelGroups.forEach(group => {
      const modelCards = group.querySelectorAll('.model-card');
      let hasVisibleCards = false;
      
      modelCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (!query || text.includes(query)) {
          card.style.display = '';
          hasVisibleCards = true;
          hasAnyVisibleCards = true;
        } else {
          card.style.display = 'none';
        }
      });
      
      group.style.display = hasVisibleCards ? '' : 'none';
    });
    
    // Show/hide "no models match" message
    let noMatchMsg = document.getElementById('noModelsMatch');
    if (!hasAnyVisibleCards && query) {
      if (!noMatchMsg) {
        noMatchMsg = document.createElement('p');
        noMatchMsg.id = 'noModelsMatch';
        noMatchMsg.className = 'no-match-message';
        noMatchMsg.textContent = 'No models match your search.';
        container.before(noMatchMsg);
      }
      noMatchMsg.style.display = 'block';
    } else if (noMatchMsg) {
      noMatchMsg.style.display = 'none';
    }
  });
}

// P2-2: Model page filter and vendor toggle
if (document.getElementById('filterPartsInput')) {
  const filterInput = document.getElementById('filterPartsInput');
  const productsGrid = document.getElementById('productsGrid');
  const toggleBtns = document.querySelectorAll('.toggle-btn');
  
  let currentFilter = 'all';
  
  function applyFilters() {
    const query = filterInput.value.toLowerCase().trim();
    const cards = productsGrid.querySelectorAll('.product-card');
    
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      const badge = card.querySelector('.badge');
      const isAftermarket = badge && badge.classList.contains('aftermarket');
      const isOEM = badge && badge.classList.contains('oem');
      
      let matchesVendor = true;
      if (currentFilter === 'oem') {
        matchesVendor = isOEM;
      } else if (currentFilter === 'aftermarket') {
        matchesVendor = isAftermarket;
      }
      
      const matchesSearch = !query || text.includes(query);
      
      card.style.display = (matchesVendor && matchesSearch) ? '' : 'none';
    });
  }
  
  filterInput.addEventListener('input', applyFilters);
  
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      toggleBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.getAttribute('data-filter');
      applyFilters();
    });
  });
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(event) {
  const menu = document.getElementById('mobileMenu');
  const hamburger = document.querySelector('.hamburger-btn');
  
  if (menu && menu.classList.contains('open')) {
    if (!menu.contains(event.target) && !hamburger.contains(event.target)) {
      toggleMobileMenu();
    }
  }
});
