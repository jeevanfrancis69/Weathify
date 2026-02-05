const jwt = require('jsonwebtoken');
const pool = require('../config/database');

/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    req.user = user;
    next();
  });
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT au.admin_id 
       FROM admin_users au
       WHERE au.user_id = $1`,
      [req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
    
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin
};
