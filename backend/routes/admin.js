/**
 * Admin Routes
 * 
 * Dashboard stats and audit log viewing.
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../../database/init');
const { requireAdmin } = require('../middleware/auth');

// All admin routes require authentication
router.use(requireAdmin);

/**
 * GET /api/admin/audit-log
 * Get the audit trail with pagination
 */
router.get('/audit-log', (req, res) => {
  try {
    const db = getDb();
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const { total } = db.prepare('SELECT COUNT(*) as total FROM audit_log').get();

    const logs = db.prepare(`
      SELECT * FROM audit_log 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Audit log error:', err);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

/**
 * GET /api/admin/departments
 * Get list of unique departments for filter dropdowns
 */
router.get('/departments', (req, res) => {
  try {
    const db = getDb();
    const departments = db.prepare(
      'SELECT DISTINCT department FROM remuneration_claims ORDER BY department'
    ).all().map(r => r.department);

    res.json({ departments });
  } catch (err) {
    console.error('Departments error:', err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

module.exports = router;
