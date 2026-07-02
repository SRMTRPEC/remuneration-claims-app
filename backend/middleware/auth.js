/**
 * Authentication Middleware
 * 
 * JWT-based authentication for admin-only routes.
 * Token is stored in an httpOnly cookie for security.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';

/**
 * Verify JWT token from cookie or Authorization header
 * Attaches admin info to req.admin if valid
 */
function verifyToken(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Require admin authentication for a route
 */
function requireAdmin(req, res, next) {
  verifyToken(req, res, next);
}

/**
 * Generate a JWT token for an admin
 */
function generateToken(admin) {
  return jwt.sign(
    { id: admin.id, username: admin.username, fullName: admin.full_name },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

module.exports = { verifyToken, requireAdmin, generateToken };
