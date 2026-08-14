'use strict';

// ── FIX: Wait for DOM to be ready before getting elements ─────────
document.addEventListener('DOMContentLoaded', () => {
  const registerForm    = document.getElementById('registerForm');
  const registerBtn     = document.getElementById('registerBtn');
  const errorMessage    = document.getElementById('errorMessage');
  const successMessage  = document.getElementById('successMessage');

  // ── DEFENSIVE: Check all elements exist ─────────────────────────
  if (!registerForm || !registerBtn || !errorMessage || !successMessage) {
    console.error('[Register] ✗ Required elements not found in DOM');
    console.error('[Register] registerForm:', !!registerForm);
    console.error('[Register] registerBtn:', !!registerBtn);
    console.error('[Register] errorMessage:', !!errorMessage);
    console.error('[Register] successMessage:', !!successMessage);
    return;
  }

  console.log('[Register] ✓ All form elements found, attaching listener');

  // ── CRITICAL: Must prevent default form submission ───────────
  registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();  // ← CRITICAL: Prevents page refresh
  console.log('[Register] ▶ SUBMIT handler triggered');

  const username        = document.getElementById('username').value.trim();
  const email           = document.getElementById('email').value.trim();
  const full_name       = document.getElementById('full_name').value.trim();
  const password        = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  // Clear messages
  errorMessage.classList.add('hidden');
  successMessage.classList.add('hidden');
  errorMessage.textContent = '';
  successMessage.textContent = '';

  // Validate passwords match
  if (password !== confirmPassword) {
    errorMessage.textContent = 'Passwords do not match';
    errorMessage.classList.remove('hidden');
    return;
  }

  // Disable button
  registerBtn.disabled = true;
  registerBtn.textContent = 'Creating account…';

  try {
    console.log('[Register] Sending request to /auth/register'); // DEBUG

    const res = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',  // ← CRITICAL for cookies
      body: JSON.stringify({ 
        username, 
        email, 
        password, 
        full_name: full_name || null,
      }),
    });

    console.log('[Register] Response status:', res.status); // DEBUG

    // ── Handle non-JSON responses ────────────────────────────
    const contentType = res.headers.get('content-type');
    
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
      console.log('[Register] Response data:', data); // DEBUG
    } else {
      const text = await res.text();
      console.error('[Register] Non-JSON response:', text.substring(0, 200));
      throw new Error('Server returned invalid response (HTML instead of JSON)');
    }

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    // ── Success ──────────────────────────────────────────────
    console.log('[Register] Success, user created:', data.user.username);
    
    successMessage.textContent = 'Account created! Redirecting...';
    successMessage.classList.remove('hidden');

    setTimeout(() => {
      console.log('[Register] Redirecting to dashboard');
      window.location.href = '/dashboard.html';
    }, 1500);

  } catch (err) {
    console.error('[Register] Error:', err);
    errorMessage.textContent = err.message || 'Registration failed';
    errorMessage.classList.remove('hidden');
    registerBtn.disabled = false;
    registerBtn.textContent = 'Create Account';
  }
  });

  console.log('[Register] Event listener attached to form');
});