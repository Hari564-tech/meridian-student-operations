# Active Context

## Current Phase: APS Applied By, University Type & Student Payment Management — Fully Verified & Delivered

### Completed Tasks
1. **German-Specific Details — APS Applied By**:
   - Added dropdown selector with exact options `Student` and `By Employee` in Step 05 *German-Specific Details* of Add/Edit Student forms (`src/pages/student-form.tsx`).
   - Persisted as `apsAppliedBy` on `Student` model (`src/lib/types.ts`).
   - Pre-populated when editing existing students (`/admin/students/:id/edit`).
   - Displayed in Step 08 *Review* and in the student profile Overview *Germany-Specific Status* card with semantic badge and quick editing dialog (`QuickGermanyStatusDialog`).
   - Preserved across step navigation, form draft caching, and browser refreshes.
   - Visible for Germany-bound students and decoupled from Lead by Employee / Lead Type.
2. **Application Section — University Type**:
   - Added dropdown selector with exact options `Public University` and `Private University` in Step 04 *Application* of Add/Edit Student forms (`src/pages/student-form.tsx`).
   - Configurable at the student record level (`student.universityType`) and per individual application (`application.universityType`).
   - Displayed in Step 08 *Review* and in the student profile Overview *Personal* card.
   - Applications tab table includes an interactive **Type** column with dropdown selection, allowing counselors to update university type per application with immediate persistence and toast feedback.
3. **Student Profile — Update Payment Modal & Transaction Management (`src/components/payments/update-payment-dialog.tsx`)**:
   - Prominent `Update Payment` buttons on profile header, actions dropdown, Overview payment card, Payments tab, and global Payments page.
   - **Top Financial Summary Strip**: Total Fees, Discount, Total Amount Previously Paid with record count, Current Due Before Payment, and Payment Status badge.
   - **Non-Overwriting Payment History Table**: Complete date-wise transactions (Date, Amount, Method, Reference / ID, Recorded By, Notes, Receipt, Status), sorted latest first.
   - **Record New Payment Form**:
     - Payment Amount * (> 0, currency formatted ₹, auto-calculated live remaining due).
     - Payment Date * (native date input, defaults to today YYYY-MM-DD, editable, saved separately from creation timestamp).
     - Payment Method (`Cash`, `Bank Transfer`, `UPI`, `Card`, `Other`; when `Other` selected, prompts for custom method).
     - Transaction / Reference ID input.
     - Notes input.
     - Screenshot / Receipt file attachment with preview badge.
   - **Live Remaining Due Calculation Card**:
     - `Remaining Due After Payment = Current Due Before Payment - Current Payment Amount`.
     - Color-coded: emerald for ₹0, primary blue for partial balance, amber warning notice if overpayment entered.
     - Settled notice: displays *"All dues are settled!"* if current due before payment is ₹0.
   - **Success View**:
     - Confirmed receipt summary with Student name, Payment Amount, Payment Date, Total Amount Paid, and Remaining Due.
     - Quick actions: `[View Payment History]`, `[Record Another Payment]`, and `[Done]`.
   - **Reconciliation & Store Integration (`src/lib/payment.ts`, `src/lib/store.ts`)**:
     - `calculateRemainingAfterPayment` guarantees non-negative balances and handles edge cases.
     - `getStudentPaymentDetails` unifies transaction aggregation without double-counting legacy initial payments.
     - `recordStudentPayment` updates `paymentTransactions`, `student.paidAmount`, `student.paymentStatus`, `payment.remaining`, and logs audit event `PAYMENT_UPDATE`.
     - Seeded initial transactions for Rahul Kumar (OCT26_001): ₹20,000 on 2026-10-01 and ₹15,000 on 2026-10-05 against ₹75,000 total fees.
4. **Verification & Quality Gates**:
   - `node --test scripts/aps-university-payment.test.mjs`: 7/7 unit tests passed.
   - `npm test`: 59/59 tests passed across 18 suites.
   - `npm run typecheck`: Exit code 0, 0 TypeScript errors.
   - `npm run build`: Exit code 0, production build packaged.
   - `scripts/verify-aps-university-payment.mjs`: 100% passed in Playwright, generating screenshots for all steps and modal interactions.
   - Pushed cleanly to GitHub `origin/main` (`commit 3b26446`).
