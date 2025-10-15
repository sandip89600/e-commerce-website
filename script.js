/* script.js - Core logic for EcomPro demo */

/* --------- Config & Storage Keys --------- */
const PRODUCTS_JSON = 'data/products.json';
const CUSTOM_KEY = 'ecom_custom_products';
const USER_DB_KEY = 'ecom_user_db';
const SESSION_KEY = 'ecom_user_session';
const CART_KEY = 'ecom_demo_cart_v1';

/* --------- State --------- */
let PRODUCTS = []; // combined list
let cart = loadCart();

/* --------- Init entrypoint --------- */
function initPage(pageName='home'){
  setupThemeToggle();
  initNavbar();
  loadProducts().then(()=>{
    if(pageName === 'home') renderFeatured();
    if(pageName === 'electronics' || pageName==='home') renderProductsPage();
    updateCartBadge();
  });
  attachGlobalHandlers();
  restoreSession();
}

/* --------- THEME --------- */
function setupThemeToggle(){
  const btn = document.getElementById('themeToggleBtn') || document.getElementById('theme-toggle');
  const body = document.body;
  const saved = localStorage.getItem('ecom_theme') || 'light';
  if(saved === 'dark'){ body.classList.add('dark-mode'); }
  if(btn){
    btn.addEventListener('click', ()=>{
      body.classList.toggle('dark-mode');
      const isDark = body.classList.contains('dark-mode');
      localStorage.setItem('ecom_theme', isDark ? 'dark' : 'light');
      const icon = btn.querySelector('i');
      if(icon) icon.classList.toggle('fa-sun');
    });
  }
}

/* --------- NAVBAR & AUTH UI --------- */
function initNavbar(){
  // populate auth buttons
  const authWrap = document.getElementById('authBtnsContainer') || document.getElementById('authBtnsContainer') ;
  updateNavbarUI();
  // Search input (some pages)
  const searchEl = document.getElementById('searchInput');
  if(searchEl) searchEl.addEventListener('input', applyFilters);
  const sortEl = document.getElementById('sortSelect');
  if(sortEl) sortEl.addEventListener('change', applyFilters);
}

function updateNavbarUI(){
  const wrap = document.getElementById('authBtnsContainer');
  const user = getSession();
  if(!wrap) return;
  if(user){
    wrap.innerHTML = `<div class="d-flex align-items-center gap-2">
      <a href="profile.html" class="btn btn-sm btn-outline-secondary"><i class="fa fa-user"></i> ${escapeHtml(user.username)}</a>
      <button id="logoutBtn" class="btn btn-sm btn-outline-danger">Logout</button>
    </div>`;
    document.getElementById('logoutBtn').addEventListener('click', ()=> {
      sessionStorage.removeItem(SESSION_KEY);
      updateNavbarUI();
      alert('Logged out');
      location.reload();
    });
  } else {
    wrap.innerHTML = `<a href="login.html" class="btn btn-sm btn-outline-primary me-2">Login</a>
                      <a href="signup.html" class="btn btn-sm btn-cta">Sign Up</a>`;
  }
}

/* --------- PRODUCTS: load + render + filters --------- */
async function loadProducts(){
  const custom = loadCustomProducts();
  try {
    const r = await fetch(PRODUCTS_JSON);
    const staticData = await r.json();
    PRODUCTS = staticData.concat(custom);
  } catch(e){
    // fallback if file missing
    PRODUCTS = custom;
    console.warn('Could not fetch products.json, using custom only', e);
  }
}

function renderFeatured(){
  const grid = document.getElementById('featuredGrid');
  if(!grid) return;
  // pick first 4
  grid.innerHTML = '';
  const list = PRODUCTS.slice(0,4);
  list.forEach(p => {
    const col = document.createElement('div'); col.className = 'col-sm-6 col-md-3';
    col.innerHTML = productCardHtml(p, true);
    grid.appendChild(col);
    bindCardButtons(col, p.id);
  });
}

function renderProductsPage(){
  const grid = document.getElementById('productsGrid');
  if(!grid) return;
  grid.innerHTML = '';
  const currentSection = document.body.dataset.section || 'Electronics';
  // filter by Electronics category
  let list = PRODUCTS.filter(p => (p.category === 'Mobile' || p.category === 'Mobile') || currentSection === 'All');
  // if body section is electronics, show category Mobile or Electronics items
  list = PRODUCTS.filter(p => p.category === 'Mobile' || p.category === 'Custom' || p.category.toLowerCase().includes('electr'));
  // Apply search & sort if present
  applyFilters(); // applyFilters will re-render; exit here
}

function applyFilters(){
  let q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  let sortBy = document.getElementById('sortSelect')?.value || 'default';
  // base list: electronics-like categories
  let list = PRODUCTS.filter(p => p.category === 'Mobile' || p.category === 'Custom' || p.category.toLowerCase().includes('electr'));
  if(q) list = list.filter(p => (p.title||'').toLowerCase().includes(q) || (p.category||'').toLowerCase().includes(q));
  if(sortBy === 'price-asc') list.sort((a,b)=> a.price - b.price);
  if(sortBy === 'price-desc') list.sort((a,b)=> b.price - a.price);
  if(sortBy === 'title-asc') list.sort((a,b)=> (a.title||'').localeCompare(b.title||''));
  // render
  const grid = document.getElementById('productsGrid');
  if(!grid) return;
  grid.innerHTML = '';
  list.forEach(p=>{
    const col = document.createElement('div'); col.className = 'col-sm-6 col-md-4 col-lg-3';
    col.innerHTML = productCardHtml(p);
    grid.appendChild(col);
    bindCardButtons(col,p.id);
  });
}

/* product card html */
function productCardHtml(p, compact=false){
  return `
    <div class="card-product">
      <img src="${escapeHtml(p.img||'https://placehold.co/600x400/cccccc/333?text=No+Image')}" alt="${escapeHtml(p.title)}">
      <div class="card-body">
        <div class="card-title">${escapeHtml(p.title)}</div>
        <div class="muted-small">${escapeHtml(p.category||'—')}</div>
        <div class="d-flex justify-content-between align-items-center mt-2">
          <div class="price">Rs ${Number(p.price).toFixed(2)}</div>
          <div class="card-actions">
            <button class="btn-add btn-sm" data-add="${p.id}" title="Add to cart"><i class="fa fa-cart-plus"></i></button>
            <button class="btn-buy btn-sm" data-buy="${p.id}" title="Buy now"><i class="fa fa-bolt"></i></button>
          </div>
        </div>
      </div>
    </div>
  `;
}
function bindCardButtons(container, id){
  container.querySelectorAll('[data-add]').forEach(b=>{
    b.addEventListener('click', ()=> addToCart(b.getAttribute('data-add')));
  });
  container.querySelectorAll('[data-buy]').forEach(b=>{
    b.addEventListener('click', ()=> { addToCart(b.getAttribute('data-buy')); location.href='cart.html'; });
  });
}

/* --------- CART --------- */
function loadCart(){
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; } catch(e){ return {}; }
}
function saveCart(){
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateCartBadge(); } catch(e){}
}
function addToCart(productId, qty=1){
  const p = PRODUCTS.find(x=> x.id === productId);
  if(!p) { alert('Product not found'); return; }
  if(!cart[productId]) cart[productId] = { id: p.id, title: p.title, price: p.price, qty:0, img:p.img };
  cart[productId].qty += qty;
  saveCart();
  showToast('Added to cart');
}
function updateCartBadge(){
  const total = Object.values(cart).reduce((s,i)=> s + i.qty, 0);
  const badgeEls = document.querySelectorAll('#navCartCount, .nav-badge');
  badgeEls.forEach(b => {
    if(total>0){ b.classList.remove('d-none'); b.textContent = total; } else b.classList.add('d-none');
  });
}
function clearCart(){
  cart = {}; saveCart(); showToast('Cart cleared'); updateCartBadge();
}

/* render cart page items (cart.html) */
function renderCartPage(){
  const wrap = document.getElementById('cartItemsWrap');
  if(!wrap) return;
  const items = Object.values(cart);
  if(items.length === 0){ wrap.innerHTML = '<div class="card p-3">Your cart is empty.</div>'; document.getElementById('cartTotal') && (document.getElementById('cartTotal').textContent = 'Rs 0'); return;}
  wrap.innerHTML = '';
  let total = 0;
  items.forEach(it=>{
    const row = document.createElement('div'); row.className='card p-2 mb-2 d-flex align-items-center';
    row.innerHTML = `<div class="d-flex gap-3 align-items-center w-100">
      <img src="${escapeHtml(it.img||'https://placehold.co/80x80')}" style="width:80px;height:80px;object-fit:cover;border-radius:8px">
      <div class="flex-grow-1">
        <div class="fw-semibold">${escapeHtml(it.title)}</div>
        <div class="muted-small">Rs ${it.price} x ${it.qty} = Rs ${it.price * it.qty}</div>
      </div>
      <div>
        <button class="btn btn-sm btn-outline-secondary" data-decr="${it.id}">-</button>
        <span class="mx-2">${it.qty}</span>
        <button class="btn btn-sm btn-outline-secondary" data-incr="${it.id}">+</button>
        <button class="btn btn-sm btn-link text-danger" data-remove="${it.id}">Remove</button>
      </div>
    </div>`;
    wrap.appendChild(row);
    total += it.price * it.qty;
  });
  document.getElementById('cartTotal') && (document.getElementById('cartTotal').textContent = 'Rs ' + total.toFixed(2));
  // bind events
  wrap.querySelectorAll('[data-incr]').forEach(b=> b.addEventListener('click', ()=> { const id=b.getAttribute('data-incr'); cart[id].qty++; saveCart(); renderCartPage(); }));
  wrap.querySelectorAll('[data-decr]').forEach(b=> b.addEventListener('click', ()=> { const id=b.getAttribute('data-decr'); cart[id].qty--; if(cart[id].qty<=0) delete cart[id]; saveCart(); renderCartPage(); }));
  wrap.querySelectorAll('[data-remove]').forEach(b=> b.addEventListener('click', ()=> { const id=b.getAttribute('data-remove'); delete cart[id]; saveCart(); renderCartPage(); }));
}

/* --------- AUTH (signup/login) - demo client-side using localStorage --------- */
function ensureInitialUsers(){
  let users = JSON.parse(localStorage.getItem(USER_DB_KEY) || '[]');
  if(!users.some(u=> u.username === 'admin')){
    users.push({ username:'admin', password:'password', role:'admin' });
    localStorage.setItem(USER_DB_KEY, JSON.stringify(users));
  }
}
ensureInitialUsers();

function signup(username,password){
  if(!username || !password) { alert('Enter username & password'); return false; }
  let users = JSON.parse(localStorage.getItem(USER_DB_KEY) || '[]');
  if(users.some(u=> u.username === username)){ alert('Username exists'); return false; }
  users.push({ username, password, role:'user' });
  localStorage.setItem(USER_DB_KEY, JSON.stringify(users));
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username, role:'user' }));
  updateNavbarUI(); return true;
}
function login(username,password){
  let users = JSON.parse(localStorage.getItem(USER_DB_KEY) || '[]');
  const found = users.find(u=> u.username === username && u.password === password);
  if(!found){ alert('Invalid credentials'); return false; }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username: found.username, role: found.role }));
  updateNavbarUI(); return true;
}
function getSession(){ try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch(e){ return null; } }
function restoreSession(){ updateNavbarUI(); }

/* --------- CONTACT form handler --------- */
function attachGlobalHandlers(){
  document.getElementById('contactForm')?.addEventListener('submit', (e)=> {
    e.preventDefault();
    showToast('Message received. Thanks!');
    e.target.reset();
  });
  // checkout flow (demo)
  document.getElementById('confirmOrderBtn')?.addEventListener('click', ()=> {
    clearCart();
    alert('Order placed (demo).');
    location.href = 'index.html';
  });
  // on cart page render items
  if(location.pathname.endsWith('cart.html')) renderCartPage();
  // login/signup page handlers
  if(location.pathname.endsWith('login.html')){
    document.getElementById('loginForm')?.addEventListener('submit', (e)=> {
      e.preventDefault();
      const u = e.target.loginUsername.value.trim(), p = e.target.loginPassword.value;
      if(login(u,p)){ location.href = 'profile.html'; } // redirect after login
    });
  }
  if(location.pathname.endsWith('signup.html')){
    document.getElementById('signupForm')?.addEventListener('submit', (e)=> {
      e.preventDefault();
      const u = e.target.signupUsername.value.trim(), p = e.target.signupPassword.value;
      if(signup(u,p)){ location.href = 'profile.html'; }
    });
  }
  // profile page load
  if(location.pathname.endsWith('profile.html')){
    const session = getSession();
    if(!session){ location.href = 'login.html'; return; }
    document.getElementById('profileName') && (document.getElementById('profileName').textContent = session.username);
  }
}

/* --------- Utilities --------- */
function loadCustomProducts(){ try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]'); } catch(e){ return []; } }
function escapeHtml(s){ return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
function showToast(msg){ const el = document.createElement('div'); el.className='toast-notice'; el.textContent = msg; document.body.appendChild(el); setTimeout(()=> el.remove(), 1500); }

/* --------- minimal CSS-inserted toast style --------- */
(function addToastStyle(){
  const css = `.toast-notice{position:fixed;right:20px;bottom:20px;background:#111;color:#fff;padding:10px 14px;border-radius:10px;z-index:99999;opacity:.95}`;
  const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
})();

/* --------- small helper: render product somewhere (used by multiple pages) --------- */
function renderProductsGridTo(containerSelector, list){
  const grid = document.querySelector(containerSelector);
  if(!grid) return;
  grid.innerHTML = '';
  list.forEach(p => {
    const col = document.createElement('div'); col.className = 'col-sm-6 col-md-4 col-lg-3';
    col.innerHTML = productCardHtml(p);
    grid.appendChild(col);
    bindCardButtons(col,p.id);
  });
}

/* Expose addToCart for console */
window.addToCart = addToCart;

/* --------- Products JSON fallback (if data unavailable) create sample products in localStorage once --------- */
(function ensureSampleProducts(){
  // If data/products.json does not exist on server, we'll seed some demo products in localStorage custom area.
  // But prefer actual data file if present.
  const existingCustom = loadCustomProducts();
  if(!existingCustom || existingCustom.length === 0){
    const sample = [
      { id:'prod-1', title:'Smartphone X1', price:12999, category:'Mobile', img:'https://placehold.co/600x400/00bcd4/fff?text=Smartphone' },
      { id:'prod-2', title:'Wireless Headphones', price:2999, category:'Audio', img:'https://placehold.co/600x400/ff7a59/fff?text=Headphones' },
      { id:'prod-3', title:'Gaming Mouse', price:1499, category:'Accessories', img:'https://placehold.co/600x400/764ba2/fff?text=Mouse' },
      { id:'prod-4', title:'Smartwatch Pro', price:7999, category:'Wearable', img:'https://placehold.co/600x400/667eea/fff?text=Watch' }
    ];
    // save only if products.json fetch fails at runtime; but we don't save automatically here to avoid overwriting later.
  }
})();
