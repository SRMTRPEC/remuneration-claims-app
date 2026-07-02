/**
 * Utility Helpers
 * 
 * Number-to-words conversion (Indian Rupees) and claim number generation.
 */

const { getDb } = require('../../database/init');

// ── Number to Words (Indian Rupees) ─────────────────────────────────

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/**
 * Convert a number (up to 99,99,99,999) to Indian English words
 * e.g., 1500 → "One Thousand Five Hundred"
 */
function numberToWordsHelper(num) {
  if (num === 0) return '';
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + numberToWordsHelper(num % 100) : '');
  if (num < 100000) return numberToWordsHelper(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWordsHelper(num % 1000) : '');
  if (num < 10000000) return numberToWordsHelper(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWordsHelper(num % 100000) : '');
  return numberToWordsHelper(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWordsHelper(num % 10000000) : '');
}

/**
 * Convert amount to "Rupees ... Only" format
 * @param {number} amount - The amount in rupees
 * @returns {string} Amount in words
 */
function numberToWords(amount) {
  if (amount === 0) return 'Rupees Zero Only';
  
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  
  let words = 'Rupees ' + numberToWordsHelper(rupees);
  if (paise > 0) {
    words += ' and ' + numberToWordsHelper(paise) + ' Paise';
  }
  words += ' Only';
  return words;
}

// ── Claim Number Generation ─────────────────────────────────────────

/**
 * Generate a unique claim number in format CLM-YYYY-NNNN
 * @returns {string} Unique claim number
 */
function generateClaimNumber() {
  const db = getDb();
  const year = new Date().getFullYear();
  const prefix = `CLM-${year}-`;
  
  // Find the last claim number for this year
  const lastClaim = db.prepare(
    `SELECT claim_number FROM remuneration_claims 
     WHERE claim_number LIKE ? 
     ORDER BY id DESC LIMIT 1`
  ).get(prefix + '%');

  let nextNum = 1;
  if (lastClaim) {
    const lastNum = parseInt(lastClaim.claim_number.split('-')[2], 10);
    nextNum = lastNum + 1;
  }

  return prefix + String(nextNum).padStart(4, '0');
}

// ── Input Sanitization ──────────────────────────────────────────────

/**
 * Sanitize a string to prevent XSS
 */
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>\"'&]/g, (char) => {
    const map = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' };
    return map[char];
  });
}

/**
 * Format date to readable string
 */
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

module.exports = { numberToWords, generateClaimNumber, sanitize, formatDate };
