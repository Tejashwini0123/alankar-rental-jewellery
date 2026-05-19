/* ================================================================
   ALANKAR RENTAL JEWELLERY — admin.js
   Handles: admin login, product CRUD, LocalStorage, stats
   ================================================================ */
 
'use strict';
 
/* ─── CONFIGURATION ─────────────────────────────────────────── */
const ADMIN_PASSWORD  = 'alankar@2026';   // Change this to your password
const STORAGE_KEY     = 'alankar_products';
const SESSION_KEY     = 'alankar_admin_session';
 
/* ─── CLOUDINARY CONFIGURATION ──────────────────────────────── */
const CLOUDINARY_CLOUD_NAME   = 'dfxaa1syp';
const CLOUDINARY_UPLOAD_PRESET = 'alankar_upload';
 
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
let currentImageUrl  = null;   // Holds Cloudinary URL after upload
let pendingImageFile = null;   // Holds the File object before form submit
let editSearchQuery  = '';     // Admin list search query
 
/* ================================================================
   AUTHENTICATION
================================================================ */
 
function checkSession() {
  if (sessionStorage.getItem(SESSION_KEY) === 'true') {
    showAdminPanel();
  }
}
 
function showAdminPanel() {
  loginOverlay.style.display = 'none';
  adminPanel.style.display   = 'block';
  renderAdminList();
  updateStats();
}
 
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
    adminPwInput.style.animation = 'none';
    setTimeout(() => {
      adminPwInput.style.borderColor = 'rgba(192,57,43,0.6)';
      setTimeout(() => adminPwInput.style.borderColor = '', 1500);
    }, 50);
  }
}
 
togglePw.addEventListener('click', () => {
  const isPass = adminPwInput.type === 'password';
  adminPwInput.type = isPass ? 'text' : 'password';
  togglePw.innerHTML = isPass ? '<i class="fa fa-eye-slash"></i>' : '<i class="fa fa-eye"></i>';
});
 
logoutBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to logout?')) {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  }
});
 
checkSession();
 
/* ================================================================
   IMAGE UPLOAD — Preview only (actual upload happens on form submit)
================================================================ */
 
imgUploadArea.addEventListener('click', () => imgFile.click());
 
imgFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) processImageFile(file);
});
 
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
 * Show a local preview and store the File for later Cloudinary upload
 */
function processImageFile(file) {
  if (file.size > 5 * 1024 * 1024) {
    showAddError('Image size must be under 5MB.');
    return;
  }
 
  pendingImageFile = file;       // keep the raw file
  currentImageUrl  = null;       // will be set after Cloudinary upload
 
  const reader = new FileReader();
  reader.onload = (e) => {
    imgPreview.src = e.target.result;  // local preview only
    imgPreview.style.display  = 'block';
    imgUploadInner.style.display = 'none';
    clearImgBtn.style.display = 'inline-flex';
  };
  reader.readAsDataURL(file);
}
 
clearImgBtn.addEventListener('click', clearImage);
 
function clearImage() {
  currentImageUrl  = null;
  pendingImageFile = null;
  imgPreview.src   = '';
  imgPreview.style.display    = 'none';
  imgUploadInner.style.display = 'block';
  clearImgBtn.style.display   = 'none';
  imgFile.value = '';
}
 
/* ================================================================
   CLOUDINARY UPLOAD
================================================================ */
 
/**
 * Upload a File object to Cloudinary (unsigned preset).
 * Returns the secure_url string on success.
 */
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
 
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );
 
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Cloudinary upload failed.');
  }
 
  const data = await res.json();
  return data.secure_url;   // permanent HTTPS URL
}
 
/* ================================================================
   LOCALSTORAGE HELPERS
================================================================ */
 
function getProducts() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}
 
function saveProducts(products) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  window.dispatchEvent(new StorageEvent('storage', {
    key: STORAGE_KEY,
    newValue: JSON.stringify(products)
  }));
}
 
function generateId() {
  return 'prod-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}
 
/* ================================================================
   ADD NEW JEWELLERY ITEM
================================================================ */
 
addItemForm.addEventListener('submit', async (e) => {
  e.preventDefault();
 
  const name     = itemName.value.trim();
  const cat      = itemCategory.value;
  const price    = parseFloat(itemPrice.value);
  const duration = itemDuration.value;
  const desc     = itemDesc.value.trim();
  const featured = itemFeatured.checked;
 
  // Validation
  if (!name)             { showAddError('Please enter a jewellery name.');    itemName.focus();     return; }
  if (!cat)              { showAddError('Please select a category.');         itemCategory.focus(); return; }
  if (!price || price <= 0) { showAddError('Please enter a valid rental price.'); itemPrice.focus(); return; }
  if (!desc)             { showAddError('Please enter a description.');       itemDesc.focus();     return; }
 
  hideAddError();
 
  // ── Upload image to Cloudinary if one was selected ──
  if (pendingImageFile) {
    addItemBtn.disabled = true;
    addItemBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Uploading image…';
    try {
      currentImageUrl = await uploadToCloudinary(pendingImageFile);
    } catch (err) {
      showAddError('Image upload failed: ' + err.message);
      addItemBtn.disabled = false;
      addItemBtn.innerHTML = '<i class="fa fa-plus"></i> Add Jewellery Item';
      return;
    }
  }
 
  // Build product object — image is now a Cloudinary URL (or null)
  const product = {
    id:          generateId(),
    name,
    category:    cat,
    price,
    duration,
    description: desc,
    image:       currentImageUrl,   // ← Cloudinary URL, works on all devices
    featured,
    createdAt:   new Date().toISOString()
  };
 
  const products = getProducts();
  products.unshift(product);
  saveProducts(products);
 
  // Reset form
  addItemForm.reset();
  clearImage();
  itemFeatured.checked = false;
 
  renderAdminList();
  updateStats();
 
  addItemBtn.disabled = false;
  addItemBtn.innerHTML = '<i class="fa fa-check"></i> Item Added!';
  addItemBtn.style.background = 'linear-gradient(135deg, #27ae60, #1a8a47)';
  setTimeout(() => {
    addItemBtn.innerHTML = '<i class="fa fa-plus"></i> Add Jewellery Item';
    addItemBtn.style.background = '';
  }, 2500);
});
 
function showAddError(msg) {
  addItemError.textContent  = msg;
  addItemError.style.display = 'block';
}
function hideAddError() {
  addItemError.style.display = 'none';
}
 
/* ================================================================
   RENDER ADMIN ITEM LIST
================================================================ */
 
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
    row.className  = 'admin-item-row';
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
 
  adminItemsList.querySelectorAll('.admin-action-btn.edit').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });
  adminItemsList.querySelectorAll('.admin-action-btn.delete').forEach(btn => {
    btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
  });
}
 
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
 
  document.getElementById('editId').value          = product.id;
  document.getElementById('editName').value        = product.name;
  document.getElementById('editCategory').value    = product.category;
  document.getElementById('editPrice').value       = product.price;
  document.getElementById('editDesc').value        = product.description;
  document.getElementById('editFeatured').checked  = product.featured;
 
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
 
  // Update product — keep original Cloudinary image URL
  products[idx] = {
    ...products[idx],
    name,
    category:  cat,
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
 
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeEditModal();
});