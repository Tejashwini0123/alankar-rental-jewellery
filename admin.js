/* ================================================================
   ALANKAR RENTAL JEWELLERY — admin.js
   Handles: admin login, product CRUD, LocalStorage, stats
   Password: alankar2025  (change this in ADMIN_PASSWORD below)
   ================================================================ */

'use strict';

/* ─── CONFIGURATION ─────────────────────────────────────────── */
const ADMIN_PASSWORD  = 'alankar2025';   // Change this to your password
const STORAGE_KEY     = 'alankar_products';
const SESSION_KEY     = 'alankar_admin_session';

/* ─── ELEMENT REFS ──────────────────────────────────────────── */
const loginOverlay    = document.getElementById('adminLoginOverlay');
const adminPanel      = document.getElementById('adminPanel');
const adminPwInput    = document.getElementById('adminPwInput');
const loginBtn        = document.getElementById('loginBtn');
const loginError      = document.getElementById('loginError');
const togglePw        = document.getElementById('togglePw');
const logoutBtn       = document.getElementById('logoutBtn');

const addItemForm     = document.getElementById('addItemForm');
const addItemBtn      = document.getElementById('addItemBtn');
const addItemError    = document.getElementById('addItemError');

const imgUploadArea   = document.getElementById('imgUploadArea');
const imgFile         = document.getElementById('imgFile');
const imgUploadInner  = document.getElementById('imgUploadInner');
const imgPreview      = document.getElementById('imgPreview');
const clearImgBtn     = document.getElementById('clearImgBtn');

const itemName        = document.getElementById('itemName');
const itemCategory    = document.getElementById('itemCategory');
const itemPrice       = document.getElementById('itemPrice');
const itemDuration    = document.getElementById('itemDuration');
const itemDesc        = document.getElementById('itemDesc');
const itemFeatured    = document.getElementById('itemFeatured');

const adminItemsList  = document.getElementById('adminItemsList');
const adminSearch     = document.getElementById('adminSearch');
const clearAllBtn     = document.getElementById('clearAllBtn');

const statTotal       = document.getElementById('statTotal');
const statBridal      = document.getElementById('statBridal');
const statNecklace    = document.getElementById('statNecklace');
const statOther       = document.getElementById('statOther');

const editModalOverlay = document.getElementById('editModalOverlay');
const editModalClose   = document.getElementById('editModalClose');
const editItemForm     = document.getElementById('editItemForm');

/* ─── STATE ─────────────────────────────────────────────────── */
let currentImageBase64 = null;  // Holds uploaded image as base64
let editSearchQuery    = '';    // Admin list search query

/* ================================================================
   AUTHENTICATION
================================================================ */

/**
 * Check if admin is already logged in (session persists via sessionStorage)
 */
function checkSession() {
  if (sessionStorage.getItem(SESSION_KEY) === 'true') {
    showAdminPanel();
  }
}

/**
 * Show the admin panel and hide the login overlay
 */
function showAdminPanel() {
  loginOverlay.style.display = 'none';
  adminPanel.style.display   = 'block';
  renderAdminList();
  updateStats();
}

/**
 * Login handler
 */
loginBtn.addEventListener('click', handleLogin);
adminPwInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleLogin();
});

function handleLogin() {
  const entered = adminPwInput.value.trim();
  if (entered === ADMIN_PASSWORD) {
    loginError.classList.remove('show');
    sessionStorage.setItem(SESSION_KEY, 'true');
    showAdminPanel();
  } else {
    loginError.classList.add('show');
    adminPwInput.value = '';
    adminPwInput.focus();
    // Shake animation
    adminPwInput.style.animation = 'none';
    setTimeout(() => {
      adminPwInput.style.borderColor = 'rgba(192,57,43,0.6)';
      setTimeout(() => adminPwInput.style.borderColor = '', 1500);
    }, 50);
  }
}

/**
 * Toggle password visibility
 */
togglePw.addEventListener('click', () => {
  const isPass = adminPwInput.type === 'password';
  adminPwInput.type = isPass ? 'text' : 'password';
  togglePw.innerHTML = isPass ? '<i class="fa fa-eye-slash"></i>' : '<i class="fa fa-eye"></i>';
});

/**
 * Logout handler
 */
logoutBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to logout?')) {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  }
});

// Check session on load
checkSession();

/* ================================================================
   IMAGE UPLOAD
================================================================ */

/**
 * Click on upload area triggers file input
 */
imgUploadArea.addEventListener('click', () => imgFile.click());

/**
 * Handle file selection
 */
imgFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) processImageFile(file);
});

/**
 * Drag and drop support
 */
imgUploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  imgUploadArea.classList.add('drag-over');
});
imgUploadArea.addEventListener('dragleave', () => imgUploadArea.classList.remove('drag-over'));
imgUploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  imgUploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) processImageFile(file);
});

/**
 * Convert image file to base64 and show preview
 */
function processImageFile(file) {
  if (file.size > 5 * 1024 * 1024) {
    showAddError('Image size must be under 5MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    currentImageBase64 = e.target.result;
    imgPreview.src = currentImageBase64;
    imgPreview.style.display = 'block';
    imgUploadInner.style.display = 'none';
    clearImgBtn.style.display = 'inline-flex';
  };
  reader.readAsDataURL(file);
}

/**
 * Clear uploaded image
 */
clearImgBtn.addEventListener('click', clearImage);

function clearImage() {
  currentImageBase64 = null;
  imgPreview.src = '';
  imgPreview.style.display = 'none';
  imgUploadInner.style.display = 'block';
  clearImgBtn.style.display = 'none';
  imgFile.value = '';
}

/* ================================================================
   LOCALSTORAGE HELPERS
================================================================ */

/**
 * Get all admin-uploaded products from LocalStorage
 */
function getProducts() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Save products array back to LocalStorage
 */
function saveProducts(products) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  // Dispatch event so index.html tabs can update if open
  window.dispatchEvent(new StorageEvent('storage', {
    key: STORAGE_KEY,
    newValue: JSON.stringify(products)
  }));
}

/**
 * Generate a unique ID
 */
function generateId() {
  return 'prod-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

/* ================================================================
   ADD NEW JEWELLERY ITEM
================================================================ */

addItemForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name     = itemName.value.trim();
  const cat      = itemCategory.value;
  const price    = parseFloat(itemPrice.value);
  const duration = itemDuration.value;
  const desc     = itemDesc.value.trim();
  const featured = itemFeatured.checked;

  // Validation
  if (!name) { showAddError('Please enter a jewellery name.'); itemName.focus(); return; }
  if (!cat)  { showAddError('Please select a category.'); itemCategory.focus(); return; }
  if (!price || price <= 0) { showAddError('Please enter a valid rental price.'); itemPrice.focus(); return; }
  if (!desc) { showAddError('Please enter a description.'); itemDesc.focus(); return; }

  hideAddError();

  // Build product object
  const product = {
    id:       generateId(),
    name,
    category: cat,
    price,
    duration,
    description: desc,
    image:    currentImageBase64,
    featured,
    createdAt: new Date().toISOString()
  };

  // Save to LocalStorage
  const products = getProducts();
  products.unshift(product); // add to beginning
  saveProducts(products);

  // Reset form
  addItemForm.reset();
  clearImage();
  itemFeatured.checked = false;

  // Refresh admin list and stats
  renderAdminList();
  updateStats();

  // Show success feedback on button
  addItemBtn.innerHTML = '<i class="fa fa-check"></i> Item Added!';
  addItemBtn.style.background = 'linear-gradient(135deg, #27ae60, #1a8a47)';
  setTimeout(() => {
    addItemBtn.innerHTML = '<i class="fa fa-plus"></i> Add Jewellery Item';
    addItemBtn.style.background = '';
  }, 2500);
});

function showAddError(msg) {
  addItemError.textContent = msg;
  addItemError.style.display = 'block';
}
function hideAddError() {
  addItemError.style.display = 'none';
}

/* ================================================================
   RENDER ADMIN ITEM LIST
================================================================ */

/**
 * Render the list of uploaded jewellery items in the admin panel
 */
function renderAdminList(searchQuery = editSearchQuery) {
  const products = getProducts();
  adminItemsList.innerHTML = '';

  if (products.length === 0) {
    adminItemsList.innerHTML = `
      <div style="text-align:center; padding: 40px 20px; color: rgba(250,246,238,0.3);">
        <i class="fa fa-gem" style="font-size:2rem; margin-bottom:12px; display:block; color: rgba(201,168,76,0.2);"></i>
        <p style="font-size:0.85rem;">No items added yet.<br/>Use the form to add your first item.</p>
      </div>`;
    return;
  }

  // Filter by search
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filtered.length === 0) {
    adminItemsList.innerHTML = `
      <div style="text-align:center; padding:32px 20px; color: rgba(250,246,238,0.3);">
        <p style="font-size:0.83rem;">No items match your search.</p>
      </div>`;
    return;
  }

  filtered.forEach(product => {
    const row = document.createElement('div');
    row.className = 'admin-item-row';
    row.dataset.id = product.id;

    const thumbHtml = product.image
      ? `<img src="${product.image}" alt="${product.name}" />`
      : `<i class="fa fa-gem"></i>`;

    row.innerHTML = `
      <div class="admin-item-thumb">${thumbHtml}</div>
      <div class="admin-item-info">
        <strong title="${product.name}">${product.name}</strong>
        <span>₹${Number(product.price).toLocaleString('en-IN')} / ${product.duration} &nbsp;·&nbsp; ${capitalize(product.category)}${product.featured ? ' &nbsp;✦' : ''}</span>
      </div>
      <div class="admin-item-actions">
        <button class="admin-action-btn edit" title="Edit" data-id="${product.id}">
          <i class="fa fa-edit"></i>
        </button>
        <button class="admin-action-btn delete" title="Delete" data-id="${product.id}">
          <i class="fa fa-trash"></i>
        </button>
      </div>
    `;

    adminItemsList.appendChild(row);
  });

  // Attach edit/delete listeners
  adminItemsList.querySelectorAll('.admin-action-btn.edit').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });
  adminItemsList.querySelectorAll('.admin-action-btn.delete').forEach(btn => {
    btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
  });
}

// Admin search
adminSearch.addEventListener('input', () => {
  editSearchQuery = adminSearch.value.trim();
  renderAdminList(editSearchQuery);
});

/* ================================================================
   DELETE PRODUCT
================================================================ */

function deleteProduct(id) {
  if (!confirm('Delete this jewellery item? This cannot be undone.')) return;
  const products = getProducts().filter(p => p.id !== id);
  saveProducts(products);
  renderAdminList();
  updateStats();
}

/* ================================================================
   CLEAR ALL PRODUCTS
================================================================ */

clearAllBtn.addEventListener('click', () => {
  if (!confirm('DELETE ALL jewellery items? This includes all uploaded items and CANNOT be undone.')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderAdminList();
  updateStats();
});

/* ================================================================
   EDIT MODAL
================================================================ */

function openEditModal(id) {
  const products = getProducts();
  const product  = products.find(p => p.id === id);
  if (!product) return;

  document.getElementById('editId').value       = product.id;
  document.getElementById('editName').value     = product.name;
  document.getElementById('editCategory').value = product.category;
  document.getElementById('editPrice').value    = product.price;
  document.getElementById('editDesc').value     = product.description;
  document.getElementById('editFeatured').checked = product.featured;

  editModalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

editModalClose.addEventListener('click', closeEditModal);
editModalOverlay.addEventListener('click', (e) => {
  if (e.target === editModalOverlay) closeEditModal();
});

function closeEditModal() {
  editModalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

editItemForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const id       = document.getElementById('editId').value;
  const name     = document.getElementById('editName').value.trim();
  const cat      = document.getElementById('editCategory').value;
  const price    = parseFloat(document.getElementById('editPrice').value);
  const desc     = document.getElementById('editDesc').value.trim();
  const featured = document.getElementById('editFeatured').checked;

  if (!name || !cat || !price || !desc) {
    alert('Please fill in all required fields.');
    return;
  }

  const products = getProducts();
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) { alert('Item not found.'); return; }

  // Update product (keep original image)
  products[idx] = {
    ...products[idx],
    name,
    category: cat,
    price,
    description: desc,
    featured,
    updatedAt: new Date().toISOString()
  };

  saveProducts(products);
  closeEditModal();
  renderAdminList();
  updateStats();
});

/* ================================================================
   STATS
================================================================ */

function updateStats() {
  const products = getProducts();
  statTotal.textContent    = products.length;
  statBridal.textContent   = products.filter(p => p.category === 'bridal').length;
  statNecklace.textContent = products.filter(p => p.category === 'necklace').length;
  statOther.textContent    = products.filter(p =>
    p.category === 'earrings' || p.category === 'bangles'
  ).length;
}

/* ================================================================
   UTILITIES
================================================================ */

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// Keyboard: close modals on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeEditModal();
});
