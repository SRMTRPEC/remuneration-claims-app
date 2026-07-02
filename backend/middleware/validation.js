/**
 * Validation Middleware
 * 
 * Server-side validation for claim form submissions.
 * Prevents invalid data from entering the database.
 */

const VALID_DESIGNATIONS = ['Assistant Professor', 'Associate Professor', 'Professor', 'Technician'];
const VALID_QP_TYPES = ['qp_with_answer_key', 'qp_only', 'answer_key_only', null, ''];
const VALID_APPOINTMENTS = ['Chief Examiner', 'Examiner', 'Assistant Examiner', null, ''];
const VALID_PHASES = ['Phase 1', 'Phase 2', null, ''];
const VALID_SESSIONS = ['Both Sessions', 'Forenoon', 'Afternoon', null, ''];

/**
 * Validate the claim form data
 */
function validateClaim(req, res, next) {
  const errors = [];
  const body = req.body;

  // Staff details (always required)
  if (!body.staff_name || body.staff_name.trim().length === 0) {
    errors.push('Staff Name is required');
  }
  if (!body.staff_id || body.staff_id.trim().length === 0) {
    errors.push('Staff ID is required');
  }
  if (!body.department || body.department.trim().length === 0) {
    errors.push('Department is required');
  }
  if (!body.designation || !VALID_DESIGNATIONS.includes(body.designation)) {
    errors.push('Valid designation is required');
  }

  // Question Paper Setting
  if (body.qp_section_enabled) {
    if (body.qp_type && !VALID_QP_TYPES.includes(body.qp_type)) {
      errors.push('Invalid QP type');
    }
    if (body.qp_quantity !== undefined && body.qp_quantity !== null) {
      const qty = parseInt(body.qp_quantity);
      if (isNaN(qty) || qty < 0 || qty > 10) {
        errors.push('QP quantity must be 0-10');
      }
    }
  }

  // Paper Scrutiny
  if (body.scrutiny_quantity !== undefined && body.scrutiny_quantity !== null) {
    const qty = parseInt(body.scrutiny_quantity);
    if (isNaN(qty) || qty < 0 || qty > 10) {
      errors.push('Scrutiny quantity must be 0-10');
    }
  }

  // Script Evaluation
  if (body.eval_scripts !== undefined && body.eval_scripts !== null) {
    const scripts = parseInt(body.eval_scripts);
    if (isNaN(scripts) || scripts < 0) {
      errors.push('Number of scripts cannot be negative');
    }
  }
  if (body.eval_appointment && !VALID_APPOINTMENTS.includes(body.eval_appointment)) {
    errors.push('Invalid appointment type');
  }
  if (body.eval_phase && !VALID_PHASES.includes(body.eval_phase)) {
    errors.push('Invalid phase');
  }

  // Squad Duty
  if (body.squad_days !== undefined && body.squad_days !== null) {
    const days = parseInt(body.squad_days);
    if (isNaN(days) || days < 0 || days > 10) {
      errors.push('Squad days must be 0-10');
    }
  }
  if (body.squad_sessions && Array.isArray(body.squad_sessions)) {
    body.squad_sessions.forEach(session => {
      if (!VALID_SESSIONS.includes(session)) {
        errors.push('Invalid session in squad duty');
      }
    });
  }

  // Grand total cannot be negative
  if (body.grand_total !== undefined && parseFloat(body.grand_total) < 0) {
    errors.push('Grand total cannot be negative');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  next();
}

module.exports = { validateClaim };
