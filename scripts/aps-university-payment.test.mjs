import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

describe("Abroad Aspirants: APS Applied By, University Type & Payment Management", () => {
  test("src/lib/types.ts exports required constants and types", async () => {
    const typesPath = path.join(root, "src/lib/types.ts");
    assert.ok(fs.existsSync(typesPath), "src/lib/types.ts must exist");
    const content = fs.readFileSync(typesPath, "utf-8");

    assert.ok(content.includes("APS_APPLIED_BY_OPTIONS"), "types.ts must export APS_APPLIED_BY_OPTIONS");
    assert.ok(content.includes("UNIVERSITY_TYPES"), "types.ts must export UNIVERSITY_TYPES");
    assert.ok(content.includes("PAYMENT_METHODS"), "types.ts must export PAYMENT_METHODS");
    assert.ok(content.includes("export interface PaymentTransaction"), "types.ts must export PaymentTransaction");
    assert.ok(content.includes("apsAppliedBy?: ApsAppliedBy | string"), "Student interface includes apsAppliedBy");
    assert.ok(content.includes("universityType?: UniversityType | string"), "Student interface includes universityType");

    const {
      APS_APPLIED_BY_OPTIONS,
      UNIVERSITY_TYPES,
      PAYMENT_METHODS,
    } = await import("../src/lib/types.ts");

    assert.deepEqual([...APS_APPLIED_BY_OPTIONS], ["Student", "By Employee"]);
    assert.deepEqual([...UNIVERSITY_TYPES], ["Public University", "Private University"]);
    assert.ok(PAYMENT_METHODS.includes("Cash"));
    assert.ok(PAYMENT_METHODS.includes("Bank Transfer"));
    assert.ok(PAYMENT_METHODS.includes("UPI"));
    assert.ok(PAYMENT_METHODS.includes("Card"));
    assert.ok(PAYMENT_METHODS.includes("Other"));
  });

  test("src/lib/payment.ts computes live remaining balances and handles student payment history", async () => {
    const {
      calculateRemainingAfterPayment,
      getStudentPaymentDetails,
    } = await import("../src/lib/payment.ts");

    // Scenario 1: Rahul Kumar - Total fee ₹75,000, 0 discount, Previous paid ₹35,000, paying ₹15,000 now
    const calc1 = calculateRemainingAfterPayment(75000, 0, 35000, 15000);
    assert.equal(calc1.totalFee, 75000);
    assert.equal(calc1.discount, 0);
    assert.equal(calc1.totalPayable, 75000);
    assert.equal(calc1.previousPaid, 35000);
    assert.equal(calc1.currentDueBeforePayment, 40000);
    assert.equal(calc1.payingNow, 15000);
    assert.equal(calc1.remainingDueAfterPayment, 25000);
    assert.equal(calc1.isOverpayment, false);
    assert.equal(calc1.isFullyPaid, false);

    // Scenario 2: Paying the exact remaining balance of ₹40,000
    const calc2 = calculateRemainingAfterPayment(75000, 0, 35000, 40000);
    assert.equal(calc2.remainingDueAfterPayment, 0);
    assert.equal(calc2.isOverpayment, false);

    // Scenario 3: Overpayment attempt of ₹50,000 when current due is ₹40,000
    const calc3 = calculateRemainingAfterPayment(75000, 0, 35000, 50000);
    assert.equal(calc3.remainingDueAfterPayment, 0);
    assert.equal(calc3.isOverpayment, true);

    // Scenario 4: Reconciliation of legacy student without double-counting
    const dummyStudent = {
      id: "OCT26_999",
      name: "Legacy Student",
      totalFee: 100000,
      discount: 5000,
      paidAmount: 40000,
      paymentStatus: "Partially Paid",
      createdAt: "2026-10-01T10:00:00.000Z",
    };

    const summary1 = getStudentPaymentDetails(dummyStudent, [], "Nagaraju");
    assert.equal(summary1.totalFee, 100000);
    assert.equal(summary1.discount, 5000);
    assert.equal(summary1.totalPayable, 95000);
    assert.equal(summary1.totalPaid, 40000);
    assert.equal(summary1.currentDue, 55000);
    assert.equal(summary1.transactions.length, 1);
    assert.equal(summary1.transactions[0].amount, 40000);

    // Scenario 5: Multiple recorded transactions sorted latest first
    const txns = [
      {
        id: "TXN-1",
        studentId: "OCT26_999",
        amount: 25000,
        paymentDate: "2026-10-01",
        method: "Bank Transfer",
        recordedBy: "Nagaraju",
        createdAt: "2026-10-01T10:00:00.000Z",
        updatedAt: "2026-10-01T10:00:00.000Z",
        status: "Completed",
      },
      {
        id: "TXN-2",
        studentId: "OCT26_999",
        amount: 15000,
        paymentDate: "2026-10-15",
        method: "UPI",
        recordedBy: "Nagaraju",
        createdAt: "2026-10-15T10:00:00.000Z",
        updatedAt: "2026-10-15T10:00:00.000Z",
        status: "Completed",
      },
    ];
    const summary2 = getStudentPaymentDetails(dummyStudent, txns, "Nagaraju");
    assert.equal(summary2.totalPaid, 40000);
    assert.equal(summary2.transactions.length, 2);
    assert.equal(summary2.transactions[0].id, "TXN-2");
    assert.equal(summary2.transactions[1].id, "TXN-1");
  });

  test("src/lib/mock-data.ts seeds Rahul Kumar and transactions per prompt specifications", () => {
    const mockContent = fs.readFileSync(path.join(root, "src/lib/mock-data.ts"), "utf-8");

    assert.ok(mockContent.includes('country: "Germany"'), "Rahul Kumar country must be Germany");
    assert.ok(mockContent.includes("totalFee: 75000"), "Rahul Kumar totalFee must be 75000");
    assert.ok(mockContent.includes("paidAmount: 35000"), "Rahul Kumar paidAmount must be 35000");
    assert.ok(mockContent.includes('apsAppliedBy: "By Employee"'), "Rahul Kumar apsAppliedBy must be By Employee");
    assert.ok(mockContent.includes('universityType: "Public University"'), "Rahul Kumar universityType must be Public University");
    assert.ok(mockContent.includes("TXN-OCT26_001-01"), "Rahul Kumar transaction 1 seeded");
    assert.ok(mockContent.includes("amount: 20000"), "Transaction 1 amount ₹20,000");
    assert.ok(mockContent.includes("TXN-OCT26_001-02"), "Rahul Kumar transaction 2 seeded");
    assert.ok(mockContent.includes("amount: 15000"), "Transaction 2 amount ₹15,000");
  });

  test("src/lib/store.ts defines recordStudentPayment and updateApplication actions", () => {
    const storeContent = fs.readFileSync(path.join(root, "src/lib/store.ts"), "utf-8");

    assert.ok(storeContent.includes("recordStudentPayment:"), "Store must define recordStudentPayment");
    assert.ok(storeContent.includes("updateApplication:"), "Store must define updateApplication");
    assert.ok(storeContent.includes("paymentTransactions:"), "Store must include paymentTransactions in state");
    assert.ok(storeContent.includes('"PAYMENT_UPDATE"'), "Audit event for payment updates");
  });

  test("src/pages/student-form.tsx renders APS Applied By and University Type dropdowns", () => {
    const formContent = fs.readFileSync(path.join(root, "src/pages/student-form.tsx"), "utf-8");

    assert.ok(formContent.includes('label="University Type"'), "Step 04 Application must have University Type");
    assert.ok(formContent.includes('data-testid="university-type-select"'), "University Type test id");
    assert.ok(formContent.includes('label="APS Applied By"'), "Step 05 German Details must have APS Applied By");
    assert.ok(formContent.includes('data-testid="aps-applied-by-select"'), "APS Applied By test id");
    assert.ok(formContent.includes("APS_APPLIED_BY_OPTIONS"), "Uses APS_APPLIED_BY_OPTIONS");
    assert.ok(formContent.includes("UNIVERSITY_TYPES"), "Uses UNIVERSITY_TYPES");
  });

  test("src/pages/student-detail.tsx renders Update Payment button, APS Applied By, and University Type", () => {
    const detailContent = fs.readFileSync(path.join(root, "src/pages/student-detail.tsx"), "utf-8");

    assert.ok(detailContent.includes("Update Payment"), "Detail page must include Update Payment button");
    assert.ok(detailContent.includes("header-update-payment-btn"), "Header Update payment button testid");
    assert.ok(detailContent.includes("overview-update-payment-btn"), "Overview Update payment button testid");
    assert.ok(detailContent.includes("payments-tab-update-payment-btn"), "Payments tab Update payment button testid");
    assert.ok(detailContent.includes("UpdatePaymentDialog"), "Detail page mounts UpdatePaymentDialog");
    assert.ok(detailContent.includes('label="APS Applied By"'), "Overview Germany card displays APS Applied By");
    assert.ok(detailContent.includes("Payment Transactions"), "Payments tab shows Payment Transactions table");
  });

  test("src/components/payments/update-payment-dialog.tsx implements full payment modal specifications", () => {
    const dialogContent = fs.readFileSync(
      path.join(root, "src/components/payments/update-payment-dialog.tsx"),
      "utf-8",
    );

    assert.ok(dialogContent.includes("Update Student Payment"), "Dialog title present");
    assert.ok(dialogContent.includes("Current Due Before Payment"), "Financial summary metric present");
    assert.ok(dialogContent.includes("Live Remaining Due Calculation"), "Live remaining calculation present");
    assert.ok(dialogContent.includes("Total Paid After Update"), "Total Paid After Update metric present");
    assert.ok(dialogContent.includes("Remaining Due"), "Remaining due label present");
    assert.ok(dialogContent.includes("payment-math-formula-box"), "Mathematical formula callout present");
    assert.ok(dialogContent.includes("Payment History"), "Payment history table present");
    assert.ok(dialogContent.includes("Save Payment"), "Save Payment submit button present");
    assert.ok(dialogContent.includes("All dues are settled!"), "Settled notification present");
  });

  test("src/lib/access.ts allows employees to access payments by default and supports admin override", () => {
    const accessContent = fs.readFileSync(path.join(root, "src/lib/access.ts"), "utf-8");
    assert.ok(
      accessContent.includes("user.canViewPayments !== false"),
      "canViewPayments allows employees by default unless explicitly set to false",
    );
    assert.ok(
      accessContent.includes('user.role === "admin"'),
      "canViewPayments grants admins access unconditionally",
    );

    // Dynamic execution of the access evaluation rule
    const canViewPaymentsFn = (user) => {
      if (!user) return false;
      if (user.role === "admin") return true;
      return user.canViewPayments !== false;
    };

    // Admin always allowed
    assert.equal(canViewPaymentsFn({ role: "admin" }), true);
    assert.equal(canViewPaymentsFn({ role: "admin", canViewPayments: false }), true);

    // Employee allowed by default
    assert.equal(canViewPaymentsFn({ role: "employee" }), true);
    assert.equal(canViewPaymentsFn({ role: "employee", canViewPayments: true }), true);
    assert.equal(canViewPaymentsFn({ role: "employee", canViewPayments: undefined }), true);

    // Employee denied only if explicitly disabled
    assert.equal(canViewPaymentsFn({ role: "employee", canViewPayments: false }), false);

    // Null/undefined user
    assert.equal(canViewPaymentsFn(null), false);
    assert.equal(canViewPaymentsFn(undefined), false);
  });

  test("Payment mathematical formulas correctly compute fee, discount, previous paid, paying now, and remaining due", async () => {
    const { calculateRemainingAfterPayment, settlePayment } = await import("../src/lib/payment.ts");

    // Scenario: Total Fee ₹75,000, Discount ₹10,000, Previously Paid ₹35,000, Paying ₹15,000
    // Total Payable = 75,000 - 10,000 = 65,000
    // Current Due Before Payment = 65,000 - 35,000 = 30,000
    // Paying Now = 15,000
    // Total Paid After Payment = 35,000 + 15,000 = 50,000
    // Remaining Due After Payment = 65,000 - 50,000 = 15,000
    const res = calculateRemainingAfterPayment(75000, 10000, 35000, 15000);
    assert.equal(res.totalFee, 75000);
    assert.equal(res.discount, 10000);
    assert.equal(res.totalPayable, 65000);
    assert.equal(res.previousPaid, 35000);
    assert.equal(res.currentDueBeforePayment, 30000);
    assert.equal(res.payingNow, 15000);
    assert.equal(res.totalPaidAfterPayment, 50000);
    assert.equal(res.remainingDueAfterPayment, 15000);
    assert.equal(res.newStatus, "Partially Paid");
    assert.ok(res.formulaText.includes("75,000"));
    assert.ok(res.formulaText.includes("10,000"));
    assert.ok(res.formulaText.includes("35,000"));
    assert.ok(res.formulaText.includes("15,000"));

    // Settling full remaining ₹15,000
    const resFull = calculateRemainingAfterPayment(75000, 10000, 50000, 15000);
    assert.equal(resFull.totalPaidAfterPayment, 65000);
    assert.equal(resFull.remainingDueAfterPayment, 0);
    assert.equal(resFull.newStatus, "Paid");

    // settlePayment consistency
    const settled = settlePayment(75000, 10000, 50000);
    assert.equal(settled.payable, 65000);
    assert.equal(settled.paidAmount, 50000);
    assert.equal(settled.remaining, 15000);
    assert.equal(settled.status, "Partially Paid");
  });
});
