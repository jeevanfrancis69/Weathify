'use client';

import { FormEvent, useEffect, useState } from 'react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // The original page relied on this body class for the auth stylesheet.
    document.body.classList.add('auth-page');

    return () => {
      document.body.classList.remove('auth-page');
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    console.log('[Login] ✓ preventDefault() called - form will NOT submit natively');

    const trimmedUsername = username.trim();
    console.log('[Login] Form data collected:', {
      username: trimmedUsername,
      passwordLength: password.length,
    });

    setErrorMessage('');

    if (!trimmedUsername || !password) {
      console.warn('[Login] ⚠ Validation failed: missing credentials');
      setErrorMessage('Please enter both username and password');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('[Login] ▶ Attempting POST /auth/login...');
      console.log('[Login] Sending:', {
        username: trimmedUsername,
        passwordLength: password.length,
      });

      const res = await fetch(`${process.env.NEXT_PUBLIC_EXPRESS_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: trimmedUsername,
          password,
        }),
      });

      console.log('[Login] ◀ Response received');
      console.log('[Login] Response status:', res.status);
      console.log('[Login] Response URL:', res.url);
      console.log('[Login] Content-Type:', res.headers.get('content-type'));

      const contentType = res.headers.get('content-type');
      let data: { error?: string; user?: unknown };

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

      console.log('[Login] ✓✓✓ LOGIN SUCCESSFUL ✓✓✓');
      console.log('[Login] Response status:', res.status);
      console.log('[Login] User data:', data.user);
      console.log(
        '[Login] Before redirect - Document.cookie:',
        document.cookie || '(no cookies yet)',
      );
      console.log('[Login] Waiting 200ms for cookie persistence...');

      await new Promise((resolve) => setTimeout(resolve, 200));

      console.log(
        '[Login] After wait - Document.cookie:',
        document.cookie || '(still no cookies)',
      );
      console.log('[Login] ▶▶▶ NOW REDIRECTING TO /dashboard ▶▶▶');
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('[Login] ✗ Error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Login failed. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <link rel="stylesheet" href="/css/auth.css" />

      <header className="auth-header">
        <a href="/" className="auth-header__logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 9C3 9 4.5 7 7 7C9.5 7 10.5 9 13 9C15.5 9 16.5 7 19 7C21.5 7 22 9 22 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M3 14C3 14 4.5 12 7 12C9.5 12 10.5 14 13 14C15.5 14 16.5 12 19 12C21.5 12 22 14 22 14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span>Weathify</span>
        </a>
      </header>

      <div className="auth-container">
        <div className="auth-box">
          <h2 className="auth-title">Otha</h2>
          <p className="auth-subtitle">Sign in to continue to your dashboard</p>

          <div
            className={`alert alert-error${errorMessage ? '' : ' hidden'}`}
            id="errorMessage"
          >
            {errorMessage}
          </div>

          <form id="loginForm" className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                placeholder="Enter your username"
                autoComplete="username"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              id="loginBtn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            Don&apos;t have an account? <a href="/register.html">Create one</a>
          </div>
        </div>
      </div>
    </>
  );
}
