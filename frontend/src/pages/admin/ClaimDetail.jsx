import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Edit2, Printer, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import ClaimEditForm from '../../components/ClaimEditForm';

export default function ClaimDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';
  const navigate = useNavigate();

  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchClaim = () => {
    setLoading(true);
    fetch(`/api/claims/${id}`)
      .then(res => res.json())
      .then(data => setClaim(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClaim();
  }, [id]);

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(val || 0);

  const handleViewForm = () => {
    if (!claim) return;
    
    const formatSquadSessionPrint = (sessions) => {
      if (!sessions) return '-';
      if (typeof sessions === 'object') {
        return Object.entries(sessions).filter(([_, c]) => c > 0).map(([s, c]) => `${c}x ${s}`).join(', ') || '-';
      }
      return sessions;
    };

    const evalPhaseStr = claim.eval_sessions && claim.eval_sessions.length > 0 
      ? claim.eval_sessions.map(s => `${s.phase} (${s.date}) - ${s.appointment}: ${s.scripts} scripts`).join('<br/>') 
      : '-';

    const qpTypeLabel = (type) => {
      if (type === 'UG_3_hours') return 'UG - 3 Hours';
      if (type === 'PG_3_hours') return 'PG - 3 Hours';
      if (type === 'UG_PG_1_5_hours') return 'UG/PG - 1.5 Hours';
      return type || '-';
    };

    const printHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Remuneration Claim - ${claim.claim_number || 'DRAFT'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.4; padding: 15mm 20mm; color: #000; }
    @page { size: A4; margin: 15mm 20mm; }
    .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10pt; margin-bottom: 15pt; }
    .header h1 { font-size: 16pt; text-transform: uppercase; letter-spacing: 2pt; margin-bottom: 4pt; }
    .header h2 { font-size: 13pt; text-transform: uppercase; }
    .header .sub { font-size: 10pt; margin-top: 4pt; color: #444; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 10pt; font-size: 10pt; }
    .info-item { }
    .info-label { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 10pt; }
    th, td { border: 1px solid #000; padding: 5pt 8pt; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; text-transform: uppercase; font-size: 9pt; }
    .amount { text-align: right; font-weight: bold; }
    .grand-total { font-size: 12pt; font-weight: bold; border-top: 3px double #000; }
    .grand-total td { padding: 8pt; }
    .words { margin: 10pt 0; font-style: italic; font-size: 10pt; border: 1px solid #000; padding: 6pt 10pt; }
    .signatures { display: flex; justify-content: space-between; margin-top: 60pt; }
    .sig-block { text-align: center; width: 30%; }
    .sig-line { border-top: 1px solid #000; padding-top: 4pt; font-size: 10pt; font-weight: bold; }
    .sig-desc { font-size: 8pt; margin-top: 2pt; }
    .footer { text-align: center; font-size: 8pt; color: #666; margin-top: 30pt; border-top: 1px solid #ccc; padding-top: 4pt; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Remuneration Claim Form</h1>
    <h2>April - May Examination 2026</h2>
    <div class="sub">Claim No: ${claim.claim_number || 'DRAFT'} | Date: ${new Date(claim.created_at).toLocaleDateString('en-IN')}</div>
  </div>

  <div class="info-row">
    <div class="info-item"><span class="info-label">Staff Name:</span> ${claim.staff_name || '-'}</div>
    <div class="info-item"><span class="info-label">Staff ID:</span> ${claim.staff_id || '-'}</div>
  </div>
  <div class="info-row">
    <div class="info-item"><span class="info-label">Department:</span> ${claim.department || '-'}</div>
    <div class="info-item"><span class="info-label">Designation:</span> ${claim.designation || '-'}</div>
  </div>
  <div class="info-row">
    <div class="info-item"><span class="info-label">Bank Name:</span> ${claim.bank_name || '-'}</div>
    <div class="info-item"><span class="info-label">Account No:</span> ${claim.account_number || '-'}</div>
  </div>
  <div class="info-row">
    <div class="info-item"><span class="info-label">Branch:</span> ${claim.bank_branch || '-'}</div>
    <div class="info-item"><span class="info-label">IFSC:</span> ${claim.ifsc_code || '-'}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Details</th>
        <th>Quantity</th>
        <th>Rate (₹)</th>
        <th style="text-align:right">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${claim.qp_section_enabled ? `
      <tr>
        <td>Question Paper Setting</td>
        <td>${qpTypeLabel(claim.qp_type)}</td>
        <td>${claim.qp_quantity || 0}</td>
        <td>${claim.qp_rate || 0}</td>
        <td class="amount">${Number(claim.qp_amount || 0).toLocaleString('en-IN')}</td>
      </tr>
      ` : ''}
      <tr>
        <td>Paper Scrutiny</td>
        <td>-</td>
        <td>${claim.scrutiny_quantity || 0}</td>
        <td>300</td>
        <td class="amount">${Number(claim.scrutiny_amount || 0).toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>Script Evaluation</td>
        <td>${evalPhaseStr}</td>
        <td>${claim.eval_scripts || 0}</td>
        <td>30</td>
        <td class="amount">${Number(claim.eval_amount || 0).toLocaleString('en-IN')}</td>
      </tr>
      ${claim.practical_enabled ? `
      <tr>
        <td>Practical / Viva Voce</td>
        <td>${claim.practical_type || '-'}</td>
        <td>${claim.practical_candidates || 0} candidates</td>
        <td>${claim.practical_rate || 0}</td>
        <td class="amount">${Number(claim.practical_amount || 0).toLocaleString('en-IN')}</td>
      </tr>
      ` : ''}
      ${claim.project_enabled ? `
      <tr>
        <td>Project Viva Voce</td>
        <td>${claim.project_course || '-'}</td>
        <td>${claim.project_candidates || 0} candidates</td>
        <td>${claim.project_rate || 0}</td>
        <td class="amount">${Number(claim.project_amount || 0).toLocaleString('en-IN')}</td>
      </tr>
      ` : ''}
      ${claim.squad_enabled ? `
      <tr>
        <td>Squad Duty</td>
        <td>${formatSquadSessionPrint(claim.squad_sessions)}</td>
        <td>${claim.squad_days || 0} days</td>
        <td>-</td>
        <td class="amount">${Number(claim.squad_amount || 0).toLocaleString('en-IN')}</td>
      </tr>
      ` : ''}
      <tr class="grand-total">
        <td colspan="4" style="text-align:right;font-weight:bold;">GRAND TOTAL</td>
        <td class="amount" style="font-size:13pt;">₹${Number(claim.grand_total || 0).toLocaleString('en-IN')}</td>
      </tr>
    </tbody>
  </table>

  <div class="words">
    <strong>Amount in Words:</strong> ${claim.amount_in_words || ''}
  </div>


  <div class="footer">
    Generated by APRIL MAY Remuneration Claim System | ${new Date().toLocaleDateString('en-IN')}
  </div>
</body>
</html>`;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };
  if (loading) return <div className="text-center py-12 text-brand-accent animate-pulse font-mono uppercase tracking-widest text-xs">Loading Claim Data...</div>;
  if (!claim) return <div className="text-center py-12 text-red-500 font-mono uppercase tracking-widest text-xs">Claim not found</div>;

  return (
    <div className="flex flex-col gap-8 max-w-[1000px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <button onClick={() => navigate('/admin/claims')} className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-text-secondary hover:text-brand-accent transition-colors mb-4">
            <ArrowLeft size={14} /> Back to Ledger
          </button>
          <div className="flex items-center gap-4">
            <h1 className="font-primary text-3xl font-bold text-brand-primary tracking-tight">Claim {claim.claim_number}</h1>
            <span className="bg-neutral-surface border border-black/5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest text-brand-accent">
              {isEditMode ? 'Edit Mode' : 'View Mode'}
            </span>
          </div>
        </div>

        {!isEditMode && (
          <div className="flex gap-2">
            <button onClick={() => navigate(`/admin/claim/${id}?edit=true`)} className="flex items-center gap-2 bg-neutral-surface border border-black/5 text-brand-primary px-4 py-2 rounded-full font-mono text-[10px] uppercase tracking-widest hover:bg-white shadow-sm transition-all">
              <Edit2 size={14} /> Edit
            </button>
            <button onClick={handleViewForm} className="flex items-center gap-2 bg-neutral-surface border border-black/5 text-brand-primary px-4 py-2 rounded-full font-mono text-[10px] uppercase tracking-widest hover:bg-white shadow-sm transition-all">
              <Printer size={14} /> View Form
            </button>
            <button className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full font-mono text-[10px] uppercase tracking-widest hover:bg-red-600 shadow-sm transition-all">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>

      {isEditMode ? (
        <ClaimEditForm 
          claim={claim} 
          onCancel={() => navigate(`/admin/claim/${id}`)}
          onSuccess={() => {
            navigate(`/admin/claim/${id}`);
            fetchClaim();
          }}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Staff Details */}
          <div className="bg-white rounded-md shadow-mega border border-black/5 p-8">
            <h2 className="font-primary text-xl font-bold text-brand-primary mb-6">Staff Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailField label="Name" value={claim.staff_name} />
              <DetailField label="ID" value={claim.staff_id} />
              <DetailField label="Department" value={claim.department} />
              <DetailField label="Designation" value={claim.designation} />
            </div>
            
            <div className="mt-6 pt-6 border-t border-black/5 grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailField label="Bank Name" value={claim.bank_name} />
              <DetailField label="Branch Name" value={claim.bank_branch} />
              <DetailField label="Account Number" value={claim.account_number} />
              <DetailField label="IFSC Code" value={claim.ifsc_code} />
              <DetailField label="Mobile Number" value={claim.mobile_number} />
              <DetailField label="Passbook" value={claim.passbook_file ? 'View / Download' : '-'} />
            </div>
          </div>

          {/* Claim Breakdown */}
          <div className="bg-white rounded-md shadow-mega border border-black/5 p-8">
            <h2 className="font-primary text-xl font-bold text-brand-primary mb-6">Remuneration Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-neutral-surface border-b border-black/5">
                  <tr>
                    <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-secondary">Component</th>
                    <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-secondary">Details</th>
                    <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-secondary">Quantity</th>
                    <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-secondary">Rate</th>
                    <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-secondary text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {claim.qp_section_enabled && (
                    <tr className="border-b border-black/5 hover:bg-neutral-surface/50 transition-colors">
                      <td className="p-4 text-sm font-semibold text-brand-primary">Question Paper Setting</td>
                      <td className="p-4 text-sm text-text-secondary">{claim.qp_type}</td>
                      <td className="p-4 text-sm text-text-secondary">{claim.qp_quantity}</td>
                      <td className="p-4 text-sm text-text-secondary">{formatCurrency(claim.qp_rate)}</td>
                      <td className="p-4 text-sm font-bold text-brand-primary text-right">{formatCurrency(claim.qp_amount)}</td>
                    </tr>
                  )}
                  <tr className="border-b border-black/5 hover:bg-neutral-surface/50 transition-colors">
                    <td className="p-4 text-sm font-semibold text-brand-primary">Paper Scrutiny</td>
                    <td className="p-4 text-sm text-text-secondary">—</td>
                    <td className="p-4 text-sm text-text-secondary">{claim.scrutiny_quantity}</td>
                    <td className="p-4 text-sm text-text-secondary">₹300</td>
                    <td className="p-4 text-sm font-bold text-brand-primary text-right">{formatCurrency(claim.scrutiny_amount)}</td>
                  </tr>
                  <tr className="border-b border-black/5 hover:bg-neutral-surface/50 transition-colors">
                    <td className="p-4 text-sm font-semibold text-brand-primary">Script Evaluation</td>
                    <td className="p-4 text-sm text-text-secondary">Multiple Phases</td>
                    <td className="p-4 text-sm text-text-secondary">{claim.eval_scripts} scripts</td>
                    <td className="p-4 text-sm text-text-secondary">₹30</td>
                    <td className="p-4 text-sm font-bold text-brand-primary text-right">{formatCurrency(claim.eval_amount)}</td>
                  </tr>
                  {claim.practical_enabled && (
                    <tr className="border-b border-black/5 hover:bg-neutral-surface/50 transition-colors">
                      <td className="p-4 text-sm font-semibold text-brand-primary">Practical / Viva Voce</td>
                      <td className="p-4 text-sm text-text-secondary">{claim.practical_type}</td>
                      <td className="p-4 text-sm text-text-secondary">{claim.practical_candidates} candidates</td>
                      <td className="p-4 text-sm text-text-secondary">{formatCurrency(claim.practical_rate)}</td>
                      <td className="p-4 text-sm font-bold text-brand-primary text-right">{formatCurrency(claim.practical_amount)}</td>
                    </tr>
                  )}
                  {claim.project_enabled && (
                    <tr className="border-b border-black/5 hover:bg-neutral-surface/50 transition-colors">
                      <td className="p-4 text-sm font-semibold text-brand-primary">Project Viva Voce</td>
                      <td className="p-4 text-sm text-text-secondary">{claim.project_course}</td>
                      <td className="p-4 text-sm text-text-secondary">{claim.project_candidates} candidates</td>
                      <td className="p-4 text-sm text-text-secondary">{formatCurrency(claim.project_rate)}</td>
                      <td className="p-4 text-sm font-bold text-brand-primary text-right">{formatCurrency(claim.project_amount)}</td>
                    </tr>
                  )}
                  {claim.squad_days > 0 && (
                    <tr className="border-b border-black/5 hover:bg-neutral-surface/50 transition-colors">
                      <td className="p-4 text-sm font-semibold text-brand-primary">Squad Duty</td>
                      <td className="p-4 text-sm text-text-secondary">—</td>
                      <td className="p-4 text-sm text-text-secondary">{claim.squad_days} days</td>
                      <td className="p-4 text-sm text-text-secondary">{formatCurrency(claim.squad_rate || 200)}</td>
                      <td className="p-4 text-sm font-bold text-brand-primary text-right">{formatCurrency(claim.squad_amount)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-8 flex justify-between items-center bg-brand-primary text-white p-6 rounded-md shadow-mega">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/60 mb-1">Grand Total</span>
                <span className="text-xs font-secondary italic text-brand-accent">{claim.amount_in_words}</span>
              </div>
              <div className="text-4xl font-primary font-bold">{formatCurrency(claim.grand_total)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">{label}</span>
      <span className="text-sm font-semibold text-brand-primary">{value || '-'}</span>
    </div>
  );
}
