'use strict';

console.log('[Login Script] Loading...');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Login Script] DOMContentLoaded fired');
  
  const loginForm    = document.getElementById('loginForm');
  const loginBtn     = document.getElementById('loginBtn');
  const errorMessage = document.getElementById('errorMessage');

  // ── DEFENSIVE: Validate all elements exist ─────────────────────
  if (!loginForm || !loginBtn || !errorMessage) {
    console.error('[Login] ✗ CRITICAL: Required elements not found in DOM');
    console.error('[Login] Elements:', {
      loginForm: 'id=loginForm found=' + !!loginForm,
      loginBtn: 'id=loginBtn found=' + !!loginBtn,
      errorMessage: 'id=errorMessage found=' + !!errorMessage,
    });
    console.error('[Login] ✗ WITHOUT these elements, native form submission will occur!');
    return;
  }
  
  console.log('[Login] ✓ All form elements found. Attaching event listener...');

  loginForm.addEventListener('submit', async (e) => {
    console.log('[Login] ▶ SUBMIT handler triggered');
    e.preventDefault();
    console.log('[Login] ✓ preventDefault() called - form will NOT submit natively');

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    if (!usernameInput || !passwordInput) {
      console.error('[Login] ✗ Input fields not found');
      return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    console.log('[Login] Form data collected:', { username: username, passwordLength: password.length });

    // Clear previous errors
    errorMessage.classList.add('hidden');
    errorMessage.textContent = '';

    // Validation
    if (!username || !password) {
      console.warn('[Login] ⚠ Validation failed: missing credentials');
      errorMessage.textContent = 'Please enter both username and password';
      errorMessage.classList.remove('hidden');
      return;
    }

    // Disable button
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in…';

    try {
      console.log('[Login] ▶ Attempting POST /auth/login...');
      console.log('[Login] Sending:', { username, passwordLength: password.length });

      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      console.log('[Login] ◀ Response received');
      console.log('[Login] Response status:', res.status);
      console.log('[Login] Response URL:', res.url);
      console.log('[Login] Content-Type:', res.headers.get('content-type'));

      // Check content type
      const contentType = res.headers.get('content-type');

      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
        console.log('[Login] ✓ Response is JSON:', data);
      } else {
        const text = await res.text();
        console.error('[Login] ✗ Response is NOT JSON, received:', text.substring(0, 200));
        throw new Error('Server returned HTML instead of JSON. Check server logs.');
      }

      if (!res.ok) {
        console.error('[Login] ✗ Login failed with status', res.status);
        throw new Error(data.error || `Login failed (HTTP ${res.status})`);
      }

      // ── SUCCESS ────────────────────────────────────────────
      console.log('[Login] ✓✓✓ LOGIN SUCCESSFUL ✓✓✓');
      console.log('[Login] Response status:', res.status);
      console.log('[Login] User data:', data.user);

      // Check if cookie was set
      console.log('[Login] Before redirect - Document.cookie:', document.cookie || '(no cookies yet)');

      // Wait a moment for cookie to be written
      console.log('[Login] Waiting 200ms for cookie persistence...');
      await new Promise(resolve => setTimeout(resolve, 200));

      console.log('[Login] After wait - Document.cookie:', document.cookie || '(still no cookies)');
      console.log('[Login] ▶▶▶ NOW REDIRECTING TO /dashboard.html ▶▶▶');
      window.location.href = '/dashboard.html';

    } catch (err) {
      console.error('[Login] ✗ Error:', err);
      errorMessage.textContent = err.message || 'Login failed. Please try again.';
      errorMessage.classList.remove('hidden');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    }
  });

  console.log('[Login] Event listener attached to form');
});