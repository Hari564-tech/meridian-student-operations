import { useMemo, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import { PaymentBadge } from "@/components/status-badge";
import { useAppStore } from "@/lib/store";
import { formatINR, formatDate } from "@/lib/format";
import {
  calculateRemainingAfterPayment,
  getStudentPaymentDetails,
  type StudentFinancialSummary,
} from "@/lib/payment";
import {
  PAYMENT_METHODS,
  type PaymentMethod,
  type PaymentTransaction,
  type Student,
} from "@/lib/types";
import {
  AlertCircle,
  ArrowRight,
  Calculator,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileCheck,
  FileText,
  History,
  Info,
  PlusCircle,
  Receipt,
  Upload,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface UpdatePaymentDialogProps {
  student: Student;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentRecorded?: (summary: {
    amount: number;
    remaining: number;
    transaction: PaymentTransaction;
  }) => void;
}

export function UpdatePaymentDialog({
  student,
  open,
  onOpenChange,
  onPaymentRecorded,
}: UpdatePaymentDialogProps) {
  const allTransactions = useAppStore((s) => s.paymentTransactions);
  const recordStudentPayment = useAppStore((s) => s.recordStudentPayment);
  const currentUser = useAppStore((s) => s.currentUser);
  const employees = useAppStore((s) => s.employees);

  const counselor = employees.find((e) => e.id === student.employeeId)?.name;
  const financialSummary: StudentFinancialSummary = useMemo(
    () => getStudentPaymentDetails(student, allTransactions, counselor),
    [student, allTransactions, counselor],
  );

  const [activeTab, setActiveTab] = useState<"record" | "history" | "success">("record");
  const [amountInput, setAmountInput] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [method, setMethod] = useState<PaymentMethod>("Bank Transfer");
  const [customMethod, setCustomMethod] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [receiptFileName, setReceiptFileName] = useState<string>("");
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastPaymentResult, setLastPaymentResult] = useState<{
    amount: number;
    date: string;
    method: string;
    remaining: number;
    totalPaid: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse numeric amount from string
  const numAmount = Math.max(0, parseInt(amountInput.replace(/[^0-9]/g, ""), 10) || 0);

  const calculation = useMemo(
    () =>
      calculateRemainingAfterPayment(
        financialSummary.totalFee,
        financialSummary.discount,
        financialSummary.totalPaid,
        numAmount,
      ),
    [financialSummary, numAmount],
  );

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    if (!raw) {
      setAmountInput("");
      return;
    }
    const val = parseInt(raw, 10);
    setAmountInput(val.toLocaleString("en-IN"));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearFile = () => {
    setReceiptFileName("");
    setReceiptUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSavePayment = async () => {
    if (numAmount <= 0) {
      toast.error("Please enter a valid payment amount greater than ₹0");
      return;
    }
    if (!paymentDate) {
      toast.error("Please choose a valid payment date");
      return;
    }

    setIsSaving(true);
    try {
      const chosenMethod =
        method === "Other" && customMethod.trim() ? customMethod.trim() : method;

      const res = recordStudentPayment({
        studentId: student.id,
        amount: numAmount,
        paymentDate,
        method: chosenMethod,
        customMethod: method === "Other" ? customMethod.trim() : undefined,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        receiptUrl: receiptUrl || undefined,
        receiptFileName: receiptFileName || undefined,
        recordedBy: currentUser?.name || "Counselor",
        recordedById: currentUser?.id,
      });

      if (res.ok) {
        setLastPaymentResult({
          amount: numAmount,
          date: paymentDate,
          method: chosenMethod,
          remaining: res.remaining,
          totalPaid: res.totalPaid,
        });
        toast.success(`Payment of ${formatINR(numAmount)} recorded successfully!`);
        onPaymentRecorded?.({
          amount: numAmount,
          remaining: res.remaining,
          transaction: res.transaction,
        });
        setActiveTab("success");
      } else {
        toast.error("Failed to record payment. Please try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving the payment.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetForNewPayment = () => {
    setAmountInput("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setMethod("Bank Transfer");
    setCustomMethod("");
    setReference("");
    setNotes("");
    setReceiptFileName("");
    setReceiptUrl("");
    setActiveTab("record");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl sm:max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden"
        data-testid="update-payment-dialog"
      >
        {/* Dialog Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="size-5 text-primary" />
                Update Student Payment
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Record new date-wise payments, track receipts, and calculate live dues for{" "}
                <span className="font-semibold text-foreground">{student.name}</span> ({student.id})
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1.5 mr-6">
              <Button
                variant={activeTab === "record" ? "secondary" : "ghost"}
                size="xs"
                onClick={() => setActiveTab("record")}
                data-testid="tab-record-payment"
              >
                <PlusCircle className="size-3.5 mr-1" />
                Record Payment
              </Button>
              <Button
                variant={activeTab === "history" ? "secondary" : "ghost"}
                size="xs"
                onClick={() => setActiveTab("history")}
                data-testid="tab-payment-history"
              >
                <History className="size-3.5 mr-1" />
                History ({financialSummary.transactions.length})
              </Button>
            </div>
          </div>

          {/* Top Financial Summary Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-3.5">
            <div className="rounded-lg border bg-secondary/30 p-2.5">
              <p className="text-[11px] font-medium text-muted-foreground">Total Fee</p>
              <p className="text-sm font-semibold tracking-tight text-foreground">
                {formatINR(financialSummary.totalFee)}
              </p>
              {financialSummary.discount > 0 && (
                <p className="text-[10px] text-emerald-600 font-medium">
                  -{formatINR(financialSummary.discount)} discount
                </p>
              )}
            </div>

            <div className="rounded-lg border bg-secondary/30 p-2.5">
              <p className="text-[11px] font-medium text-muted-foreground">Net Payable</p>
              <p className="text-sm font-semibold tracking-tight text-foreground">
                {formatINR(financialSummary.totalPayable)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Fee − Discount
              </p>
            </div>

            <div className="rounded-lg border bg-secondary/30 p-2.5">
              <p className="text-[11px] font-medium text-muted-foreground">Previously Paid</p>
              <p className="text-sm font-semibold tracking-tight text-emerald-600">
                {formatINR(financialSummary.totalPaid)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {financialSummary.transactions.length} record(s)
              </p>
            </div>

            <div className="rounded-lg border bg-secondary/30 p-2.5">
              <p className="text-[11px] font-medium text-muted-foreground">Current Due Before Payment</p>
              <p
                className={`text-sm font-semibold tracking-tight ${
                  financialSummary.currentDue > 0 ? "text-amber-600" : "text-emerald-600"
                }`}
              >
                {formatINR(financialSummary.currentDue)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {financialSummary.currentDue > 0 ? "Balance pending" : "No dues"}
              </p>
            </div>

            <div className="rounded-lg border bg-secondary/30 p-2.5 flex flex-col justify-between">
              <p className="text-[11px] font-medium text-muted-foreground">Payment Status</p>
              <div className="mt-1">
                <PaymentBadge status={financialSummary.status} />
              </div>
            </div>
          </div>
        </div>

        {/* Dialog Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* SUCCESS VIEW */}
          {activeTab === "success" && lastPaymentResult && (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
              <div className="size-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-in zoom-in-75">
                <CheckCircle2 className="size-8" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Payment Successfully Recorded!
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  The transaction was securely saved, financial totals were updated, and an audit
                  entry was logged.
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="w-full max-w-md rounded-xl border border-border bg-secondary/20 p-4 text-left space-y-2.5 text-xs">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground">Student:</span>
                  <span className="font-semibold text-foreground">
                    {student.name} ({student.id})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payment Amount:</span>
                  <span className="font-bold text-emerald-600 text-sm">
                    {formatINR(lastPaymentResult.amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payment Date:</span>
                  <span className="font-medium text-foreground">{formatDate(lastPaymentResult.date)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-medium text-foreground">{lastPaymentResult.method}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-muted-foreground">Net Payable:</span>
                  <span className="font-semibold text-foreground">
                    {formatINR(financialSummary.totalPayable)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Amount Paid (Updated):</span>
                  <span className="font-semibold text-emerald-600">
                    {formatINR(lastPaymentResult.totalPaid)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Remaining Due:</span>
                  <span
                    className={`font-semibold ${
                      lastPaymentResult.remaining === 0 ? "text-emerald-600 font-bold" : "text-amber-600"
                    }`}
                  >
                    {formatINR(lastPaymentResult.remaining)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">New Payment Status:</span>
                  <PaymentBadge status={lastPaymentResult.remaining === 0 ? "Paid" : "Partially Paid"} />
                </div>
                <div className="pt-2 border-t text-[11px] text-muted-foreground font-mono bg-secondary/30 p-2 rounded">
                  Formula verified: ({formatINR(financialSummary.totalPayable)} Net Payable − {formatINR(lastPaymentResult.totalPaid)} Total Paid) = {formatINR(lastPaymentResult.remaining)} Remaining Due
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("history")}
                  data-testid="success-view-history-btn"
                >
                  <History className="size-4 mr-1.5" />
                  View Payment History
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetForNewPayment}
                  data-testid="success-record-another-btn"
                >
                  <PlusCircle className="size-4 mr-1.5" />
                  Record Another Payment
                </Button>
                <Button
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  data-testid="success-done-btn"
                >
                  Done
                </Button>
              </div>
            </div>
          )}

          {/* RECORD NEW PAYMENT VIEW */}
          {activeTab === "record" && (
            <div className="space-y-4">
              {/* Overpayment Warning or Fully Paid Notice */}
              {calculation.isFullyPaid && (
                <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-900">
                  <Info className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">All dues are settled!</span> Current balance
                    is ₹0. Any new payment recorded here will be tracked as an advance or excess
                    deposit.
                  </div>
                </div>
              )}

              {calculation.isOverpayment && (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-900">
                  <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Notice:</span> Entered amount ({formatINR(numAmount)})
                    exceeds current pending balance of {formatINR(calculation.currentDueBeforePayment)} by{" "}
                    <span className="font-bold">
                      {formatINR(numAmount - calculation.currentDueBeforePayment)}
                    </span>
                    . Remaining due will be set to ₹0.
                  </div>
                </div>
              )}

              {/* Form Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Payment Amount */}
                <FormField label="Payment Amount *" error={numAmount <= 0 && amountInput ? "Amount must be greater than ₹0" : undefined}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">
                      ₹
                    </span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 25,000"
                      className="pl-7 font-medium text-foreground text-sm"
                      value={amountInput}
                      onChange={handleAmountChange}
                      data-testid="payment-amount-input"
                      autoFocus
                    />
                  </div>
                </FormField>

                {/* Payment Date */}
                <FormField label="Payment Date *">
                  <Input
                    type="date"
                    className="text-sm"
                    value={paymentDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    data-testid="payment-date-input"
                  />
                </FormField>

                {/* Payment Method */}
                <FormField label="Payment Method *">
                  <Select
                    value={method}
                    onValueChange={(v) => setMethod(v as PaymentMethod)}
                  >
                    <SelectTrigger data-testid="payment-method-select">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                {/* Custom Method if "Other" */}
                {method === "Other" && (
                  <FormField label="Specify Custom Method *">
                    <Input
                      type="text"
                      placeholder="e.g. Cheque, Demand Draft, Wire"
                      value={customMethod}
                      onChange={(e) => setCustomMethod(e.target.value)}
                      data-testid="custom-method-input"
                    />
                  </FormField>
                )}

                {/* Reference ID */}
                <FormField label="Transaction / Reference ID">
                  <Input
                    type="text"
                    placeholder="e.g. UPI/1234567890 or NEFT-REF-9988"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    data-testid="payment-reference-input"
                  />
                </FormField>

                {/* Recorded By info */}
                <FormField label="Recorded By">
                  <Input
                    type="text"
                    disabled
                    value={`${currentUser?.name ?? "Counselor"} (${currentUser?.role ?? "Employee"})`}
                    className="bg-secondary/40 text-muted-foreground cursor-not-allowed"
                  />
                </FormField>
              </div>

              {/* Notes */}
              <FormField label="Payment Notes (Optional)">
                <Textarea
                  placeholder="e.g. Second installment against tuition advance, verified with bank statement..."
                  className="resize-none h-18 text-xs"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  data-testid="payment-notes-input"
                />
              </FormField>

              {/* Receipt File Upload */}
              <FormField label="Payment Screenshot / Receipt">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="upload-receipt-btn"
                    >
                      <Upload className="size-3.5 mr-1.5" />
                      {receiptFileName ? "Change Receipt File" : "Upload Receipt"}
                    </Button>
                    {receiptFileName && (
                      <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-2.5 py-1 text-xs">
                        <FileCheck className="size-3.5 text-emerald-600" />
                        <span className="font-medium truncate max-w-[200px]">
                          {receiptFileName}
                        </span>
                        <button
                          type="button"
                          onClick={handleClearFile}
                          className="text-muted-foreground hover:text-foreground"
                          title="Remove file"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Accepts PNG, JPG, or PDF receipts up to 10MB.
                  </p>
                </div>
              </FormField>

              {/* LIVE REMAINING DUE CALCULATION CARD */}
              <div
                className={`rounded-xl border p-4 transition-all duration-200 ${
                  numAmount > 0
                    ? calculation.remainingDueAfterPayment === 0
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-primary/30 bg-primary/5"
                    : "border-border bg-secondary/15"
                }`}
                data-testid="live-calculation-card"
              >
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <CreditCard className="size-3.5 text-primary" />
                    Live Remaining Due Calculation
                  </span>
                  {numAmount > 0 && calculation.remainingDueAfterPayment === 0 ? (
                    <Badge variant="default" className="bg-emerald-600 text-white text-[10px]">
                      Fully Settled After Payment
                    </Badge>
                  ) : numAmount > 0 ? (
                    <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                      Status after save: {calculation.newStatus}
                    </Badge>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-center">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                      Current Due
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {formatINR(calculation.currentDueBeforePayment)}
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                      Paying Now <ArrowRight className="size-2.5" />
                    </p>
                    <p className="text-sm font-bold text-primary">
                      {numAmount > 0 ? formatINR(numAmount) : "₹0"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                      Total Paid After Update
                    </p>
                    <p className="text-sm font-bold text-emerald-600">
                      {formatINR(calculation.totalPaidAfterPayment)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                      Remaining Due
                    </p>
                    <p
                      className={`text-base font-extrabold ${
                        calculation.remainingDueAfterPayment === 0
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}
                    >
                      {formatINR(calculation.remainingDueAfterPayment)}
                    </p>
                  </div>
                </div>

                {/* Mathematical Formula Callout */}
                <div className="mt-3.5 pt-3 border-t border-border/60 text-left space-y-1.5" data-testid="payment-math-formula-box">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                    <Calculator className="size-3.5 text-primary" />
                    <span>Calculation Formula:</span>
                    <span className="font-mono text-[11px] text-foreground bg-secondary/60 px-2 py-0.5 rounded">
                      Remaining Due = (Total Fee − Discount) − (Previously Paid + Paying Now)
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground bg-secondary/20 rounded p-2 border border-border/40 font-mono">
                    <span className="text-foreground font-medium">Live Computation:</span>{" "}
                    ({formatINR(calculation.totalFee)} − {formatINR(calculation.discount)}) − ({formatINR(calculation.previousPaid)} + {formatINR(calculation.payingNow)}) ={" "}
                    <span className={calculation.remainingDueAfterPayment === 0 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                      {formatINR(calculation.remainingDueAfterPayment)} Remaining Due
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HISTORY VIEW */}
          {activeTab === "history" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Payment History ({financialSummary.transactions.length})
                </h4>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setActiveTab("record")}
                  data-testid="history-record-new-btn"
                >
                  <PlusCircle className="size-3.5 mr-1" />
                  Record New Payment
                </Button>
              </div>

              {financialSummary.transactions.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
                  <Receipt className="size-8 text-muted-foreground/50 mx-auto mb-2" />
                  No payments have been recorded for this student yet.
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-secondary/40 border-b text-muted-foreground font-medium">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Method</th>
                        <th className="py-2.5 px-3">Reference / ID</th>
                        <th className="py-2.5 px-3">Recorded By</th>
                        <th className="py-2.5 px-3">Receipt</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {financialSummary.transactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="hover:bg-secondary/20 transition-colors"
                          data-testid={`txn-row-${tx.id}`}
                        >
                          <td className="py-2.5 px-3 font-medium text-foreground whitespace-nowrap">
                            {formatDate(tx.paymentDate)}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-emerald-600 whitespace-nowrap">
                            {formatINR(tx.amount)}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {tx.customMethod || tx.method}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px] truncate max-w-[120px]">
                            {tx.reference || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground truncate max-w-[100px]">
                            {tx.recordedBy}
                          </td>
                          <td className="py-2.5 px-3">
                            {tx.receiptUrl ? (
                              <a
                                href={tx.receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                download={tx.receiptFileName || "receipt.pdf"}
                                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                              >
                                <Download className="size-3" />
                                {tx.receiptFileName ? tx.receiptFileName.slice(0, 10) + "..." : "View"}
                              </a>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        {activeTab === "record" && (
          <DialogFooter className="px-6 py-3 border-t border-border bg-card flex items-center justify-between sm:justify-between">
            <div className="text-xs text-muted-foreground">
              {numAmount > 0 ? (
                <span>
                  Adding <span className="font-semibold text-foreground">{formatINR(numAmount)}</span>{" "}
                  via {method}
                </span>
              ) : (
                <span>Enter an amount to update payment balance</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={numAmount <= 0 || !paymentDate || isSaving}
                onClick={handleSavePayment}
                data-testid="save-payment-submit-btn"
              >
                {isSaving ? "Saving Payment..." : "Save Payment"}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
