// lib/po.js — single source of truth for vendor-PO status math. Replaces the
// `qty_ordered - delivered + returned` formula that used to be copy-pasted across
// the deliveries route and 3 UI pages.

// Stored `status` transition rule: complete as soon as delivered >= ordered, ignoring
// returns entirely. Never flips back to open once complete — a later return only changes
// the derived display status below, not this one.
export function computeStoredStatus({ qty_ordered, delivered, status }) {
  if (status === 'cancelled') return 'cancelled';
  return delivered >= qty_ordered ? 'complete' : 'open';
}

// Derived UI badge — layered on top of stored status, purely for display.
export function poDisplayStatus({ status, qty_ordered, delivered, returned }) {
  if (status === 'cancelled') return 'cancelled';
  if (delivered < qty_ordered) return 'open';
  if (returned <= 0) return 'complete';
  if (returned < delivered) return 'partially_returned';
  return 'fully_returned'; // returned >= delivered
}

export const PO_STATUS_LABELS = {
  open: 'Open',
  complete: 'Complete',
  partially_returned: 'Partially returned',
  fully_returned: 'Fully returned',
  cancelled: 'Cancelled',
};

// What's still owed to arrive.
export function poOutstanding({ qty_ordered, delivered }) {
  return Math.max(0, qty_ordered - delivered);
}
