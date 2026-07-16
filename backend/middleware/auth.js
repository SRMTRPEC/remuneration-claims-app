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
    req.user = decoded; // Generic user
    if (decoded.role === 'admin') {
      req.admin = decoded;
    } else if (decoded.role === 'staff') {
      req.staff = decoded;
    } else {
      // Fallback for legacy admin tokens without role
      req.admin = decoded;
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Require admin authentication for a route
 */
function requireAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (req.admin) return next();
    return res.status(403).json({ error: 'Admin access required' });
  });
}

/**
 * Require staff authentication for a route
 */
function requireStaff(req, res, next) {
  verifyToken(req, res, () => {
    if (req.staff || req.admin) return next(); // Admins can act as staff if needed? Or just req.staff
    return res.status(403).json({ error: 'Staff access required' });
  });
}

/**
 * Generate a JWT token for an admin
 */
function generateToken(admin) {
  return jwt.sign(
    { id: admin.id, username: admin.username, fullName: admin.full_name, role: 'admin' },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

/**
 * Generate a JWT token for staff
 */
function generateStaffToken(staff) {
  return jwt.sign(
    { id: staff.id, staff_id: staff.staff_id, staff_name: staff.staff_name, department: staff.department, staff_type: staff.staff_type, role: 'staff' },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

module.exports = { verifyToken, requireAdmin, requireStaff, generateToken, generateStaffToken };
