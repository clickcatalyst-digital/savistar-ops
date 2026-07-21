// lib/extract.js — bank-statement PDF → structured JSON via OpenRouter.
// Ported from ls_crm/routes/invoices.js, generalized (no company-specific sign overrides, no Tally).
import { queryOne, execute } from './db';

const PROMPT = `You are a precise data extraction system for Indian bank statements.
Return ONLY a JSON object (no markdown fences) with this schema:
{
  "account_no": string, "statement_from": "YYYY-MM-DD", "statement_to": "YYYY-MM-DD",
  "opening_balance": number, "closing_balance": number,
  "total_debit": number, "total_credit": number,
  "line_items": [{ "si_no": number|null, "date": "YYYY-MM-DD", "description": string, "amount": number }]
}
Rules:
- opening_balance / closing_balance from the summary section (preserve negative sign if overdrawn).
- total_debit = total withdrawals, total_credit = total deposits.
- Each transaction → one line_item, processed sequentially. si_no is the sequential serial number column if present.
- Each description must be a single clean line — collapse embedded newlines into a space and remove any raw double quotes (") or backslashes (\\).
- Signs: any amount under the Withdrawal/Debit (Dr) column MUST be negative; any amount under the Deposit/Credit (Cr) column MUST be positive. Verify signs against the running balance column when present.
- All numbers plain (no commas, no currency symbols).`;

async function callOpenRouter(body) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (r.status === 429) throw new Error('RATE_LIMIT: OpenRouter rate limit hit. Try again later.');
  const data = await r.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  let raw = (data.choices?.[0]?.message?.content || '').trim();
  const fence = '`'.repeat(3);
  if (raw.startsWith(fence)) raw = raw.split(fence).join('').replace(/^json/i, '').trim();
  try {
    return JSON.parse(raw);
  } catch (e) {
    const first = raw.indexOf('{'), last = raw.lastIndexOf('}');
    if (first !== -1 && last > first) {
      const cleaned = raw.slice(first, last + 1).replace(/\n/g, ' ').replace(/,\s*([\]}])/g, '$1');
      try { return JSON.parse(cleaned); } catch { /* fall through */ }
    }
    throw e;
  }
}

// Page-by-page extraction (ls_crm approach) so long statements don't blow the output limit,
// deduped by si_no. ponytail: 8-page cap — raise if statements run longer.
async function parseStatement(buffer) {
  const b64 = buffer.toString('base64');
  let aggregated = null;
  for (let page = 1; page <= 8; page++) {
    const parsed = await callOpenRouter({
      model: process.env.EXTRACTION_MODEL || 'google/gemini-2.5-flash',
      temperature: 0,
      messages: [{ role: 'user', content: [
        { type: 'text', text: PROMPT + `\nCRITICAL: Process ONLY transactions listed under "--- PAGE ${page} ---". Ignore all other pages. If no transactions exist on this page, return an empty line_items array.` },
        { type: 'file', file: { filename: 'doc.pdf', file_data: `data:application/pdf;base64,${b64}` } }
      ]}],
      max_tokens: 8192,
      plugins: [{ id: 'file-parser', pdf: { engine: 'pdf-text' } }],
    });
    if (!aggregated) {
      aggregated = parsed;
      if (!Array.isArray(aggregated.line_items)) aggregated.line_items = [];
    } else if (parsed && Array.isArray(parsed.line_items)) {
      aggregated.line_items.push(...parsed.line_items);
    }
  }
  const seen = new Set();
  aggregated.line_items = aggregated.line_items.filter(item => {
    if (!item.si_no) return true;
    if (seen.has(item.si_no)) return false;
    seen.add(item.si_no);
    return true;
  });
  return aggregated;
}

function classifyError(msg) {
  const m = (msg || '').toLowerCase();
  if (m.includes('rate_limit')) return 'Rate limited';
  if (m.includes('json') || m.includes('unexpected token')) return 'Bad AI response';
  if (m.includes('timeout') || m.includes('timed out')) return 'Timed out';
  if (m.includes('fetch failed') || m.includes('network')) return 'Network error';
  if (m.includes('401') || m.includes('unauthorized') || m.includes('api key')) return 'Auth/key error';
  if (m.includes('insufficient') || m.includes('credit')) return 'No credits';
  return 'Extraction error';
}

// Fire-and-forget from the upload route (the Render web service is long-lived, same as ls_crm).
export async function runExtraction(docId, buffer) {
  try {
    let parsed;
    try {
      parsed = await parseStatement(buffer);
    } catch (e1) {
      if (/json|unexpected token/i.test(e1.message)) parsed = await parseStatement(buffer); // one retry on parse flake
      else throw e1;
    }
    const items = (parsed.line_items || []).map(it => ({
      date: it.date || null,
      description: it.description || '',
      amount: Number(it.amount) || 0,
      comment: '',
      attachment_url: null,
    }));
    await execute(
      `UPDATE documents SET status = 'pending', account_no = ?, statement_from = ?, statement_to = ?,
         opening_balance = ?, closing_balance = ?, total_debit = ?, total_credit = ?, line_items = ?, extract_error = NULL
       WHERE id = ?`,
      [parsed.account_no || null, parsed.statement_from || null, parsed.statement_to || null,
       parsed.opening_balance ?? null, parsed.closing_balance ?? null,
       parsed.total_debit ?? null, parsed.total_credit ?? null,
       JSON.stringify(items), docId]);
  } catch (err) {
    console.error('Extraction failed for document', docId, err.message);
    await execute(`UPDATE documents SET status = 'extract_failed', extract_error = ? WHERE id = ?`,
      [classifyError(err.message), docId]);
  }
}

export async function getDocument(id) {
  const doc = await queryOne('SELECT * FROM documents WHERE id = ?', [id]);
  if (doc) { try { doc.line_items = JSON.parse(doc.line_items || '[]'); } catch { doc.line_items = []; } }
  return doc;
}
