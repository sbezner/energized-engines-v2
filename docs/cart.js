// Cart functionality - client-side localStorage-based cart
(function() {
  'use strict';
  
  const CART_KEY = 'ee_cart';
  const BASE_PATH = window.EEConfig?.BASE_PATH || '';
  
  // Cart state
  let cart = loadCart();
  
  function loadCart() {
    try {
      const saved = localStorage.getItem(CART_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load cart:', e);
      return [];
    }
  }
  
  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      updateCartUI();
    } catch (e) {
      console.error('Failed to save cart:', e);
    }
  }
  
  function addToCart(product, quantity = 1) {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        partNumber: product.partNumber,
        name: product.name,
        price: product.price,
        image: product.image,
        stock: product.stock,
        quantity: quantity
      });
    }
    saveCart();
    openCartDrawer(product.name, quantity);
  }
  
  function updateQuantity(id, quantity) {
    const item = cart.find(item => item.id === id);
    if (item) {
      if (quantity <= 0) {
        removeFromCart(id);
      } else {
        item.quantity = quantity;
        saveCart();
      }
    }
  }
  
  function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
  }
  
  function clearCart() {
    cart = [];
    saveCart();
  }
  
  function getCart() {
    return cart;
  }
  
  function getCartCount() {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }
  
  function getCartTotal() {
    return cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  }
  
  function updateCartUI() {
    // Update cart count badge
    const countElems = document.querySelectorAll('.icon-btn .count');
    const count = getCartCount();
    countElems.forEach(elem => {
      if (count > 0) {
        elem.textContent = count;
        elem.style.display = 'grid';
      } else {
        elem.style.display = 'none';
      }
    });
    
    // Update cart count text in drawer
    const countText = document.getElementById('cartCountText');
    if (countText) {
      countText.textContent = `(${count})`;
    }
  }
  
  function openCartDrawer(productName, quantity) {
    const drawer = document.getElementById('cartDrawer');
    const scrim = document.getElementById('cartScrim');
    const addedMsg = document.getElementById('cartAddedMsg');
    
    if (!drawer) return;
    
    // Update added message
    if (addedMsg && productName) {
      addedMsg.textContent = `Added ${productName}${quantity > 1 ? ', qty ' + quantity : ''}`;
    }
    
    // Render cart items
    renderCartDrawer();
    
    // Show drawer
    scrim.classList.add('show');
    drawer.classList.add('show');
    
    // Trap focus
    const firstFocusable = drawer.querySelector('button, a, input, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
      setTimeout(() => firstFocusable.focus(), 100);
    }
  }
  
  function closeCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const scrim = document.getElementById('cartScrim');
    
    if (drawer) {
      drawer.classList.remove('show');
      scrim.classList.remove('show');
    }
  }
  
  function renderCartDrawer() {
    const itemsContainer = document.getElementById('cartItems');
    const subtotalElem = document.getElementById('cartSubtotal');
    const meterElem = document.getElementById('shippingMeter');
    const meterBar = document.getElementById('shippingBar');
    const meterText = document.getElementById('shippingText');
    
    if (!itemsContainer) return;
    
    const subtotal = getCartTotal();
    const threshold = window.EEConfig?.FREE_SHIPPING_THRESHOLD || 150;
    
    // Render items
    itemsContainer.innerHTML = cart.map(item => {
      const imgSrc = item.image && (item.image.startsWith('http://') || item.image.startsWith('https://')) 
        ? item.image 
        : `${BASE_PATH}/${item.image || 'images/placeholder.jpg'}`;
      return `
      <div class="li">
        <img src="${imgSrc}" alt="${escapeHtml(item.name)}" onerror="this.src='${BASE_PATH}/images/placeholder.jpg'">
        <div>
          <div class="pn">${escapeHtml(item.partNumber)}</div>
          <div class="li-n">${escapeHtml(item.name)}</div>
          <div class="stock st-ok">${item.stock || 'In stock'}</div>
          <div class="qty sm">
            <button onclick="EECart.updateQuantity('${item.id}', ${item.quantity - 1})">−</button>
            <span class="num">${item.quantity}</span>
            <button onclick="EECart.updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700;font-variant-numeric:tabular-nums">$${(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
          <button onclick="EECart.removeFromCart('${item.id}')" style="color:var(--red-700);font-size:var(--fs-13);background:none;border:0;cursor:pointer;margin-top:4px">Remove</button>
        </div>
      </div>
    `;
    }).join('');
    
    // Update subtotal
    if (subtotalElem) {
      subtotalElem.textContent = `$${subtotal.toFixed(2)}`;
    }
    
    // Update shipping meter
    if (meterElem && meterBar && meterText) {
      const remaining = threshold - subtotal;
      if (remaining > 0) {
        const percent = Math.min((subtotal / threshold) * 100, 100);
        meterBar.style.width = `${percent}%`;
        meterText.textContent = `Add $${remaining.toFixed(2)} for free ground shipping`;
      } else {
        meterBar.style.width = '100%';
        meterText.textContent = 'You get free ground shipping. Your order is over $150.';
      }
    }
    
    // Show/hide empty state
    if (cart.length === 0) {
      itemsContainer.innerHTML = '<div style="padding:var(--s-8);text-align:center;color:var(--muted)">Your cart is empty</div>';
    }
  }
  
  function renderCartPage() {
    const container = document.getElementById('cartPageItems');
    const subtotalElem = document.getElementById('cartPageSubtotal');
    
    if (!container) return;
    
    const subtotal = getCartTotal();
    
    container.innerHTML = cart.map(item => {
      const imgSrc = item.image && (item.image.startsWith('http://') || item.image.startsWith('https://')) 
        ? item.image 
        : `${BASE_PATH}/${item.image || 'images/placeholder.jpg'}`;
      return `
      <div class="li" style="border-bottom:1px solid var(--line);padding:var(--s-4) 0">
        <img src="${imgSrc}" alt="${escapeHtml(item.name)}" onerror="this.src='${BASE_PATH}/images/placeholder.jpg'">
        <div style="flex:1;min-width:0">
          <div class="pn">${escapeHtml(item.partNumber)}</div>
          <div style="font-weight:600;font-size:var(--fs-16);margin:4px 0">${escapeHtml(item.name)}</div>
          <div class="stock st-ok">${item.stock || 'In stock'}</div>
          <div class="qty sm" style="margin-top:var(--s-2)">
            <button onclick="EECart.updateQuantity('${item.id}', ${item.quantity - 1})">−</button>
            <span class="num">${item.quantity}</span>
            <button onclick="EECart.updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
          </div>
        </div>
        <div style="text-align:right;display:flex;flex-direction:column;justify-content:space-between;align-items:flex-end">
          <div style="font-size:var(--fs-18);font-weight:700">$${(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
          <button onclick="EECart.removeFromCart('${item.id}')" style="font-size:var(--fs-13);color:var(--muted);background:none;border:none;cursor:pointer;padding:4px">Remove</button>
        </div>
      </div>
    `;
    }).join('');
    if (cart.length === 0) {
      container.innerHTML = '<div style="padding:var(--s-12);text-align:center"><h2>Your cart is empty</h2><p style="color:var(--muted);margin:var(--s-4) 0">Add some parts to get started.</p><a href="' + BASE_PATH + '/" class="btn btn-pri">Shop Parts</a></div>';
    }
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Expose API
  window.EECart = {
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCart,
    getCartCount,
    getCartTotal,
    openCartDrawer,
    closeCartDrawer,
    renderCartDrawer,
    renderCartPage
  };
  
  // Initialize
  document.addEventListener('DOMContentLoaded', function() {
    updateCartUI();
    
    // Set up drawer close handlers
    const scrim = document.getElementById('cartScrim');
    const closeBtn = document.getElementById('cartCloseBtn');
    
    if (scrim) {
      scrim.addEventListener('click', closeCartDrawer);
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', closeCartDrawer);
    }
    
    // ESC key closes drawer
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeCartDrawer();
      }
    });
    
    // Render cart page if on cart.html
    if (window.location.pathname.includes('cart.html')) {
      renderCartPage();
    }
    
    // Set up product page add to cart
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', function() {
        const productData = this.dataset;
        const qtyInput = document.getElementById('productQty');
        const quantity = qtyInput ? parseInt(qtyInput.textContent) : 1;
        
        addToCart({
          id: productData.id,
          partNumber: productData.partNumber,
          name: productData.name,
          price: productData.price,
          image: productData.image,
          stock: productData.stock
        }, quantity);
      });
    }
    
    // Set up quick add buttons on cards
    document.addEventListener('click', function(e) {
      const qa = e.target.closest('.qa');
      if (qa && !qa.classList.contains('dis')) {
        e.preventDefault();
        e.stopPropagation();
        
        const card = qa.closest('.card');
        if (card) {
          const productData = qa.dataset;
          addToCart({
            id: productData.id,
            partNumber: productData.partNumber,
            name: productData.name,
            price: productData.price,
            image: productData.image,
            stock: 'In stock'
          }, 1);
        }
      }
    });
  });
})();
