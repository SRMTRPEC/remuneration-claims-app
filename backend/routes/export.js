/**
 * Export Routes
 * 
 * Excel export with ExcelJS. Supports exporting all, filtered, or selected claims.
 */

const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const { requireAdmin } = require('../middleware/auth');
const { createClaimsWorkbook, createUsersWorkbook } = require('../utils/excel');

// All export routes require admin auth
router.use(requireAdmin);

/**
 * GET /api/export/all
 */
router.get('/all', async (req, res) => {
  try {
    const { data: claims, error } = await supabase
      .from('remuneration_claims')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

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
 */
router.post('/filtered', async (req, res) => {
  try {
    const { search, department, designation, date_from, date_to, amount_min, amount_max } = req.body;
    let query = supabase.from('remuneration_claims').select('*').order('created_at', { ascending: false });

    if (search) query = query.or(`staff_name.ilike.%${search}%,staff_id.ilike.%${search}%,department.ilike.%${search}%,claim_number.ilike.%${search}%`);
    if (department) query = query.eq('department', department);
    if (designation) query = query.eq('designation', designation);
    if (date_from) query = query.gte('created_at', date_from);
    if (date_to) query = query.lte('created_at', date_to + ' 23:59:59');
    if (amount_min) query = query.gte('grand_total', parseFloat(amount_min));
    if (amount_max) query = query.lte('grand_total', parseFloat(amount_max));

    const { data: claims, error } = await query;
    if (error) throw error;

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
 */
router.post('/selected', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No claim IDs provided' });
    }

    const { data: claims, error } = await supabase
      .from('remuneration_claims')
      .select('*')
      .in('id', ids)
      .order('created_at', { ascending: false });

    if (error) throw error;

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

/**
 * GET /api/export/users
 * Exports all users
 */
router.get('/users', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const workbook = createUsersWorkbook(users);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Users_${new Date().toISOString().split('T')[0]}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export users error:', err);
    res.status(500).json({ error: 'Failed to export users' });
  }
});

module.exports = router;
