/* ================================================================
   ALANKAR RENTAL JEWELLERY — admin.js
   Handles: admin login, product CRUD via Firestore, stats
   ================================================================ */

'use strict';

/* ─── CONFIGURATION ─────────────────────────────────────────── */
const ADMIN_PASSWORD  = 'alankar@2026';
const SESSION_KEY     = 'alankar_admin_session';

/* ─── CLOUDINARY CONFIGURATION ──────────────────────────────── */
const CLOUDINARY_CLOUD_NAME    = 'dfxaa1syp';
const CLOUDINARY_UPLOAD_PRESET = 'alankar_upload';

/* ─── FIRESTORE REFERENCE ───────────────────────────────────── */
const db          = firebase.firestore();
const productsRef = db.collection('products');

/* ─── ELEMENT REFS ──────────────────────────────────────────── */
const loginOverlay  = document.getElementById('adminLoginOverlay');
const adminPanel    = document.getElementById('adminPanel');
const adminPwInput  = document.getElementById('adminPwInput');
const loginBtn      = document.getElementById('loginBtn');
const loginError    = document.getElementById('loginError');
const togglePw      = document.getElementById('togglePw');
const logoutBtn     = document.getElementById('logoutBtn');

const addItemForm   = document.getElementById('addItemForm');
const addItemBtn    = document.getElementById('addItemBtn');
const addItemError  = document.getElementById('addItemError');

const imgUploadArea  = document.getElementById('imgUploadArea');
const imgFile        = document.getElementById('imgFile');
const imgUploadInner = document.getElementById('imgUploadInner');
const imgPreview     = document.getElementById('imgPreview');
const clearImgBtn    = document.getElementById('clearImgBtn');

const itemName     = document.getElementById('itemName');
const itemCategory = document.getElementById('itemCategory');
const itemPrice    = document.getElementById('itemPrice');
const itemDuration = document.getElementById('itemDuration');
const itemDesc     = document.getElementById('itemDesc');
const itemFeatured = document.getElementById('itemFeatured');

const adminItemsList = document.getElementById('adminItemsList');
const adminSearch    = document.getElementById('adminSearch');
const clearAllBtn    = document.getElementById('clearAllBtn');

const statTotal    = document.getElementById('statTotal');
const statBridal   = document.getElementById('statBridal');
const statNecklace = document.getElementById('statNecklace');
const statOther    = document.getElementById('statOther');

const editModalOverlay = document.getElementById('editModalOverlay');
const editModalClose   = document.getElementById('editModalClose');
const editItemForm     = document.getElementById('editItemForm');

/* ─── STATE ─────────────────────────────────────────────────── */
let pendingImageFiles = [];   // Array of File objects to upload
let editSearchQuery   = '';
let cachedProducts    = [];

/* ================================================================
   AUTHENTICATION
================================================================ */

function checkSession() {
  if (sessionStorage.getItem(SESSION_KEY) === 'true') showAdminPanel();
}

function showAdminPanel() {
  loginOverlay.style.display = 'none';
  adminPanel.style.display   = 'block';
  startProductsListener();
}

loginBtn.addEventListener('click', handleLogin);
adminPwInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });

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
    setTimeout(() => {
      adminPwInput.style.borderColor = 'rgba(192,57,43,0.6)';
      setTimeout(() => adminPwInput.style.borderColor = '', 1500);
    }, 50);
  }
}

togglePw.addEventListener('click', () => {
  const isPass = adminPwInput.type === 'password';
  adminPwInput.type = isPass ? 'text' : 'password';
  togglePw.innerHTML = isPass
    ? '<i class="fa fa-eye-slash"></i>'
    : '<i class="fa fa-eye"></i>';
});

logoutBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to logout?')) {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  }
});

checkSession();

/* ================================================================
   FIRESTORE REAL-TIME LISTENER
================================================================ */

function startProductsListener() {
  productsRef.orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
    cachedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderAdminList();
    updateStats();
  }, (err) => {
    console.error('Firestore listener error:', err);
  });
}

/* ================================================================
   IMAGE UPLOAD — MULTI-IMAGE SUPPORT
================================================================ */

/* Element refs for multi-image upload */
const multiImgPreviewGrid = document.getElementById('multiImgPreviewGrid');

imgUploadArea.addEventListener('click', (e) => {
  if (e.target.closest('.remove-thumb')) return; // handled separately
  imgFile.click();
});

imgFile.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  files.forEach(file => addImageFile(file));
  imgFile.value = ''; // reset so same file can be re-added if removed
});

imgUploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  imgUploadArea.classList.add('drag-over');
});
imgUploadArea.addEventListener('dragleave', () => imgUploadArea.classList.remove('drag-over'));
imgUploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  imgUploadArea.classList.remove('drag-over');
  Array.from(e.dataTransfer.files).forEach(file => {
    if (file.type.startsWith('image/')) addImageFile(file);
  });
});

function addImageFile(file) {
  if (file.size > 5 * 1024 * 1024) {
    showAddError(`"${file.name}" exceeds 5MB limit.`);
    return;
  }
  pendingImageFiles.push(file);
  renderImgPreviews();
}

function renderImgPreviews() {
  if (pendingImageFiles.length === 0) {
    multiImgPreviewGrid.style.display = 'none';
    imgUploadInner.style.display      = 'block';
    clearImgBtn.style.display         = 'none';
    imgUploadArea.classList.remove('has-images');
    return;
  }

  imgUploadInner.style.display        = 'none';
  multiImgPreviewGrid.style.display   = 'flex';
  clearImgBtn.style.display           = 'inline-flex';
  imgUploadArea.classList.add('has-images');

  multiImgPreviewGrid.innerHTML = '';

  pendingImageFiles.forEach((file, idx) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const thumb = document.createElement('div');
      thumb.className = 'multi-img-thumb';
      thumb.innerHTML = `
        <img src="${ev.target.result}" alt="preview ${idx + 1}" />
        <button class="remove-thumb" data-idx="${idx}" title="Remove">✕</button>
      `;
      thumb.querySelector('.remove-thumb').addEventListener('click', (e) => {
        e.stopPropagation();
        pendingImageFiles.splice(idx, 1);
        renderImgPreviews();
      });
      multiImgPreviewGrid.appendChild(thumb);
    };
    reader.readAsDataURL(file);
  });
}

clearImgBtn.addEventListener('click', clearAllImages);

function clearAllImages() {
  pendingImageFiles = [];
  renderImgPreviews();
}

/* ================================================================
   CLOUDINARY UPLOAD
================================================================ */

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
  return data.secure_url;
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

  if (!name)                { showAddError('Please enter a jewellery name.');    itemName.focus();     return; }
  if (!cat)                 { showAddError('Please select a category.');         itemCategory.focus(); return; }
  if (!price || price <= 0) { showAddError('Please enter a valid rental price.'); itemPrice.focus();   return; }
  if (!desc)                { showAddError('Please enter a description.');       itemDesc.focus();     return; }

  hideAddError();

  let uploadedUrls = [];

  if (pendingImageFiles.length > 0) {
    addItemBtn.disabled  = true;
    addItemBtn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Uploading ${pendingImageFiles.length} image(s)...`;
    try {
      uploadedUrls = await Promise.all(pendingImageFiles.map(f => uploadToCloudinary(f)));
    } catch (err) {
      showAddError('Image upload failed: ' + err.message);
      addItemBtn.disabled  = false;
      addItemBtn.innerHTML = '<i class="fa fa-plus"></i> Add Jewellery Item';
      return;
    }
  }

  addItemBtn.disabled  = true;
  addItemBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';

  try {
    await productsRef.add({
      name,
      category:    cat,
      price,
      duration,
      description: desc,
      image:       uploadedUrls[0] || null,       // first image for backward compat
      images:      uploadedUrls.length ? uploadedUrls : [],
      featured,
      createdAt:   new Date().toISOString()
    });

    addItemForm.reset();
    clearAllImages();
    itemFeatured.checked = false;

    addItemBtn.innerHTML       = '<i class="fa fa-check"></i> Item Added!';
    addItemBtn.style.background = 'linear-gradient(135deg, #27ae60, #1a8a47)';
    setTimeout(() => {
      addItemBtn.innerHTML       = '<i class="fa fa-plus"></i> Add Jewellery Item';
      addItemBtn.style.background = '';
      addItemBtn.disabled        = false;
    }, 2500);

  } catch (err) {
    showAddError('Failed to save item: ' + err.message);
    addItemBtn.disabled  = false;
    addItemBtn.innerHTML = '<i class="fa fa-plus"></i> Add Jewellery Item';
  }
});

function showAddError(msg) {
  addItemError.textContent   = msg;
  addItemError.style.display = 'block';
}
function hideAddError() {
  addItemError.style.display = 'none';
}

/* ================================================================
   RENDER ADMIN ITEM LIST
================================================================ */

function renderAdminList(searchQuery = editSearchQuery) {
  adminItemsList.innerHTML = '';

  if (cachedProducts.length === 0) {
    adminItemsList.innerHTML = `
      <div style="text-align:center; padding: 40px 20px; color: rgba(250,246,238,0.3);">
        <i class="fa fa-gem" style="font-size:2rem; margin-bottom:12px; display:block; color: rgba(201,168,76,0.2);"></i>
        <p style="font-size:0.85rem;">No items added yet.<br/>Use the form to add your first item.</p>
      </div>`;
    return;
  }

  const filtered = cachedProducts.filter(p =>
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

    const firstImg = (product.images && product.images.length) ? product.images[0] : product.image;
    const thumbHtml = firstImg
      ? `<img src="${firstImg}" alt="${product.name}" />`
      : `<i class="fa fa-gem"></i>`;

    row.innerHTML = `
      <div class="admin-item-thumb">${thumbHtml}</div>
      <div class="admin-item-info">
        <strong title="${product.name}">${product.name}</strong>
        <span>Rs.${Number(product.price).toLocaleString('en-IN')} / ${product.duration} &nbsp;.&nbsp; ${capitalize(product.category)}${product.featured ? ' &nbsp;*' : ''}</span>
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

async function deleteProduct(id) {
  if (!confirm('Delete this jewellery item? This cannot be undone.')) return;
  try {
    await productsRef.doc(id).delete();
  } catch (err) {
    alert('Delete failed: ' + err.message);
  }
}

/* ================================================================
   CLEAR ALL PRODUCTS
================================================================ */

clearAllBtn.addEventListener('click', async () => {
  if (!confirm('DELETE ALL jewellery items? This CANNOT be undone.')) return;
  try {
    const snapshot = await productsRef.get();
    const batch    = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  } catch (err) {
    alert('Failed to delete all items: ' + err.message);
  }
});

/* ================================================================
   EDIT MODAL
================================================================ */

function openEditModal(id) {
  const product = cachedProducts.find(p => p.id === id);
  if (!product) return;

  document.getElementById('editId').value         = product.id;
  document.getElementById('editName').value       = product.name;
  document.getElementById('editCategory').value   = product.category;
  document.getElementById('editPrice').value      = product.price;
  document.getElementById('editDesc').value       = product.description;
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

editItemForm.addEventListener('submit', async (e) => {
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

  try {
    await productsRef.doc(id).update({
      name,
      category:    cat,
      price,
      description: desc,
      featured,
      updatedAt:   new Date().toISOString()
    });
    closeEditModal();
  } catch (err) {
    alert('Update failed: ' + err.message);
  }
});

/* ================================================================
   STATS
================================================================ */

function updateStats() {
  statTotal.textContent    = cachedProducts.length;
  statBridal.textContent   = cachedProducts.filter(p => p.category === 'bridal').length;
  statNecklace.textContent = cachedProducts.filter(p => p.category === 'necklace').length;
  statOther.textContent    = cachedProducts.filter(p =>
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