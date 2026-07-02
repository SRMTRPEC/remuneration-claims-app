/**
 * ExcelJS Export Utilities
 * 
 * Creates professionally formatted Excel workbooks from claim data.
 */

const ExcelJS = require('exceljs');

/**
 * Generate an Excel workbook from an array of claims
 * @param {Array} claims - Array of claim objects from the database
 * @returns {ExcelJS.Workbook} Formatted workbook ready to write
 */
function createClaimsWorkbook(claims) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'APRIL MAY Remuneration System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Remuneration Claims', {
    views: [{ state: 'frozen', ySplit: 1 }] // Freeze first row
  });

  // ── Define columns ──────────────────────────────────────────────
  sheet.columns = [
    { header: 'Claim Number', key: 'claim_number', width: 18 },
    { header: 'Created Date', key: 'created_at', width: 18 },
    { header: 'Staff Name', key: 'staff_name', width: 22 },
    { header: 'Staff ID', key: 'staff_id', width: 15 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Designation', key: 'designation', width: 20 },
    { header: 'QP Type', key: 'qp_type', width: 24 },
    { header: 'QP Quantity', key: 'qp_quantity', width: 14 },
    { header: 'QP Amount', key: 'qp_amount', width: 14 },
    { header: 'Scrutiny Qty', key: 'scrutiny_quantity', width: 14 },
    { header: 'Scrutiny Amt', key: 'scrutiny_amount', width: 14 },
    { header: 'Appointment', key: 'eval_appointment', width: 18 },
    { header: 'Phase', key: 'eval_phase', width: 12 },
    { header: 'Eval Date', key: 'eval_date', width: 16 },
    { header: 'Scripts', key: 'eval_scripts', width: 12 },
    { header: 'Eval Amount', key: 'eval_amount', width: 14 },
    { header: 'Squad Days', key: 'squad_days', width: 12 },
    { header: 'Squad Session', key: 'squad_session', width: 16 },
    { header: 'Squad Amount', key: 'squad_amount', width: 14 },
    { header: 'Grand Total', key: 'grand_total', width: 16 },
    { header: 'Amount in Words', key: 'amount_in_words', width: 40 },
  ];

  // ── Style header row ────────────────────────────────────────────
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1A237E' } // Deep indigo
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 28;

  // ── Add data rows ───────────────────────────────────────────────
  claims.forEach((claim, index) => {
    let formattedSessions = claim.squad_session || '-';
    if (typeof formattedSessions === 'string' && formattedSessions.startsWith('[')) {
      try {
        const arr = JSON.parse(formattedSessions);
        if (Array.isArray(arr) && arr.length > 0) {
          const counts = {};
          arr.forEach(s => counts[s] = (counts[s] || 0) + 1);
          formattedSessions = Object.entries(counts).map(([s, c]) => `${c}x ${s}`).join(', ');
        }
      } catch (e) {}
    }

    const row = sheet.addRow({
      claim_number: claim.claim_number,
      created_at: formatExcelDate(claim.created_at),
      staff_name: claim.staff_name,
      staff_id: claim.staff_id,
      department: claim.department,
      designation: claim.designation,
      qp_type: formatQpType(claim.qp_type),
      qp_quantity: claim.qp_quantity || 0,
      qp_amount: claim.qp_amount || 0,
      scrutiny_quantity: claim.scrutiny_quantity || 0,
      scrutiny_amount: claim.scrutiny_amount || 0,
      eval_appointment: claim.eval_appointment || '-',
      eval_phase: claim.eval_phase || '-',
      eval_date: claim.eval_date || '-',
      eval_scripts: claim.eval_scripts || 0,
      eval_amount: claim.eval_amount || 0,
      squad_days: claim.squad_days || 0,
      squad_session: formattedSessions,
      squad_amount: claim.squad_amount || 0,
      grand_total: claim.grand_total || 0,
      amount_in_words: claim.amount_in_words || '',
    });

    // Alternate row colors
    if (index % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF5F5F5' }
      };
    }

    // Currency formatting for amount columns
    ['qp_amount', 'scrutiny_amount', 'eval_amount', 'squad_amount', 'grand_total'].forEach(key => {
      const cell = row.getCell(key);
      cell.numFmt = '₹#,##0.00';
    });
  });

  // ── Auto-filter on all columns ──────────────────────────────────
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: claims.length + 1, column: 21 }
  };

  // ── Border all cells ────────────────────────────────────────────
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
      };
    });
  });

  return workbook;
}

// ── Helper formatters ───────────────────────────────────────────────

function formatExcelDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatQpType(type) {
  if (!type) return '-';
  const map = {
    'qp_with_answer_key': 'QP Setting with Answer Key',
    'qp_only': 'Question Paper Only',
    'answer_key_only': 'Answer Key Only'
  };
  return map[type] || type;
}

module.exports = { createClaimsWorkbook };
