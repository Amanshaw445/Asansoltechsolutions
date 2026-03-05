// ── Your Google Apps Script backend URL ──────────────────────────
const REVIEWS_API = "https://script.google.com/macros/s/AKfycbzTCkwhZeep4h5jA7035ZtPZGW1vLc8zo0vt4qsF6QxCZ-t5SNbo-yGcGj0wzjPyfIOtA/exec";

// ── Pagination State ──────────────────────────────────────────
let allReviews = []; 
let currentIndex = 0; 
const REVIEWS_PER_PAGE = 3; 

// ── Navbar scroll ────────────────────────────────────────────────
window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20)
})

// ── Mobile menu ─────────────────────────────────────────────────
function toggleMenu() {
    document.getElementById('mobileMenu').classList.toggle('open')
}

// ── Scroll reveal ────────────────────────────────────────────────
const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
}, { threshold: 0.12 })

function observeCards() {
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
}

// ── Smooth scroll ────────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
        const target = document.querySelector(a.getAttribute('href'))
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }) }
    })
})

function smoothScrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

// ── Star rating picker ───────────────────────────────────────────
let selectedRating = 0;
document.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => highlightStars(+btn.dataset.val))
    btn.addEventListener('mouseleave', () => highlightStars(selectedRating))
    btn.addEventListener('click', () => {
        selectedRating = +btn.dataset.val;
        document.getElementById('fb-rating').value = selectedRating;
        highlightStars(selectedRating);
    })
})

function highlightStars(n) {
    document.querySelectorAll('.star-btn').forEach(b => {
        b.classList.toggle('active', +b.dataset.val <= n)
    })
}

// ── Load reviews & Pagination ───────────────────────────────────
async function loadReviews() {
    const grid = document.getElementById('reviewsGrid');
    try {
        const res = await fetch(REVIEWS_API);
        const data = await res.json();

        if (!data || data.length === 0) {
            grid.innerHTML = `<div class="reviews-empty">No reviews yet. Be the first!</div>`;
            return;
        }

        // 1. Update the Summary Header (Calculates based on ALL reviews)
        const avg = (data.reduce((s, r) => s + Number(r.rating), 0) / data.length).toFixed(1);
        document.getElementById('avgRating').textContent = avg;
        document.getElementById('avgStars').textContent = '★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg));
        document.getElementById('reviewCount').textContent = `${data.length} review${data.length !== 1 ? 's' : ''}`;
        document.getElementById('ratingSummary').style.display = 'flex';

        // 2. Prepare reviews for display (Newest first)
        allReviews = [...data].reverse();
        currentIndex = 0;
        grid.innerHTML = ''; // Clear loading spinner
        
        // 3. Show the first batch
        showMoreReviews();

    } catch (err) {
        console.error(err);
        grid.innerHTML = `<div class="reviews-loading">Could not load reviews.</div>`;
    }
}

function showMoreReviews() {
    const grid = document.getElementById('reviewsGrid');
    const loadMoreBtn = document.getElementById('loadMoreContainer');
    const colors = ['#E8440A','#0A7A6A','#7C3AED','#0369A1','#B45309'];

    const nextBatch = allReviews.slice(currentIndex, currentIndex + REVIEWS_PER_PAGE);

    nextBatch.forEach(r => {
        const initials = r.name ? r.name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) : '?';
        const stars = '★'.repeat(Math.min(5, Math.max(1, Number(r.rating))));
        const empty = '☆'.repeat(5 - Math.min(5, Math.max(1, Number(r.rating))));
        const date = r.date ? new Date(r.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '';
        const colorIdx = (r.name || '').charCodeAt(0) % colors.length;

        const card = document.createElement('div');
        card.className = 'review-card reveal';
        card.innerHTML = `
            <div class="review-header">
                <div class="review-avatar" style="background:${colors[colorIdx]}">${initials}</div>
                <div>
                    <div class="review-name">${escapeHtml(r.name)}</div>
                    ${date ? `<div class="review-date">${date}</div>` : ''}
                </div>
            </div>
            <div class="review-stars">${stars}<span style="color:var(--border)">${empty}</span></div>
            <div class="review-text">${escapeHtml(r.review)}</div>
        `;
        grid.appendChild(card);
    });

    currentIndex += REVIEWS_PER_PAGE;

    // Toggle button visibility
    if (loadMoreBtn) {
        loadMoreBtn.style.display = (currentIndex >= allReviews.length) ? 'none' : 'block';
    }

    // Trigger reveal animation for new cards
    observeCards();
}

function escapeHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Submit feedback ─────────────────────────────────────────────
async function submitFeedback() {
    const name   = document.getElementById('fb-name').value.trim();
    const rating = document.getElementById('fb-rating').value;
    const review = document.getElementById('fb-review').value.trim();
    const btn    = document.getElementById('feedbackSubmitBtn');

    if (!name || !rating || !review) { alert('Please fill all fields.'); return; }

    btn.disabled = true;
    btn.innerHTML = 'Submitting...';

    try {
        await fetch(REVIEWS_API, {
            method: 'POST',
            body: JSON.stringify({ name, rating, review })
        });
        document.getElementById('feedbackFormFields').style.display = 'none';
        document.getElementById('feedbackSuccess').style.display = 'block';
        setTimeout(loadReviews, 1000);
    } catch (err) {
        btn.disabled = false;
        btn.innerHTML = 'Submit Review ★';
        alert('Error submitting feedback.');
    }
}

// ── Submit contact form (Supabase) ──────────────────────────────
async function submitForm() {
    const name    = document.getElementById('f-name').value.trim()
    const phone   = document.getElementById('f-phone').value.trim()
    const email   = document.getElementById('f-email').value.trim()
    const service = document.getElementById('f-service').value
    const message = document.getElementById('f-message').value.trim()

    if (!name || !phone) { alert('Please enter name and phone.'); return; }

    const SUPABASE_URL = 'https://nvudxiikqxdacctcnvqm.supabase.co'
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // (Your key)

    try {
        const { createClient } = supabase
        const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        await sb.from('enquiries').insert([{ name, phone, email, service, message }])
    } catch(e) {}

    document.getElementById('form-fields').style.display = 'none'
    document.getElementById('form-success').style.display = 'block'
}

// ── Init ────────────────────────────────────────────────────────
loadReviews();
observeCards();