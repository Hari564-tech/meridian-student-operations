import type { PaymentStatus, PaymentTransaction, Student } from "./types.ts";

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

/**
 * Live calculation for Update Payment panel:
 * Total Payable = Total Fees - Discount
 * Total Amount Previously Paid = Sum of all valid, non-voided payment transactions recorded before the current payment
 * Current Due Before Payment = Total Payable - Total Amount Previously Paid
 * Remaining Due After Payment = Current Due Before Payment - Current Payment Amount
 */
export function calculateRemainingAfterPayment(
  totalFee: number,
  discount: number,
  previousPaid: number,
  payingNow: number,
) {
  const fee = Math.max(0, Math.round(Number(totalFee) || 0));
  const disc = Math.max(0, Math.round(Number(discount) || 0));
  const totalPayable = Math.max(0, fee - disc);
  const prevPaid = Math.max(0, Math.round(Number(previousPaid) || 0));
  const currentDueBeforePayment = Math.max(0, totalPayable - prevPaid);
  const now = Math.max(0, Math.round(Number(payingNow) || 0));
  const totalPaidAfterPayment = prevPaid + now;
  const remainingDueAfterPayment = Math.max(0, totalPayable - totalPaidAfterPayment);
  const isOverpayment = now > currentDueBeforePayment && currentDueBeforePayment > 0;
  const isFullyPaid = currentDueBeforePayment <= 0;
  const settledAfter = settlePayment(fee, disc, totalPaidAfterPayment);

  return {
    totalFee: fee,
    discount: disc,
    totalPayable,
    previousPaid: prevPaid,
    currentDueBeforePayment,
    payingNow: now,
    totalPaidAfterPayment,
    remainingDueAfterPayment,
    newStatus: settledAfter.status,
    isOverpayment,
    isFullyPaid,
    formulaText: `(Total Fee ₹${fee.toLocaleString("en-IN")} - Discount ₹${disc.toLocaleString("en-IN")}) - (Previously Paid ₹${prevPaid.toLocaleString("en-IN")} + Paying Now ₹${now.toLocaleString("en-IN")}) = ₹${remainingDueAfterPayment.toLocaleString("en-IN")} Remaining Due`,
  };
}

export interface StudentFinancialSummary {
  student: Student;
  totalFee: number;
  discount: number;
  totalPayable: number;
  totalPaid: number;
  currentDue: number;
  remaining: number;
  status: PaymentStatus;
  transactions: PaymentTransaction[];
}

/**
 * Returns consistent, unified date-wise payment transactions and balances for a student.
 * If transactions do not fully cover student.paidAmount, synthesizes an initial registration
 * transaction for historical continuity without double-counting.
 */
export function getStudentPaymentDetails(
  student: Student,
  allTransactions: PaymentTransaction[] = [],
  counselorName?: string,
): StudentFinancialSummary {
  const rawTxns = (allTransactions || []).filter(
    (t) => t.studentId === student.id && t.status !== "Voided",
  );

  let transactions = [...rawTxns];

  // Reconcile any unbacked initial payment so table sum matches total paid
  const txnsTotalBefore = transactions.reduce((sum, t) => sum + t.amount, 0);
  if (student.paidAmount > txnsTotalBefore) {
    const unbacked = student.paidAmount - txnsTotalBefore;
    const regDate = student.createdAt ? student.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
    transactions.push({
      id: `TXN-INIT-${student.id}`,
      studentId: student.id,
      amount: unbacked,
      paymentDate: regDate,
      method: "Bank Transfer",
      reference: `INIT-${student.id}`,
      notes: "Initial registration payment",
      recordedBy: counselorName ?? "Admissions Counselor",
      createdAt: student.createdAt || new Date().toISOString(),
      updatedAt: student.createdAt || new Date().toISOString(),
      status: "Completed",
    });
  }

  // Always sort latest payment date first
  transactions.sort((a, b) => {
    const da = new Date(a.paymentDate).getTime();
    const db = new Date(b.paymentDate).getTime();
    if (da !== db) return db - da;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const txnsTotal = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalPaid = Math.max(txnsTotal, student.paidAmount || 0);
  const fee = Math.max(0, Math.round(Number(student.totalFee) || 0));
  const discount = Math.max(0, Math.round(Number(student.discount) || 0));
  const totalPayable = Math.max(0, fee - discount);
  const currentDue = Math.max(0, totalPayable - totalPaid);
  const settled = settlePayment(fee, discount, totalPaid);

  return {
    student,
    totalFee: fee,
    discount,
    totalPayable,
    totalPaid,
    currentDue,
    remaining: currentDue,
    status: settled.status,
    transactions,
  };
}
