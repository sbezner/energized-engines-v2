// Energized Engines v2 site scripts

// P1-2: Mobile menu toggle
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  if (menu) {
    menu.classList.toggle('open');
  }
}

// P2-1: Model search on models page
if (document.getElementById('modelSearchInput')) {
  const searchInput = document.getElementById('modelSearchInput');
  const container = document.getElementById('modelGroupsContainer');
  
  searchInput.addEventListener('input', function() {
    const query = this.value.toLowerCase().trim();
    const modelGroups = container.querySelectorAll('.model-group');
    
    modelGroups.forEach(group => {
      const modelCards = group.querySelectorAll('.model-card');
      let hasVisibleCards = false;
      
      modelCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (!query || text.includes(query)) {
          card.style.display = '';
          hasVisibleCards = true;
        } else {
          card.style.display = 'none';
        }
      });
      
      group.style.display = hasVisibleCards ? '' : 'none';
    });
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
      menu.classList.remove('open');
    }
  }
});
