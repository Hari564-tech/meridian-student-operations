import type { PaymentStatus } from "@/lib/types";

/** Parse a rupee field. Strips currency marks and leading zeros so "044" is 44, not a string prefix. */
export function moneyFromInput(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

export function moneyFieldValue(amount: number): string {
  const n = Math.max(0, Math.round(Number(amount) || 0));
  return n === 0 ? "" : String(n);
}

export type SettledPayment = {
  totalFee: number;
  discount: number;
  paidAmount: number;
  payable: number;
  remaining: number;
  status: PaymentStatus;
};

/**
 * Amount due = total fee − discount.
 * Remaining = amount due − initial payment.
 * Neither result goes below zero; over-discount or over-payment is visible as 0 due.
 */
export function settlePayment(totalFee: number, discount: number, paidAmount: number): SettledPayment {
  const fee = Math.max(0, Math.round(Number(totalFee) || 0));
  const disc = Math.max(0, Math.round(Number(discount) || 0));
  const paid = Math.max(0, Math.round(Number(paidAmount) || 0));
  const payable = Math.max(0, fee - disc);
  const remaining = Math.max(0, payable - paid);
  let status: PaymentStatus = "Pending";
  if (paid > 0 && paid < payable) status = "Partially Paid";
  else if (payable === 0 ? fee > 0 || paid > 0 : paid >= payable) status = "Paid";
  return { totalFee: fee, discount: disc, paidAmount: paid, payable, remaining, status };
}
