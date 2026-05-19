/* ================================================================
   ALANKAR RENTAL JEWELLERY — script.js
   Handles: loader, navbar, scroll reveal, jewellery grid,
            search/filter, testimonial slider, modal, form
   ================================================================ */

'use strict';

const modalOverlay   = document.getElementById('modalOverlay');
const modalClose     = document.getElementById('modalClose');
const modalItemName  = document.getElementById('modalItemName');
const modalItemPrice = document.getElementById('modalItemPrice');
const modalForm      = document.getElementById('modalForm');

/* ─── FIRESTORE REFERENCE ───────────────────────────────────── */
const db = firebase.firestore();
const productsRef = db.collection('products');

/* ─── UTILITY FUNCTIONS ────────────────────────────────────── */

function formatPrice(price) {
  return '₹' + Number(price).toLocaleString('en-IN');
}

function getCatIcon(cat) {
  const icons = {
    bridal:   'fa-crown',
    necklace: 'fa-ring',
    earrings: 'fa-star',
    bangles:  'fa-circle-notch'
  };
  return icons[cat] || 'fa-gem';
}

/* ─── LOADER ────────────────────────────────────────────────── */
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
  }, 1800);
});

/* ─── NAVBAR SCROLL BEHAVIOR ────────────────────────────────── */
const navbar   = document.getElementById('navbar');
const navLinks = document.querySelectorAll('.nav-link');

function handleNavbarScroll() {
  if (window.scrollY > 60) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
  const sections = ['home', 'collections', 'about', 'testimonials', 'contact'];
  let current = '';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 120) current = id;
  });
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === '#' + current) link.classList.add('active');
  });
}
window.addEventListener('scroll', handleNavbarScroll, { passive: true });
handleNavbarScroll();

/* ─── MOBILE MENU ───────────────────────────────────────────── */
const hamburger  = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  mobileMenu.classList.toggle('open');
});

document.querySelectorAll('.mob-link, .mob-cta').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
  });
});

/* ─── SCROLL REVEAL ─────────────────────────────────────────── */
function initScrollReveal() {
  const revealEls = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');
  const observer  = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(el => observer.observe(el));
}
initScrollReveal();

/* ─── JEWELLERY GRID ────────────────────────────────────────── */
const jewelleryGrid = document.getElementById('jewelleryGrid');
const noResults     = document.getElementById('noResults');
const searchInput   = document.getElementById('searchInput');
const filterBtns    = document.querySelectorAll('.filter-btn');

let activeCategory = 'all';
let activeSearch   = '';
let allProducts    = [];   // in-memory cache updated by Firestore listener

/**
 * Build a single jewellery card element
 */
function createJewelCard(product) {
  const card = document.createElement('div');
  card.className  = 'jewel-card reveal-up';
  card.dataset.cat = product.category;

  const imgContent = product.image
    ? `<img src="${product.image}" alt="${product.name}" loading="lazy" />`
    : `<div class="jewel-placeholder">
         <i class="fa ${getCatIcon(product.category)}"></i>
         <span>${product.category}</span>
       </div>`;

  const badgeHtml = product.featured
    ? `<span class="jewel-badge featured">✦ Featured</span>`
    : `<span class="jewel-badge">${product.category}</span>`;

  card.innerHTML = `
    <div class="jewel-img-wrap">
      ${imgContent}
      ${badgeHtml}
    </div>
    <div class="jewel-info">
      <p class="jewel-cat">${product.category}</p>
      <h3 class="jewel-name">${product.name}</h3>
      <p class="jewel-desc">${product.description}</p>
      <div class="jewel-footer">
        <div class="jewel-price">
          <span class="price-val">${formatPrice(product.price)}</span>
          <span class="price-dur">${product.duration || 'per event'}</span>
        </div>
        <button
          class="book-btn"
          onclick="openBookModal(
            '${product.name.replace(/'/g, "\\'")}',
            '${formatPrice(product.price)} / ${product.duration || 'per event'}'
          )">
          Book Now
        </button>
      </div>
    </div>
  `;

  return card;
}

/**
 * Render the jewellery grid based on current filters
 * Uses the in-memory allProducts cache (kept fresh by Firestore listener)
 */
function renderGrid() {
  jewelleryGrid.innerHTML = '';

  const filtered = allProducts.filter(p => {
    const matchCat  = activeCategory === 'all' || p.category === activeCategory;
    const matchSrch = p.name.toLowerCase().includes(activeSearch.toLowerCase())
                   || p.description.toLowerCase().includes(activeSearch.toLowerCase());
    return matchCat && matchSrch;
  });

  if (filtered.length === 0) {
    noResults.style.display = 'block';
  } else {
    noResults.style.display = 'none';
    filtered.forEach((p, i) => {
      const card = createJewelCard(p);
      card.style.transitionDelay = `${Math.min(i * 0.06, 0.5)}s`;
      jewelleryGrid.appendChild(card);
    });

    // Re-observe new cards for scroll reveal
    setTimeout(() => {
      const newCards   = jewelleryGrid.querySelectorAll('.jewel-card');
      const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            cardObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      newCards.forEach(c => cardObserver.observe(c));
    }, 50);
  }
}

/**
 * Subscribe to Firestore — grid updates automatically on any device
 * whenever the admin adds / edits / deletes a product.
 */
try {
  productsRef.orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
    allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderGrid();
  }, (err) => {
    console.error('Firestore error:', err);
  });
} catch (err) {
  console.error('Firestore init error:', err);
}

// Filter buttons
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = btn.dataset.cat;
    renderGrid();
  });
});

// Search input — debounced
let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    activeSearch = searchInput.value.trim();
    renderGrid();
  }, 280);
});

/* ─── TESTIMONIAL SLIDER ────────────────────────────────────── */
const track    = document.getElementById('testimonialTrack');
const dotsWrap = document.getElementById('sliderDots');
const prevBtn  = document.getElementById('prevBtn');
const nextBtn  = document.getElementById('nextBtn');

let currentSlide  = 0;
let autoSlideTimer;

function getSlidesPerView() {
  if (window.innerWidth < 600)  return 1;
  if (window.innerWidth < 1024) return 2;
  return 3;
}

function initSlider() {
  const slides = track.querySelectorAll('.testimonial-card');
  const spv    = getSlidesPerView();
  const total  = Math.ceil(slides.length / spv);

  dotsWrap.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('button');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => goToSlide(i));
    dotsWrap.appendChild(dot);
  }

  goToSlide(0);
  startAutoSlide(total);
}

function goToSlide(idx) {
  const slides = track.querySelectorAll('.testimonial-card');
  const spv    = getSlidesPerView();
  const total  = Math.ceil(slides.length / spv);

  currentSlide = ((idx % total) + total) % total;

  const cardW  = track.parentElement.offsetWidth;
  const gapPx  = 24;
  const itemW  = (cardW - gapPx * (spv - 1)) / spv;
  const offset = currentSlide * (itemW + gapPx);
  track.style.transform = `translateX(-${offset}px)`;

  dotsWrap.querySelectorAll('.dot').forEach((d, i) => {
    d.classList.toggle('active', i === currentSlide);
  });
}

function startAutoSlide(total) {
  clearInterval(autoSlideTimer);
  autoSlideTimer = setInterval(() => goToSlide(currentSlide + 1), 4500);
}

prevBtn.addEventListener('click', () => {
  const spv   = getSlidesPerView();
  const total = Math.ceil(track.querySelectorAll('.testimonial-card').length / spv);
  goToSlide(currentSlide - 1);
  clearInterval(autoSlideTimer);
  startAutoSlide(total);
});

nextBtn.addEventListener('click', () => {
  const spv   = getSlidesPerView();
  const total = Math.ceil(track.querySelectorAll('.testimonial-card').length / spv);
  goToSlide(currentSlide + 1);
  clearInterval(autoSlideTimer);
  startAutoSlide(total);
});

window.addEventListener('resize', initSlider);
initSlider();

/* ─── BOOK NOW MODAL ────────────────────────────────────────── */
function openBookModal(name, price) {
  modalItemName.textContent  = name;
  modalItemPrice.textContent = price;
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

modalForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name  = document.getElementById('mName').value.trim();
  const phone = document.getElementById('mPhone').value.trim();
  const date  = document.getElementById('mDate').value;

  if (!name || !phone || !date) {
    alert('Please fill in all required fields.');
    return;
  }

  const msg = encodeURIComponent(
    `Hi Alankar! I'd like to book:\n\n` +
    `Jewellery: ${modalItemName.textContent}\n` +
    `Price: ${modalItemPrice.textContent}\n` +
    `Name: ${name}\n` +
    `Phone: ${phone}\n` +
    `Event Date: ${date}\n\n` +
    `Please confirm availability. Thank you!`
  );

  window.open(`https://wa.me/919100582369?text=${msg}`, '_blank');
  closeModal();
  modalForm.reset();
});

/* ─── CONTACT FORM ──────────────────────────────────────────── */
const contactForm = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

contactForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name     = document.getElementById('fname').value.trim();
  const phone    = document.getElementById('fphone').value.trim();
  const email    = document.getElementById('femail').value.trim();
  const occasion = document.getElementById('foccasion').value;
  const date     = document.getElementById('fdate').value;
  const message  = document.getElementById('fmessage').value.trim();

  if (!name || !phone || !occasion || !date) {
    alert('Please fill all required fields.');
    return;
  }

  const submitBtn = contactForm.querySelector('button[type="submit"]');
  submitBtn.disabled  = true;
  submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> &nbsp; Sending…';

  emailjs.send('service_etd3mfo', 'template_ymf9z6f', {
    from_name: name,
    phone:     phone,
    email:     email || 'Not provided',
    occasion:  occasion,
    date:      date,
    message:   message || 'No additional message',
    to_email:  'alankarjewellery13@gmail.com'
  })
  .then(() => {
    formSuccess.classList.add('visible');
    contactForm.reset();
    submitBtn.disabled  = false;
    submitBtn.innerHTML = '<i class="fa fa-paper-plane"></i> &nbsp; Send Enquiry';
    setTimeout(() => formSuccess.classList.remove('visible'), 5000);
  })
  .catch((err) => {
    console.error('EmailJS error:', err);
    alert('Could not send email. Please contact us directly on WhatsApp.');
    const waMsg = encodeURIComponent(
      `New Booking Enquiry!\n\nName: ${name}\nPhone: ${phone}\nOccasion: ${occasion}\nDate: ${date}\nMessage: ${message || '—'}`
    );
    window.open(`https://wa.me/919100582369?text=${waMsg}`, '_blank');
    submitBtn.disabled  = false;
    submitBtn.innerHTML = '<i class="fa fa-paper-plane"></i> &nbsp; Send Enquiry';
  });
});

/* ─── SMOOTH SCROLL ─────────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* ─── KEYBOARD ACCESSIBILITY ────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
  }
});