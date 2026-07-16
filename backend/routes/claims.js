/**
 * Claims Routes
 * 
 * CRUD operations for remuneration claims.
 * POST is public (no login needed). All other operations require admin auth.
 */

const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const { requireAdmin, requireStaff } = require('../middleware/auth');
const { validateClaim } = require('../middleware/validation');
const { generateClaimNumber, numberToWords, sanitize } = require('../utils/helpers');

// Helper to upload base64 to Supabase Storage
async function uploadPassbook(base64Data, claimNumber) {
  if (!base64Data) return null;
  try {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches.length !== 3) return null;
    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const extension = mimeType.split('/')[1] || 'png';
    const fileName = `${claimNumber}_passbook.${extension}`;

    const { data, error } = await supabase.storage
      .from('passbooks')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage.from('passbooks').getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Passbook processing error:', err);
    return null;
  }
}

/**
 * POST /api/claims
 * Create a new claim (Requires Staff Authentication)
 */
router.post('/', requireStaff, validateClaim, async (req, res) => {
  try {
    const b = req.body;
    const claimNumber = await generateClaimNumber();

    const isExternal = req.staff?.staff_type === 'External';

    let qpAmount = 0, qpRate = 0;
    if (b.qp_section_enabled) {
      const qpQty = parseInt(b.qp_quantity) || 0;
      qpRate = b.qp_type === 'qp_with_answer_key' ? (isExternal ? 2000 : 1500) : (b.qp_type ? (isExternal ? 1000 : 750) : 0);
      qpAmount = qpQty * qpRate;
    }

    const scrutinyAmount = (parseInt(b.scrutiny_quantity) || 0) * 300;
    let evalAmount = 0, evalScripts = 0, evalSessionsStr = null;
    if (b.eval_sessions && Array.isArray(b.eval_sessions)) {
      evalSessionsStr = JSON.stringify(b.eval_sessions);
      evalScripts = b.eval_sessions.reduce((sum, s) => sum + (parseInt(s.scripts) || 0), 0);
      evalAmount = b.eval_sessions.reduce((sum, s) => sum + ((parseInt(s.scripts) || 0) * (s.appointment === 'Chief Examiner/Controller' ? 33 : 30)), 0);
    } else {
      evalScripts = parseInt(b.eval_scripts) || 0;
      evalAmount = evalScripts * (b.eval_appointment === 'Chief Examiner/Controller' ? 33 : 30);
    }

    let squadAmount = 0, squadDays = 0, squadSessionsStr = null;
    if (b.squad_sessions && typeof b.squad_sessions === 'object') {
      squadSessionsStr = JSON.stringify(b.squad_sessions);
      const fDays = parseInt(b.squad_sessions.Forenoon) || 0;
      const aDays = parseInt(b.squad_sessions.Afternoon) || 0;
      const bDays = parseInt(b.squad_sessions["Both Sessions"]) || 0;
      squadAmount = (fDays * 200) + (aDays * 200) + (bDays * 400);
      squadDays = fDays + aDays + bDays;
    }

    const grandTotal = qpAmount + scrutinyAmount + evalAmount + squadAmount;
    const amountInWords = numberToWords(grandTotal);

    let passbookUrl = null;
    if (b.passbook_file) {
      passbookUrl = await uploadPassbook(b.passbook_file, claimNumber);
    }

    const insertData = {
      claim_number: claimNumber,
      staff_name: sanitize(b.staff_name?.trim()),
      staff_id: sanitize(b.staff_id?.trim()),
      department: sanitize(b.department?.trim()),
      designation: b.designation,
      bank_name: sanitize(b.bank_name?.trim()),
      bank_branch: sanitize(b.bank_branch?.trim()),
      account_number: sanitize(b.account_number?.trim()),
      ifsc_code: sanitize(b.ifsc_code?.trim()),
      mobile_number: sanitize(b.mobile_number?.trim()),
      passbook_file: passbookUrl,
      staff_section_enabled: b.staff_section_enabled ? 1 : 0,
      qp_section_enabled: b.qp_section_enabled ? 1 : 0,
      qp_type: b.qp_type || null,
      qp_quantity: parseInt(b.qp_quantity) || 0,
      qp_rate: qpRate,
      qp_amount: qpAmount,
      scrutiny_quantity: parseInt(b.scrutiny_quantity) || 0,
      scrutiny_rate: 300,
      scrutiny_amount: scrutinyAmount,
      eval_appointment: b.eval_appointment || null,
      eval_phase: evalSessionsStr || b.eval_phase || null,
      eval_date: b.eval_date || null,
      eval_scripts: evalScripts,
      eval_rate: 30,
      eval_amount: evalAmount,
      squad_days: squadDays,
      squad_session: squadSessionsStr,
      squad_rate: 0,
      squad_amount: squadAmount,
      grand_total: grandTotal,
      amount_in_words: amountInWords
    };

    const { data: result, error } = await supabase.from('remuneration_claims').insert([insertData]).select();
    if (error || !result || result.length === 0) throw error;
    
    await supabase.from('audit_log').insert([{
      claim_id: result[0].id,
      claim_number: claimNumber,
      action: 'created',
      admin_name: 'System (Public Form)',
      changes: { staff_name: b.staff_name, grand_total: grandTotal }
    }]);

    res.status(201).json({
      success: true,
      claim: { id: result[0].id, claim_number: claimNumber, grand_total: grandTotal, amount_in_words: amountInWords }
    });
  } catch (err) {
    console.error('Create claim error:', err);
    res.status(500).json({ error: 'Failed to save claim' });
  }
});

/**
 * GET /api/claims
 * List claims with pagination and filtering
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { search, department, designation, date_from, date_to, amount_min, amount_max, sort, page, limit } = req.query;
    
    let query = supabase.from('remuneration_claims').select('id, claim_number, created_at, updated_at, staff_name, staff_id, department, designation, bank_name, bank_branch, account_number, ifsc_code, mobile_number, staff_section_enabled, qp_section_enabled, qp_type, qp_quantity, qp_rate, qp_amount, scrutiny_quantity, scrutiny_rate, scrutiny_amount, eval_appointment, eval_phase, eval_date, eval_scripts, eval_rate, eval_amount, squad_days, squad_session, squad_rate, squad_amount, grand_total, amount_in_words', { count: 'exact' });

    if (search) query = query.or(`staff_name.ilike.%${search}%,staff_id.ilike.%${search}%,department.ilike.%${search}%,designation.ilike.%${search}%,claim_number.ilike.%${search}%`);
    if (department) query = query.eq('department', department);
    if (designation) query = query.eq('designation', designation);
    if (date_from) query = query.gte('created_at', date_from);
    if (date_to) query = query.lte('created_at', date_to + ' 23:59:59');
    if (amount_min) query = query.gte('grand_total', parseFloat(amount_min));
    if (amount_max) query = query.lte('grand_total', parseFloat(amount_max));

    let orderCol = 'created_at', ascending = false;
    if (sort === 'oldest') { ascending = true; }
    else if (sort === 'highest') { orderCol = 'grand_total'; ascending = false; }
    else if (sort === 'lowest') { orderCol = 'grand_total'; ascending = true; }
    else if (sort === 'name') { orderCol = 'staff_name'; ascending = true; }
    
    query = query.order(orderCol, { ascending });

    const pageNum = parseInt(page) || 1;
    const pageSize = Math.min(parseInt(limit) || 20, 100);
    const offset = (pageNum - 1) * pageSize;

    const { data: claims, count, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw error;

    res.json({ claims, pagination: { page: pageNum, limit: pageSize, total: count, totalPages: Math.ceil(count / pageSize) } });
  } catch (err) {
    console.error('List claims error:', err);
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

/**
 * GET /api/claims/stats
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const { data: allClaims, error } = await supabase.from('remuneration_claims').select('id, created_at, grand_total, department, staff_name, staff_id, designation, claim_number').order('created_at', { ascending: false });
    if (error) throw error;

    const totalClaims = allClaims.length;
    let todayCount = 0;
    let totalAmount = 0;
    const deptTotals = {};
    const todayStr = new Date().toISOString().split('T')[0];

    allClaims.forEach(c => {
      totalAmount += c.grand_total || 0;
      if (c.created_at.startsWith(todayStr)) todayCount++;
      if (!deptTotals[c.department]) deptTotals[c.department] = { department: c.department, count: 0, total: 0 };
      deptTotals[c.department].count++;
      deptTotals[c.department].total += c.grand_total || 0;
    });

    const deptBreakdown = Object.values(deptTotals).sort((a, b) => b.total - a.total);
    const departments = Object.keys(deptTotals).sort();

    res.json({
      totalClaims,
      todayClaims: todayCount,
      totalAmount,
      avgAmount: totalClaims ? Math.round((totalAmount / totalClaims) * 100) / 100 : 0,
      recentClaims: allClaims.slice(0, 10),
      deptBreakdown,
      departments
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * POST /api/claims/draft
 */
router.post('/draft', async (req, res) => {
  try {
    const { session_id, form_data } = req.body;
    if (!session_id || !form_data) return res.status(400).json({ error: 'Session ID and form data required' });
    const { error } = await supabase.from('drafts').upsert({ session_id, form_data, updated_at: new Date() }, { onConflict: 'session_id' });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Save draft error:', err);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

router.get('/draft/:sessionId', async (req, res) => {
  try {
    const { data: draft, error } = await supabase.from('drafts').select('*').eq('session_id', req.params.sessionId).single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ draft: draft || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
});

router.delete('/draft/:sessionId', async (req, res) => {
  try {
    await supabase.from('drafts').delete().eq('session_id', req.params.sessionId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete draft' });
  }
});

/**
 * GET /api/claims/:id
 */
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { data: claim, error } = await supabase.from('remuneration_claims').select('*').eq('id', req.params.id).single();
    if (error || !claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.squad_session && claim.squad_session.startsWith('{')) {
      try { claim.squad_sessions = JSON.parse(claim.squad_session); } catch (e) { claim.squad_sessions = {}; }
    }
    res.json(claim);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch claim' });
  }
});

/**
 * PUT /api/claims/:id
 */
router.put('/:id', requireAdmin, validateClaim, async (req, res) => {
  try {
    const b = req.body;
    const claimId = req.params.id;

    const { data: oldClaim, error: fetchErr } = await supabase.from('remuneration_claims').select('*').eq('id', claimId).single();
    if (fetchErr || !oldClaim) return res.status(404).json({ error: 'Claim not found' });

    const cleanStaffId = 'TRPT' + b.staff_id.replace(/^TRPT/i, '').trim();
    const { data: staffData } = await supabase.from('staff').select('staff_type').eq('staff_id', cleanStaffId).maybeSingle();
    const isExternal = staffData?.staff_type === 'External';

    let qpAmount = 0, qpRate = 0;
    if (b.qp_section_enabled) {
      const qpQty = parseInt(b.qp_quantity) || 0;
      qpRate = b.qp_type === 'qp_with_answer_key' ? (isExternal ? 2000 : 1500) : (b.qp_type ? (isExternal ? 1000 : 750) : 0);
      qpAmount = qpQty * qpRate;
    }

    const scrutinyAmount = (parseInt(b.scrutiny_quantity) || 0) * 300;
    let evalAmount = 0, evalScripts = 0, evalSessionsStr = null;
    if (b.eval_sessions && Array.isArray(b.eval_sessions)) {
      evalSessionsStr = JSON.stringify(b.eval_sessions);
      evalScripts = b.eval_sessions.reduce((sum, s) => sum + (parseInt(s.scripts) || 0), 0);
      evalAmount = b.eval_sessions.reduce((sum, s) => sum + ((parseInt(s.scripts) || 0) * (s.appointment === 'Chief Examiner/Controller' ? 33 : 30)), 0);
    } else {
      evalScripts = parseInt(b.eval_scripts) || 0;
      evalAmount = evalScripts * (b.eval_appointment === 'Chief Examiner/Controller' ? 33 : 30);
    }

    let squadAmount = 0, squadDays = 0, squadSessionsStr = null;
    if (b.squad_sessions && typeof b.squad_sessions === 'object') {
      squadSessionsStr = JSON.stringify(b.squad_sessions);
      const fDays = parseInt(b.squad_sessions.Forenoon) || 0;
      const aDays = parseInt(b.squad_sessions.Afternoon) || 0;
      const bDays = parseInt(b.squad_sessions["Both Sessions"]) || 0;
      squadAmount = (fDays * 200) + (aDays * 200) + (bDays * 400);
      squadDays = fDays + aDays + bDays;
    }

    const grandTotal = qpAmount + scrutinyAmount + evalAmount + squadAmount;
    
    let passbookUrl = oldClaim.passbook_file;
    if (b.passbook_file) {
      const newUrl = await uploadPassbook(b.passbook_file, oldClaim.claim_number);
      if (newUrl) passbookUrl = newUrl;
    }

    const updateData = {
      staff_name: sanitize(b.staff_name?.trim()),
      staff_id: sanitize(b.staff_id?.trim()),
      department: sanitize(b.department?.trim()),
      designation: b.designation,
      bank_name: sanitize(b.bank_name?.trim()),
      bank_branch: sanitize(b.bank_branch?.trim()),
      account_number: sanitize(b.account_number?.trim()),
      ifsc_code: sanitize(b.ifsc_code?.trim()),
      mobile_number: sanitize(b.mobile_number?.trim()),
      passbook_file: passbookUrl,
      staff_section_enabled: b.staff_section_enabled ? 1 : 0,
      qp_section_enabled: b.qp_section_enabled ? 1 : 0,
      qp_type: b.qp_type || null,
      qp_quantity: parseInt(b.qp_quantity) || 0,
      qp_rate: qpRate,
      qp_amount: qpAmount,
      scrutiny_quantity: parseInt(b.scrutiny_quantity) || 0,
      scrutiny_amount: scrutinyAmount,
      eval_appointment: b.eval_appointment || null,
      eval_phase: evalSessionsStr || b.eval_phase || null,
      eval_date: b.eval_date || null,
      eval_scripts: evalScripts,
      eval_amount: evalAmount,
      squad_days: squadDays,
      squad_session: squadSessionsStr,
      squad_amount: squadAmount,
      grand_total: grandTotal,
      amount_in_words: numberToWords(grandTotal),
      updated_at: new Date()
    };

    const { error } = await supabase.from('remuneration_claims').update(updateData).eq('id', claimId);
    if (error) throw error;

    const changes = {};
    Object.keys(updateData).forEach(f => {
      if (String(oldClaim[f]) !== String(updateData[f])) {
        changes[f] = { from: oldClaim[f], to: updateData[f] };
      }
    });

    await supabase.from('audit_log').insert([{
      claim_id: claimId,
      claim_number: oldClaim.claim_number,
      action: 'updated',
      admin_id: req.admin.id,
      admin_name: req.admin.fullName || req.admin.username,
      changes: changes
    }]);

    res.json({ success: true, claim: { id: parseInt(claimId), claim_number: oldClaim.claim_number, grand_total: grandTotal } });
  } catch (err) {
    console.error('Update claim error:', err);
    res.status(500).json({ error: 'Failed to update claim' });
  }
});

/**
 * DELETE /api/claims/:id
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { data: claim, error: fetchErr } = await supabase.from('remuneration_claims').select('*').eq('id', req.params.id).single();
    if (fetchErr || !claim) return res.status(404).json({ error: 'Claim not found' });

    await supabase.from('audit_log').insert([{
      claim_id: claim.id, claim_number: claim.claim_number, action: 'deleted', admin_id: req.admin.id,
      admin_name: req.admin.fullName || req.admin.username, changes: { staff_name: claim.staff_name, grand_total: claim.grand_total }
    }]);

    const { error } = await supabase.from('remuneration_claims').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete claim' });
  }
});

module.exports = router;
