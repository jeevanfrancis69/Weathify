const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { authenticateAdmin } = require('../middleware/auth');
const xss = require('xss');

// Spotify OAuth Login
router.get('/spotify', passport.authenticate('spotify', {
  scope: ['user-read-email', 'user-read-private'],
}));

// Spotify OAuth Callback
router.get('/spotify/callback',
  passport.authenticate('spotify', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        { userId: req.user.id, spotify_id: req.user.spotify_id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '1h' }
      );

      // Set cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600000, // 1 hour
      });

      // Redirect to frontend
      res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/login?error=auth_failed');
    }
  }
);

// Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Validates input and injection safeguard measures

    if (typeof username !== 'string' || typeof password !== 'string'){
      return res.status(400).json({error: 'Input must be of TYPE String'});

    }  
    
    if (username.length > 50) {
      return res.status(400).json({error: 'Username entered exceeds max char length' });
    } else if (password.length > 100) {
      return res.status(400).json({error: 'Password entered exceeds max char length'});
    }

    // Protection from XSS and SQL injection attacks
    const NewUsername = xss(username.trim());

    // Find admin
    const result = await query(
      'SELECT * FROM admins WHERE username = $1',
      [NewUsername]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await query(
      'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [admin.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { adminId: admin.id, username: admin.username, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Set cookie
    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 28800000, // 8 hours
    });

    res.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
      token,
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

//Password hashing using Bcrypt

router.post('/admin/register' , async (req, res) => {

  try{

    const {username, email, password } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ error: 'We need all fields for hashing to proceed'});

    }

    const hashed_password = await bcrypt.hash(password, 10);

    await query(
      'INSERT INTO admins (username, email, hashed_password) VALUES ($1, $2, $3)',
      [username, email, hashed_password]
    );

    res.json({success: true, message: 'Admin has been successfully created'});

  } catch (error) {
    res.status(500).json({ error: 'The regestration has failed'});

  }
});

// Admin Logout
router.post('/admin/logout', authenticateAdmin, (req, res) => {
  res.clearCookie('adminToken');
  res.json({ success: true, message: 'Logged out successfully' });
});

// User Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      'SELECT id, spotify_id, email, display_name, profile_image_url FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Get current admin
router.get('/admin/me', authenticateAdmin, (req, res) => {
  res.json({
    admin: {
      id: req.admin.id,
      username: req.admin.username,
      email: req.admin.email,
      role: req.admin.role,
    },
  });
});

module.exports = router;