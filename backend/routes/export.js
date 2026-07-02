/**
 * Export Routes
 * 
 * Excel export with ExcelJS. Supports exporting all, filtered, or selected claims.
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../../database/init');
const { requireAdmin } = require('../middleware/auth');
const { createClaimsWorkbook } = require('../utils/excel');

// All export routes require admin auth
router.use(requireAdmin);

/**
 * GET /api/export/all
 * Export all claims as Excel
 */
router.get('/all', async (req, res) => {
  try {
    const db = getDb();
    const claims = db.prepare('SELECT * FROM remuneration_claims ORDER BY created_at DESC').all();

    const workbook = createClaimsWorkbook(claims);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=All_Claims_${new Date().toISOString().split('T')[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export all error:', err);
    res.status(500).json({ error: 'Failed to export' });
  }
});

/**
 * POST /api/export/filtered
 * Export claims matching filter criteria
 */
router.post('/filtered', async (req, res) => {
  try {
    const db = getDb();
    const { search, department, designation, date_from, date_to, amount_min, amount_max } = req.body;

    let where = [];
    let params = [];

    if (search) {
      where.push(`(staff_name LIKE ? OR staff_id LIKE ? OR department LIKE ? OR claim_number LIKE ?)`);
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (department) { where.push('department = ?'); params.push(department); }
    if (designation) { where.push('designation = ?'); params.push(designation); }
    if (date_from) { where.push('DATE(created_at) >= ?'); params.push(date_from); }
    if (date_to) { where.push('DATE(created_at) <= ?'); params.push(date_to); }
    if (amount_min) { where.push('grand_total >= ?'); params.push(parseFloat(amount_min)); }
    if (amount_max) { where.push('grand_total <= ?'); params.push(parseFloat(amount_max)); }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const claims = db.prepare(`SELECT * FROM remuneration_claims ${whereClause} ORDER BY created_at DESC`).all(...params);

    const workbook = createClaimsWorkbook(claims);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Filtered_Claims_${new Date().toISOString().split('T')[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export filtered error:', err);
    res.status(500).json({ error: 'Failed to export' });
  }
});

/**
 * POST /api/export/selected
 * Export specific claims by IDs
 */
router.post('/selected', async (req, res) => {
  try {
    const db = getDb();
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No claim IDs provided' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const claims = db.prepare(
      `SELECT * FROM remuneration_claims WHERE id IN (${placeholders}) ORDER BY created_at DESC`
    ).all(...ids);

    const workbook = createClaimsWorkbook(claims);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Selected_Claims_${new Date().toISOString().split('T')[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export selected error:', err);
    res.status(500).json({ error: 'Failed to export' });
  }
});

module.exports = router;
