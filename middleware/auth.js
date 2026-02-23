const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// ── Authenticate regular user ───────────────────────────────
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      'SELECT id, username, email, full_name FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('[Auth middleware] Error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Verify JWT token for admin users
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.cookies.adminToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify admin exists in database
    const result = await query('SELECT * FROM admins WHERE id = $1', [decoded.adminId]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Admin not found' });
    }

    req.admin = result.rows[0];
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }
};

// Check if admin has specific role
const requireAdminRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
      
      if (result.rows.length > 0) {
        req.user = result.rows[0];
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticateUser,
  authenticateAdmin,
  requireAdminRole,
  optionalAuth,
};