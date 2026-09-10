const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const { query }= require('../config/database');

// Add this if it's missing!

/* eslint-disable-next-line no-unused-vars */
const { body, validationResult } = require('express-validator');

// const SALT_ROUNDS = 10;

router.use((req, res, next) => {
  // Override res.sendFile to prevent accidental HTML responses

  /* eslint-disable no-unused-vars*/
  const originalSendFile = res.sendFile.bind(res);
  res.sendFile = function(...args) {
    console.warn('[Auth Route] Attempted to send file instead of JSON:', args);
    return res.status(500).json({ error: 'Server misconfiguration' });
  };
  next();
});


// ============================================================
// REGISTER NEW USER
// ============================================================
router.post('/register', async (req, res) => {
  try {
    // ── DEBUG: Log incoming request ──────────────────────────
    console.log('[Register] Request body:', req.body);

    const { username, email, password, full_name } = req.body;

    // ── Manual validation ────────────────────────────────────
    const errors = [];

    if (!username || username.trim().length < 3 || username.trim().length > 30) {
      errors.push('Username must be 3-30 characters');
    }

    if (username && !/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, - and _');
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Valid email required');
    }

    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    if (errors.length > 0) {
      console.log('[Register] Validation errors:', errors);
      return res.status(400).json({ error: errors[0], fields: errors });
    }

    // ── Check existing username ──────────────────────────────
    const existingUser = await query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );

    if (existingUser.rows.length > 0) {
      console.log('[Register] Username already exists:', username);
      return res.status(409).json({ error: 'Username already taken' });
    }

    // ── Check existing email ─────────────────────────────────
    const existingEmail = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (existingEmail.rows.length > 0) {
      console.log('[Register] Email already exists:', email);
      return res.status(409).json({ error: 'Email already registered' });
    }

    // ── Hash password ────────────────────────────────────────
    // CRITICAL: Ensure bcrypt is imported at top of file
    const bcrypt = require('bcrypt');
    const SALT_ROUNDS = 10;
    
    console.log('[Register] Hashing password...');
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    console.log('[Register] Password hashed successfully');

    // ── Insert user ──────────────────────────────────────────
    const result = await query(
      `INSERT INTO users (username, email, password_hash, full_name, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, username, email, full_name, created_at`,
      [
        username.trim().toLowerCase(),
        email.trim().toLowerCase(),
        password_hash,  // ← CRITICAL: Must be hashed password
        full_name?.trim() || null,
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Database insert failed');
    }

    const user = result.rows[0];
    console.log('[Register] User created:', user.id, user.username);

    // ── Generate token ───────────────────────────────────────
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // ── Set cookie ───────────────────────────────────────────
    res.cookie('token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   7 * 24 * 60 * 60 * 1000,
      path:     '/',
    });

    console.log('[Register] Cookie set, responding with success');

    // ── Update last_login ────────────────────────────────────
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // ── SUCCESS RESPONSE (MUST BE JSON) ──────────────────────
    return res.status(201).json({
      success: true,
      user: {
        id:        user.id,
        username:  user.username,
        email:     user.email,
        full_name: user.full_name,
      },
    });

  } catch (error) {
    console.error('[Register] Error:', error.message);
    console.error('[Register] Stack:', error.stack);

     if (error.code === 'ECONNREFUSED') {
      return res.status(500).json({ 
        error: 'Database connection failed. Server may be starting up.',
        hint: 'Wait a moment and try again. Contact admin if problem persists.',
      });
    }

    if (error.code === '3D000') {
      return res.status(500).json({ 
        error: 'Database does not exist.',
        hint: 'Run: sudo -u postgres psql -c "CREATE DATABASE weathify_db;"',
      });
    }

    if (error.code === '42P01') {
      return res.status(500).json({ 
        error: 'Database tables not initialized.',
        hint: 'Run migration: psql -U postgres -d weathify_db -f database/schema.sql',
      });
    }

    if (error.code === '42703') {
      return res.status(500).json({ 
        error: 'Database schema outdated.',
        hint: 'Run migration: psql -U postgres -d weathify_db -f database/reconcile_auth.sql',
      });
    }

    if (error.code === '23505') {
      return res.status(409).json({ 
        error: 'Username or email already exists',
      });
    }

    // Generic error
    return res.status(500).json({ 
      error: 'Registration failed. Check server logs.',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});
// LOGIN
router.post('/login', async (req, res) => {
  try {
    console.log('[Login] ========================================');
    console.log('[Login] POST /auth/login received');
    console.log('[Login] Request body:', req.body);
    console.log('[Login] Request headers:', req.headers);
    console.log('[Login] Content-Type:', req.headers['content-type']);

    const { username, password } = req.body;

    if (!username || !password) {
      console.log('[Login] Missing credentials');
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Find user
    console.log('[Login] Looking up user:', username);
    
    const result = await query(
      `SELECT id, username, email, password_hash, full_name, is_active
       FROM users
       WHERE LOWER(username) = LOWER($1)`,
      [username.trim()]
    );

    if (result.rows.length === 0) {
      console.log('[Login] User not found:', username);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    console.log('[Login] User found:', {
      id: user.id,
      username: user.username,
      is_active: user.is_active,
      has_password_hash: !!user.password_hash,
    });

    // Check if active
    if (!user.is_active) {
      console.log('[Login] Account disabled');
      return res.status(403).json({ error: 'Account is disabled' });
    }

    // Check password hash exists
    if (!user.password_hash) {
      console.error('[Login] ✗ No password hash for user');
      return res.status(500).json({ 
        error: 'Account misconfigured. Please contact support.',
      });
    }

    // Verify password
    const bcrypt = require('bcrypt');
    console.log('[Login] Verifying password...');
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    console.log('[Login] Password valid:', validPassword);

    if (!validPassword) {
      console.log('[Login] Invalid password');
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('[Login] Token generated');

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   7 * 24 * 60 * 60 * 1000,
      path:     '/',
    });

    console.log('[Login] Cookie set');

    // Update last login
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    console.log('[Login] ✓ Login successful, sending JSON response');
    console.log('[Login] Response will include cookie:', {
      name: 'token',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: '7d (604800000ms)',
      path: '/',
    });

    // ── CRITICAL: MUST return JSON, NOT redirect ────────────
    return res.status(200).json({
      success: true,
      user: {
        id:        user.id,
        username:  user.username,
        email:     user.email,
        full_name: user.full_name,
      },
    });

  } catch (error) {
    console.error('[Login] ✗ Exception in /auth/login:', error.message);
    console.error('[Login] Stack trace:', error.stack);
    return res.status(500).json({ 
      error: 'Login failed. Check server logs.',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});
// GET CURRENT USER (/auth/me)
router.get('/me', async (req, res) => {
  try {
    // ── DEBUG LOGGING ───────────────────────────────────────
    console.log('[/auth/me] GET /auth/me called');
    console.log('[/auth/me] Cookies received:', Object.keys(req.cookies || {}));
    console.log('[/auth/me] Token cookie present:', !!req.cookies?.token);
    console.log('[/auth/me] Authorization header:', req.headers?.authorization ? 'present' : 'missing');
    
    const token = req.cookies?.token || req.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      console.log('[/auth/me] ✗ No token found - user not authenticated');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('[/auth/me] ✓ Token valid, userId:', decoded.userId);
    } catch (jwtError) {
      console.log('[/auth/me] ✗ Token verification failed:', jwtError.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const result = await query(
      `SELECT id, username, email, full_name, created_at, last_login
       FROM users
       WHERE id = $1 AND is_active = true`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      console.log('[/auth/me] ✗ User not found:', decoded.userId);
      return res.status(401).json({ error: 'User not found' });
    }

    console.log('[/auth/me] ✓ Auth successful, returning user:', result.rows[0].username);
    return res.json({ user: result.rows[0] });

  } catch (error) {
    console.error('[/auth/me] Error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// LOGOUT
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
  });
  return res.json({ success: true, message: 'Logged out' });
});

// ADMIN LOGIN 
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await query('SELECT * FROM admins WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await query('UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [admin.id]);

    const token = jwt.sign(
      { adminId: admin.id, username: admin.username, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.cookie('adminToken', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   28800000,
      path:     '/',
    });

    return res.json({
      success: true,
      admin: { id: admin.id, username: admin.username, email: admin.email, role: admin.role },
      token,
    });
  } catch (error) {
    console.error('[Admin login]', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/admin/logout', (req, res) => {
  res.clearCookie('adminToken', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
  });
  return res.json({ success: true });
});

router.get('/admin/me', async (req, res) => {
  try {
    const token = req.cookies?.adminToken || req.headers?.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query('SELECT id, username, email, role FROM admins WHERE id = $1', [decoded.adminId]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Admin not found' });

    return res.json({ admin: result.rows[0] });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;