/* =========================
   PRODUCTS DATA (Dynamic & Global)
   ========================= */
// PRODUCTS array is now initialized empty, data will be loaded via AJAX
let PRODUCTS = []; 
const STORAGE_KEY = 'ecom_demo_cart_v1';
const CUSTOM_PRODUCTS_KEY = 'ecom_custom_products'; 
const SESSION_KEY = 'ecom_user_session'; // New key for session data
const USER_DB_KEY = 'ecom_user_db'; // New key for user database
let cart = loadCart();

// Seed the user database with an initial admin if it doesn't exist
ensureInitialUsers();

/* Global DOM and Modals */
const productsGrid = document.getElementById('productsGrid');
const cartCountBadge = document.getElementById('cartCountBadge');
const cartItemsWrap = document.getElementById('cartItemsWrap');
const cartTotalEl = document.getElementById('cartTotal');
const searchInput = document.getElementById('searchInput');

let productAdderModal; 
let loginModal; 
let signupModal; 

/* Bootstrapped components */
const cartOffcanvasEl = document.getElementById('cartOffcanvas');
const cartOffcanvas = new bootstrap.Offcanvas(cartOffcanvasEl);
const messageModal = new bootstrap.Modal(document.createElement('div'));

/* =========================
   JQUERY INITIALIZATION & DATA LOADING
   ========================= */
$(document).ready(function() {
    
    // CORRECTION: Initialize DOM-dependent modals inside $(document).ready()
    const productAdderModalEl = document.getElementById('productAdderModal');
    if (productAdderModalEl) {
        productAdderModal = new bootstrap.Modal(productAdderModalEl);
    }
    loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    signupModal = new bootstrap.Modal(document.getElementById('signupModal'));
    
    // Check session status and update UI before loading products
    updateNavbar();

    // Determine the current page's section from the <body> tag
    const currentSection = $('body').data('section') || 'Apparel';
    
    // Load products data asynchronously using jQuery AJAX
    $.getJSON('Data/Products.json', function(data) {
        // COMBINE: Static JSON data + custom products from local storage
        const customProducts = loadCustomProducts();
        PRODUCTS = data.concat(customProducts); 

        // Apply initial filter based on the current page section
        let initialProductsList;
        if (currentSection === 'Apparel') {
            initialProductsList = PRODUCTS.filter(p => p.category !== 'Mobile'); 
        } else if (currentSection === 'Electronics') {
            initialProductsList = PRODUCTS.filter(p => p.category === 'Mobile');
        } else {
            initialProductsList = PRODUCTS; // Fallback
        }
        
        // Initial render after data is loaded
        renderProducts(initialProductsList); 
        renderCart();
        
    }).fail(function() {
        console.error("Failed to load products.json. Check file path.");
        displayMessageModal("Error", "Could not load product data. Check console for details.");
    });

    /* ---------- JQUERY EVENT HANDLERS ---------- */
    
    // Search input handler and Sort dropdown handler
    $('#searchInput').on('input', applyFilters);
    $('#sortSelect').on('change', applyFilters);
    
    // Category button handler (now using jQuery)
    $('.category-btn').on('click', function() {
        $('.category-btn').removeClass('active');
        $(this).addClass('active');
        applyFilters();
    });
    
    // Clear filters handler
    $('#clearFiltersBtn').on('click', () => {
        $('#searchInput').val(''); 
        $('.category-btn').removeClass('active');
        $('.category-btn[data-cat="all"]').addClass('active');
        $('#sortSelect').val('default'); 
        applyFilters();
    });

    /* User Management Handlers */
    $('#loginForm').on('submit', handleLogin);
    $('#signupForm').on('submit', handleSignup);
    $('#logoutBtn').on('click', handleLogout);

    /* Clear cart confirmation */
    $('#clearCartBtn').on('click', () => {
        displayConfirmModal("Clear Cart", "Are you sure you want to clear the entire cart?", () => {
             clearCart();
             cartOffcanvas.hide();
        });
    });
    
    // Product Adder Submission Handler
    $('#productAdderForm').on('submit', handleProductAddition);


    /* Checkout Flow Enhancements */
    document.getElementById('checkoutBtn').addEventListener('click', () => {
        const totalPrice = Object.values(cart).reduce((s, it) => s + it.price * it.qty, 0);
        if (totalPrice === 0) {
            displayMessageModal("Cart Empty", "Your cart is empty. Please add items before checking out.");
            return;
        }
        const summary = Object.values(cart).map(it => `${it.title} x ${it.qty} = Rs ${it.price * it.qty}`).join('<br>');
        document.getElementById('checkoutSummary').innerHTML = summary + `<hr><strong>Total: Rs ${totalPrice}</strong>`;
        new bootstrap.Modal(document.getElementById('checkoutModal')).show();
    });

    /* Contact form demo */
    document.getElementById('contactForm').addEventListener('submit', (e) => {
        e.preventDefault();
        displayMessageModal("Thank You!", 'Thanks ' + document.getElementById('contactName').value + ' — message received!');
        e.target.reset();
    });
});

/* =========================
   USER & SESSION MANAGEMENT
   ========================= */

function ensureInitialUsers() {
    let users = JSON.parse(localStorage.getItem(USER_DB_KEY)) || [];
    if (!users.some(u => u.username === 'admin')) {
        // Add a default Admin user if none exists
        users.push({ username: 'admin', password: 'password', role: 'admin' });
        localStorage.setItem(USER_DB_KEY, JSON.stringify(users));
    }
}

function checkSession() {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
}

function updateNavbar() {
    const user = checkSession();
    
    if (user) {
        // Logged in state
        $('#authButtons').html(`
            <span class="navbar-text me-3 d-none d-lg-inline" style="color:white;">
                Welcome, ${user.username}!
            </span>
            <button class="btn btn-sm btn-light" id="logoutBtn">
                <i class="fa fa-sign-out-alt me-1"></i> Logout
            </button>
        `);
        // Attach logout handler after rendering
        $('#logoutBtn').on('click', handleLogout);

        // Show/Hide Admin specific buttons
        if (user.role === 'admin') {
            $('.admin-feature').removeClass('d-none');
        } else {
            $('.admin-feature').addClass('d-none');
        }

    } else {
        // Logged out state
        $('#authButtons').html(`
            <button class="btn btn-sm btn-light me-2" data-bs-toggle="modal" data-bs-target="#loginModal">
                <i class="fa fa-sign-in-alt me-1"></i> Login
            </button>
            <button class="btn btn-sm btn-cta" data-bs-toggle="modal" data-bs-target="#signupModal">
                <i class="fa fa-user-plus me-1"></i> Sign Up
            </button>
        `);
        $('.admin-feature').addClass('d-none'); // Hide admin features when logged out
    }
}

function handleLogin(e) {
    e.preventDefault();
    const username = e.target.loginUsername.value;
    const password = e.target.loginPassword.value;
    
    let users = JSON.parse(localStorage.getItem(USER_DB_KEY));
    const foundUser = users.find(u => u.username === username && u.password === password);

    if (foundUser) {
        // Success: Store user in session storage
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(foundUser));
        loginModal.hide();
        updateNavbar();
        applyFilters(); // Re-filter in case admin features changed visibility
        displayMessageModal("Welcome!", `Logged in as ${foundUser.username}. Role: ${foundUser.role.toUpperCase()}`);
    } else {
        displayMessageModal("Error", "Invalid username or password.");
    }
}

function handleSignup(e) {
    e.preventDefault();
    const username = e.target.signupUsername.value;
    const password = e.target.signupPassword.value;

    let users = JSON.parse(localStorage.getItem(USER_DB_KEY));
    if (users.some(u => u.username === username)) {
        displayMessageModal("Error", "Username already exists.");
        return;
    }

    const newUser = { username, password, role: 'user' };
    users.push(newUser);
    localStorage.setItem(USER_DB_KEY, JSON.stringify(users));

    // Auto-login the new user
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    signupModal.hide();
    updateNavbar();
    displayMessageModal("Success!", `Account created and logged in as ${username}.`);
}

function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    updateNavbar();
    applyFilters(); // Re-filter to hide admin-added products if necessary
    displayMessageModal("Logged Out", "You have been successfully logged out.");
}


/* ---------- PRODUCT ADDER LOGIC ---------- */

function handleProductAddition(e) {
    e.preventDefault();
    
    const form = e.target;
    const newProduct = {
        id: 'cust-' + Date.now(),
        title: form.productTitle.value,
        price: parseFloat(form.productPrice.value) || 0,
        category: form.productCategory.value,
        img: form.productImage.value || 'https://placehold.co/800x600/cccccc/333333?text=New+Product',
    };

    if (newProduct.title && newProduct.price > 0 && newProduct.category) {
        // 1. Add to the active PRODUCTS array
        PRODUCTS.push(newProduct);
        
        // 2. Save to local storage for persistence
        let customProducts = loadCustomProducts();
        customProducts.push(newProduct);
        saveCustomProducts(customProducts);

        // 3. Re-render the menu to show the new product
        applyFilters(); 
        
        if (productAdderModal) {
            productAdderModal.hide();
        }
        displayMessageModal("Success", `Product "${newProduct.title}" added to menu!`);
        form.reset();
    } else {
        displayMessageModal("Error", "Please fill in all required fields (Title, Price, Category).");
    }
}


/* ---------- PRODUCTS RENDER ---------- */
function renderProducts(list) {
  productsGrid.innerHTML = '';
  const fragment = document.createDocumentFragment();
  list.forEach(p => {
    const col = document.createElement('div');
    col.className = 'col-sm-6 col-md-4 col-lg-3';
    col.innerHTML = `
      <div class="card h-100">
        <img src="${p.img}" class="product-img w-100" alt="${escapeHtml(p.title)}">
        <div class="card-body d-flex flex-column">
          <h6 class="card-title mb-1">${escapeHtml(p.title)}</h6>
          <p class="text-muted mb-2">Rs ${p.price}</p>
          <div class="mt-auto d-flex gap-2">
            <button class="btn btn-sm btn-primary w-100" data-buy="${p.id}"><i class="fa fa-bolt me-1"></i>Buy now</button>
            <button class="btn btn-sm btn-outline-secondary" data-add="${p.id}"><i class="fa fa-cart-plus"></i></button>
          </div>
        </div>
      </div>
    `;
    fragment.appendChild(col);
  });
  productsGrid.appendChild(fragment);

  // add event listeners for the newly rendered buttons
  productsGrid.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.getAttribute('data-add')));
  });
  productsGrid.querySelectorAll('[data-buy]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      addToCart(btn.getAttribute('data-buy'));
      cartOffcanvas.show();
    });
  });
}

/* ---------- CART FUNCTIONS (Unchanged) ---------- */
function addToCart(productId, qty = 1) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  if (!cart[productId]) {
    cart[productId] = { id: product.id, title: product.title, price: product.price, qty: 0 };
  }
  cart[productId].qty += qty;
  saveCart();
  renderCart();
  flashBadge();
}

function updateQty(productId, newQty) {
  if (!cart[productId]) return;
  if (newQty <= 0) {
    delete cart[productId];
  } else {
    cart[productId].qty = newQty;
  }
  saveCart();
  renderCart();
}

function removeItem(productId) {
  delete cart[productId];
  saveCart();
  renderCart();
}

function clearCart() {
  cart = {};
  saveCart();
  renderCart();
}

/* ---------- RENDER CART UI (Unchanged) ---------- */
function renderCart() {
  const totalItems = Object.values(cart).reduce((s, it) => s + it.qty, 0);
  if (totalItems > 0) {
    cartCountBadge.classList.remove('d-none');
    cartCountBadge.textContent = totalItems;
  } else {
    cartCountBadge.classList.add('d-none');
  }

  cartItemsWrap.innerHTML = '';
  if (totalItems === 0) {
    cartItemsWrap.innerHTML = '<p class="text-muted">Your cart is empty. Add items to get started.</p>';
    cartTotalEl.textContent = 'Rs 0';
    return;
  }

  const frag = document.createDocumentFragment();
  Object.values(cart).forEach(item => {
    const productImg = PRODUCTS.find(p => p.id === item.id)?.img || 'https://placehold.co/56x56/cccccc/333333?text=N/A';
    
    const row = document.createElement('div');
    row.className = 'd-flex align-items-center justify-content-between mb-2 p-2 bg-white rounded shadow-sm';
    row.innerHTML = `
      <div class="me-2" style="width:56px;height:56px;overflow:hidden;border-radius:8px;">
        <img src="${escapeHtml(productImg)}" style="width:100%;height:100%;object-fit:cover;">
      </div>
      <div class="flex-grow-1 ms-2">
        <div class="fw-semibold">${escapeHtml(item.title)}</div>
        <div class="small text-muted">Rs ${item.price} x ${item.qty} = Rs ${item.price * item.qty}</div>
      </div>
      <div class="d-flex flex-column align-items-end">
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-secondary" data-decr="${item.id}">-</button>
          <button class="btn btn-outline-secondary disabled">${item.qty}</button>
          <button class="btn btn-outline-secondary" data-incr="${item.id}">+</button>
        </div>
        <button class="btn btn-link text-danger small mt-2" data-remove="${item.id}">Remove</button>
      </div>
    `;
    frag.appendChild(row);
  });
  cartItemsWrap.appendChild(frag);

  // wire events (unchanged)
  cartItemsWrap.querySelectorAll('[data-incr]').forEach(b => b.addEventListener('click', () => {
    const id = b.getAttribute('data-incr'); addToCart(id, 1);
  }));
  cartItemsWrap.querySelectorAll('[data-decr]').forEach(b => b.addEventListener('click', () => {
    const id = b.getAttribute('data-decr'); updateQty(id, cart[id].qty - 1);
  }));
  cartItemsWrap.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => {
    const id = b.getAttribute('data-remove'); removeItem(id);
  }));

  const totalPrice = Object.values(cart).reduce((s, it) => s + it.price * it.qty, 0);
  cartTotalEl.textContent = 'Rs ' + totalPrice;
}

/* ---------- STORAGE (Unchanged) ---------- */
function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Could not load cart', e);
    return {};
  }
}
function saveCart() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch (e) {
    console.error('Could not save cart', e);
  }
}

function loadCustomProducts() {
    try {
        const raw = localStorage.getItem(CUSTOM_PRODUCTS_KEY);
        const products = raw ? JSON.parse(raw) : [];
        return products.map(p => ({ ...p, price: parseFloat(p.price) }));
    } catch (e) {
        console.error('Could not load custom products', e);
        return [];
    }
}

function saveCustomProducts(products) {
    try {
        localStorage.setItem(CUSTOM_PRODUCTS_KEY, JSON.stringify(products));
    } catch (e) {
        console.error('Could not save custom products', e);
    }
}


/* ---------- UTILITIES (Unchanged) ---------- */
function escapeHtml(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

function flashBadge() {
  cartCountBadge.classList.remove('d-none');
  cartCountBadge.classList.add('badge-blink');
  setTimeout(()=>cartCountBadge.classList.remove('badge-blink'), 800);
}

function displayMessageModal(title, body) {
    const existingModal = document.querySelector('.custom-modal-wrapper');
    if (existingModal) existingModal.remove();

    const wrapper = document.createElement('div');
    wrapper.className = 'modal fade custom-modal-wrapper';
    wrapper.setAttribute('tabindex', '-1');
    wrapper.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content rounded-xl shadow-lg">
                <div class="modal-header">
                    <h5 class="modal-title">${title}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">${body}</div>
                <div class="modal-footer">
                    <button class="btn btn-primary" data-bs-dismiss="modal">OK</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(wrapper);
    const modalInstance = new bootstrap.Modal(wrapper);
    modalInstance.show();
    wrapper.addEventListener('hidden.bs.modal', ()=> wrapper.remove());
}

function displayConfirmModal(title, body, onConfirm) {
    const existingModal = document.querySelector('.custom-modal-wrapper');
    if (existingModal) existingModal.remove();

    const wrapper = document.createElement('div');
    wrapper.className = 'modal fade custom-modal-wrapper';
    wrapper.setAttribute('tabindex', '-1');
    wrapper.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content rounded-xl shadow-lg">
                <div class="modal-header">
                    <h5 class="modal-title">${title}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">${body}</div>
                <div class="modal-footer">
                    <button id="confirmActionBtn" class="btn btn-danger">Confirm</button>
                    <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(wrapper);
    const modalInstance = new bootstrap.Modal(wrapper);
    
    $('#confirmActionBtn', wrapper).on('click', () => {
        onConfirm();
        modalInstance.hide();
    });

    modalInstance.show();
    wrapper.addEventListener('hidden.bs.modal', ()=> wrapper.remove());
}


/* ---------- SEARCH, FILTER & SORT (Unchanged) ---------- */

function applyFilters() {
    const q = $('#searchInput').val().trim().toLowerCase();
    const activeCat = $('.category-btn.active').data('cat') || 'all';
    const sortBy = $('#sortSelect').val(); 
    const currentSection = $('body').data('section') || 'Apparel';
    
    let filtered = PRODUCTS.slice(); 
    
    // Step 1: Filter by section (Apparel or Electronics)
    filtered = filtered.filter(p => {
        let matchesSection = true;
        if (currentSection === 'Apparel') {
            matchesSection = (p.category !== 'Mobile'); 
        } else if (currentSection === 'Electronics') {
            matchesSection = (p.category === 'Mobile');
        }
        return matchesSection;
    });

    // Step 2: Filter by Category 
    filtered = filtered.filter(p => {
        const matchesCat = activeCat === 'all' ? true : p.category === activeCat;
        return matchesCat;
    });
        
    // Step 3: Filter by Search Query
    filtered = filtered.filter(p => {
        const matchesQ = q === '' ? true : (p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
        return matchesQ;
    });

    // Step 4: Apply Sorting Logic
    if (sortBy === 'price-asc') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
        filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'title-asc') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
    }
    
    renderProducts(filtered);
}


// --- ORIGINAL CHECKOUT AND CONTACT FORM LOGIC (Unchanged) ---

document.getElementById('confirmOrderBtn').addEventListener('click', () => {
  const orderId = 'ORD' + Date.now();
  new bootstrap.Modal(document.getElementById('checkoutModal')).hide();
  cartOffcanvas.hide();
  clearCart();
  
  const content = `<h5 class="mb-2">Order placed ✅</h5>
    <p class="mb-1 small">Your order id: <strong>${orderId}</strong></p>
    <p class="small text-muted">This is a demo. Integrate server-side checkout to persist orders and process payments.</p>`;
  displayMessageModal("Order Confirmed", content);
});

/* Initial small UX touches (Unchanged) */
(function addSmallStyles() {
  const style = document.createElement('style');
  style.textContent = `.badge-blink{ animation: blinker .8s ease; } @keyframes blinker{ 0%{ transform: scale(1); } 50%{ transform: scale(1.2); } 100%{ transform: scale(1); } }`;
  document.head.appendChild(style);
})();