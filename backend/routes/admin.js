/**
 * Admin Routes
 * 
 * Dashboard stats and audit log viewing.
 */

const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const { requireAdmin } = require('../middleware/auth');

// All admin routes require authentication
router.use(requireAdmin);

/**
 * GET /api/admin/audit-log
 * Get the audit trail with pagination
 */
router.get('/audit-log', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const { data: logs, count, error } = await supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
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
router.get('/departments', async (req, res) => {
  try {
    // Supabase JS doesn't have a DISTINCT function natively without RPC.
    // So we fetch all distinct departments. If there are too many, we should use RPC.
    // For now, fetch all claims' departments and deduplicate in node.
    const { data, error } = await supabase
      .from('remuneration_claims')
      .select('department');

    if (error) throw error;

    const uniqueDepartments = [...new Set(data.map(d => d.department))].filter(Boolean).sort();

    res.json({ departments: uniqueDepartments });
  } catch (err) {
    console.error('Departments error:', err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

module.exports = router;
