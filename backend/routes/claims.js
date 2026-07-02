/**
 * Claims Routes
 * 
 * CRUD operations for remuneration claims.
 * POST is public (no login needed). All other operations require admin auth.
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../../database/init');
const { requireAdmin } = require('../middleware/auth');
const { validateClaim } = require('../middleware/validation');
const { generateClaimNumber, numberToWords, sanitize } = require('../utils/helpers');

/**
 * POST /api/claims
 * Create a new claim (public — no login required)
 */
router.post('/', validateClaim, (req, res) => {
  try {
    const db = getDb();
    const b = req.body;
    const claimNumber = generateClaimNumber();

    // Calculate amounts server-side for integrity
    let qpAmount = 0;
    if (b.qp_section_enabled) {
      const qpQty = parseInt(b.qp_quantity) || 0;
      const qpRate = b.qp_type === 'qp_with_answer_key' ? 1500 : 750;
      qpAmount = qpQty * qpRate;
    }

    const scrutinyAmount = (parseInt(b.scrutiny_quantity) || 0) * 300;
    const evalAmount = (parseInt(b.eval_scripts) || 0) * 30;

    let squadRate = 0;
    if (b.squad_session === 'Both Sessions') squadRate = 400;
    else if (b.squad_session === 'Forenoon' || b.squad_session === 'Afternoon') squadRate = 200;
    const squadAmount = (parseInt(b.squad_days) || 0) * squadRate;

    const grandTotal = qpAmount + scrutinyAmount + evalAmount + squadAmount;
    const amountInWords = numberToWords(grandTotal);

    const stmt = db.prepare(`
      INSERT INTO remuneration_claims (
        claim_number, staff_name, staff_id, department, designation,
        staff_section_enabled, qp_section_enabled, qp_type, qp_quantity, qp_rate, qp_amount,
        scrutiny_quantity, scrutiny_rate, scrutiny_amount,
        eval_appointment, eval_phase, eval_date, eval_scripts, eval_rate, eval_amount,
        squad_days, squad_session, squad_rate, squad_amount,
        grand_total, amount_in_words
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, 300, ?,
        ?, ?, ?, ?, 30, ?,
        ?, ?, ?, ?,
        ?, ?
      )
    `);

    const qpRate = b.qp_type === 'qp_with_answer_key' ? 1500 : (b.qp_type ? 750 : 0);

    const result = stmt.run(
      claimNumber,
      sanitize(b.staff_name?.trim()),
      sanitize(b.staff_id?.trim()),
      sanitize(b.department?.trim()),
      b.designation,
      b.staff_section_enabled ? 1 : 0,
      b.qp_section_enabled ? 1 : 0,
      b.qp_type || null,
      parseInt(b.qp_quantity) || 0,
      qpRate,
      qpAmount,
      parseInt(b.scrutiny_quantity) || 0,
      scrutinyAmount,
      b.eval_appointment || null,
      b.eval_phase || null,
      b.eval_date || null,
      parseInt(b.eval_scripts) || 0,
      evalAmount,
      parseInt(b.squad_days) || 0,
      b.squad_session || null,
      squadRate,
      squadAmount,
      grandTotal,
      amountInWords
    );

    // Log the creation in audit
    db.prepare(`
      INSERT INTO audit_log (claim_id, claim_number, action, admin_name, changes)
      VALUES (?, ?, 'created', 'System (Public Form)', ?)
    `).run(result.lastInsertRowid, claimNumber, JSON.stringify({ staff_name: b.staff_name, grand_total: grandTotal }));

    res.status(201).json({
      success: true,
      claim: {
        id: result.lastInsertRowid,
        claim_number: claimNumber,
        grand_total: grandTotal,
        amount_in_words: amountInWords
      }
    });
  } catch (err) {
    console.error('Create claim error:', err);
    res.status(500).json({ error: 'Failed to save claim' });
  }
});

/**
 * GET /api/claims
 * List all claims with search, filter, sort, pagination (admin only)
 */
router.get('/', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const {
      search, department, designation, date_from, date_to,
      amount_min, amount_max, sort, order, page, limit
    } = req.query;

    let where = [];
    let params = [];

    // Search across multiple fields
    if (search) {
      where.push(`(
        staff_name LIKE ? OR staff_id LIKE ? OR department LIKE ? OR
        designation LIKE ? OR claim_number LIKE ?
      )`);
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Filters
    if (department) {
      where.push('department = ?');
      params.push(department);
    }
    if (designation) {
      where.push('designation = ?');
      params.push(designation);
    }
    if (date_from) {
      where.push('DATE(created_at) >= ?');
      params.push(date_from);
    }
    if (date_to) {
      where.push('DATE(created_at) <= ?');
      params.push(date_to);
    }
    if (amount_min) {
      where.push('grand_total >= ?');
      params.push(parseFloat(amount_min));
    }
    if (amount_max) {
      where.push('grand_total <= ?');
      params.push(parseFloat(amount_max));
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    // Sorting
    let orderBy = 'created_at DESC'; // Default: newest first
    if (sort === 'oldest') orderBy = 'created_at ASC';
    else if (sort === 'highest') orderBy = 'grand_total DESC';
    else if (sort === 'lowest') orderBy = 'grand_total ASC';
    else if (sort === 'name') orderBy = 'staff_name ASC';

    // Pagination
    const pageNum = parseInt(page) || 1;
    const pageSize = Math.min(parseInt(limit) || 20, 100);
    const offset = (pageNum - 1) * pageSize;

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM remuneration_claims ${whereClause}`;
    const { total } = db.prepare(countQuery).get(...params);

    // Get paginated data
    const dataQuery = `
      SELECT * FROM remuneration_claims 
      ${whereClause} 
      ORDER BY ${orderBy} 
      LIMIT ? OFFSET ?
    `;
    const claims = db.prepare(dataQuery).all(...params, pageSize, offset);

    res.json({
      claims,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (err) {
    console.error('List claims error:', err);
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

/**
 * GET /api/claims/stats
 * Dashboard statistics (admin only)
 */
router.get('/stats', requireAdmin, (req, res) => {
  try {
    const db = getDb();

    const totalClaims = db.prepare('SELECT COUNT(*) as count FROM remuneration_claims').get();
    const todayClaims = db.prepare(
      "SELECT COUNT(*) as count FROM remuneration_claims WHERE DATE(created_at) = DATE('now')"
    ).get();
    const totalAmount = db.prepare(
      'SELECT COALESCE(SUM(grand_total), 0) as total FROM remuneration_claims'
    ).get();
    const avgAmount = db.prepare(
      'SELECT COALESCE(AVG(grand_total), 0) as avg FROM remuneration_claims'
    ).get();

    // Recent claims (last 10)
    const recentClaims = db.prepare(
      'SELECT id, claim_number, staff_name, staff_id, department, designation, grand_total, created_at FROM remuneration_claims ORDER BY created_at DESC LIMIT 10'
    ).all();

    // Department-wise breakdown
    const deptBreakdown = db.prepare(
      'SELECT department, COUNT(*) as count, SUM(grand_total) as total FROM remuneration_claims GROUP BY department ORDER BY total DESC'
    ).all();

    // Unique departments for filters
    const departments = db.prepare(
      'SELECT DISTINCT department FROM remuneration_claims ORDER BY department'
    ).all().map(r => r.department);

    res.json({
      totalClaims: totalClaims.count,
      todayClaims: todayClaims.count,
      totalAmount: totalAmount.total,
      avgAmount: Math.round(avgAmount.avg * 100) / 100,
      recentClaims,
      deptBreakdown,
      departments
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── Draft routes (public — for auto-save) ───────────────────────────
// NOTE: These MUST be defined before /:id to prevent "draft" matching as a claim ID

/**
 * POST /api/claims/draft
 * Save or update a form draft
 */
router.post('/draft', (req, res) => {
  try {
    const db = getDb();
    const { session_id, form_data } = req.body;

    if (!session_id || !form_data) {
      return res.status(400).json({ error: 'Session ID and form data required' });
    }

    db.prepare(`
      INSERT INTO drafts (session_id, form_data, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(session_id) DO UPDATE SET
        form_data = excluded.form_data,
        updated_at = CURRENT_TIMESTAMP
    `).run(session_id, JSON.stringify(form_data));

    res.json({ success: true });
  } catch (err) {
    console.error('Save draft error:', err);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

/**
 * GET /api/claims/draft/:sessionId
 * Retrieve a saved draft
 */
router.get('/draft/:sessionId', (req, res) => {
  try {
    const db = getDb();
    const draft = db.prepare('SELECT * FROM drafts WHERE session_id = ?').get(req.params.sessionId);

    if (!draft) {
      return res.json({ draft: null });
    }

    res.json({ draft: { ...draft, form_data: JSON.parse(draft.form_data) } });
  } catch (err) {
    console.error('Get draft error:', err);
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
});

/**
 * DELETE /api/claims/draft/:sessionId
 * Delete a draft after successful submission
 */
router.delete('/draft/:sessionId', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM drafts WHERE session_id = ?').run(req.params.sessionId);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete draft error:', err);
    res.status(500).json({ error: 'Failed to delete draft' });
  }
});

/**
 * GET /api/claims/:id
 * Get a single claim by ID (admin only)
 */
router.get('/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const claim = db.prepare('SELECT * FROM remuneration_claims WHERE id = ?').get(req.params.id);

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    res.json(claim);
  } catch (err) {
    console.error('Get claim error:', err);
    res.status(500).json({ error: 'Failed to fetch claim' });
  }
});

/**
 * PUT /api/claims/:id
 * Update a claim (admin only)
 */
router.put('/:id', requireAdmin, validateClaim, (req, res) => {
  try {
    const db = getDb();
    const b = req.body;
    const claimId = req.params.id;

    // Get old values for audit
    const oldClaim = db.prepare('SELECT * FROM remuneration_claims WHERE id = ?').get(claimId);
    if (!oldClaim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Recalculate amounts
    let qpAmount = 0;
    let qpRate = 0;
    if (b.qp_section_enabled) {
      const qpQty = parseInt(b.qp_quantity) || 0;
      qpRate = b.qp_type === 'qp_with_answer_key' ? 1500 : 750;
      qpAmount = qpQty * qpRate;
    }

    const scrutinyAmount = (parseInt(b.scrutiny_quantity) || 0) * 300;
    const evalAmount = (parseInt(b.eval_scripts) || 0) * 30;

    let squadRate = 0;
    if (b.squad_session === 'Both Sessions') squadRate = 400;
    else if (b.squad_session === 'Forenoon' || b.squad_session === 'Afternoon') squadRate = 200;
    const squadAmount = (parseInt(b.squad_days) || 0) * squadRate;

    const grandTotal = qpAmount + scrutinyAmount + evalAmount + squadAmount;
    const amountInWords = numberToWords(grandTotal);

    const stmt = db.prepare(`
      UPDATE remuneration_claims SET
        staff_name = ?, staff_id = ?, department = ?, designation = ?,
        staff_section_enabled = ?,
        qp_section_enabled = ?, qp_type = ?, qp_quantity = ?, qp_rate = ?, qp_amount = ?,
        scrutiny_quantity = ?, scrutiny_amount = ?,
        eval_appointment = ?, eval_phase = ?, eval_date = ?, eval_scripts = ?, eval_amount = ?,
        squad_days = ?, squad_session = ?, squad_rate = ?, squad_amount = ?,
        grand_total = ?, amount_in_words = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      sanitize(b.staff_name?.trim()),
      sanitize(b.staff_id?.trim()),
      sanitize(b.department?.trim()),
      b.designation,
      b.staff_section_enabled ? 1 : 0,
      b.qp_section_enabled ? 1 : 0,
      b.qp_type || null,
      parseInt(b.qp_quantity) || 0,
      qpRate,
      qpAmount,
      parseInt(b.scrutiny_quantity) || 0,
      scrutinyAmount,
      b.eval_appointment || null,
      b.eval_phase || null,
      b.eval_date || null,
      parseInt(b.eval_scripts) || 0,
      evalAmount,
      parseInt(b.squad_days) || 0,
      b.squad_session || null,
      squadRate,
      squadAmount,
      grandTotal,
      amountInWords,
      claimId
    );

    // Audit log — record what changed
    const changes = {};
    const fields = ['staff_name', 'staff_id', 'department', 'designation', 'qp_type', 'qp_quantity',
      'scrutiny_quantity', 'eval_appointment', 'eval_phase', 'eval_date', 'eval_scripts',
      'squad_days', 'squad_session', 'grand_total'];
    fields.forEach(f => {
      const newVal = f === 'grand_total' ? grandTotal : (b[f] ?? null);
      if (String(oldClaim[f]) !== String(newVal)) {
        changes[f] = { from: oldClaim[f], to: newVal };
      }
    });

    db.prepare(`
      INSERT INTO audit_log (claim_id, claim_number, action, admin_id, admin_name, changes)
      VALUES (?, ?, 'updated', ?, ?, ?)
    `).run(claimId, oldClaim.claim_number, req.admin.id, req.admin.fullName || req.admin.username, JSON.stringify(changes));

    res.json({
      success: true,
      claim: {
        id: parseInt(claimId),
        claim_number: oldClaim.claim_number,
        grand_total: grandTotal,
        amount_in_words: amountInWords
      }
    });
  } catch (err) {
    console.error('Update claim error:', err);
    res.status(500).json({ error: 'Failed to update claim' });
  }
});

/**
 * DELETE /api/claims/:id
 * Delete a claim (admin only)
 */
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const claim = db.prepare('SELECT * FROM remuneration_claims WHERE id = ?').get(req.params.id);

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Audit log before deletion
    db.prepare(`
      INSERT INTO audit_log (claim_id, claim_number, action, admin_id, admin_name, changes)
      VALUES (?, ?, 'deleted', ?, ?, ?)
    `).run(
      claim.id, claim.claim_number,
      req.admin.id, req.admin.fullName || req.admin.username,
      JSON.stringify({ staff_name: claim.staff_name, grand_total: claim.grand_total })
    );

    db.prepare('DELETE FROM remuneration_claims WHERE id = ?').run(req.params.id);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete claim error:', err);
    res.status(500).json({ error: 'Failed to delete claim' });
  }
});


module.exports = router;
