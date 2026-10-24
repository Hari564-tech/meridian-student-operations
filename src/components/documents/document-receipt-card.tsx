import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentReceiptBadge } from "@/components/documents/document-receipt-badge";
import {
  DOCUMENT_RECEIPT_STATUSES,
  getStudentDocumentReceiptStatus,
  type DocumentReceiptStatus,
} from "@/lib/documents";
import { useAppStore } from "@/lib/store";
import type { Student, StudentDocument } from "@/lib/types";
import { toast } from "sonner";

export function DocumentReceiptStatusCard({
  student,
  documents,
}: {
  student: Student;
  documents: StudentDocument[];
}) {
  const updateStudent = useAppStore((s) => s.updateStudent);
  const appendAudit = useAppStore((s) => s.appendAudit);
  const currentUser = useAppStore((s) => s.currentUser);

  const receiptSummary = useMemo(
    () => getStudentDocumentReceiptStatus(student, documents),
    [student, documents],
  );

  const currentSavedStatus = student.documentReceiptStatus ?? receiptSummary.status;
  const initialDropdownVal: DocumentReceiptStatus =
    currentSavedStatus === "No Requirements Configured"
      ? "Not Received"
      : (currentSavedStatus as DocumentReceiptStatus);

  const [selectedStatus, setSelectedStatus] = useState<DocumentReceiptStatus>(initialDropdownVal);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedStatus(initialDropdownVal);
  }, [student.documentReceiptStatus, receiptSummary.status]);

  const hasChanged =
    selectedStatus !== student.documentReceiptStatus &&
    selectedStatus !== currentSavedStatus;

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    const toastId = toast.loading("Saving document receipt status...");

    try {
      await new Promise((r) => setTimeout(r, 120));
      updateStudent(student.id, { documentReceiptStatus: selectedStatus });

      const employeeName = currentUser?.name ?? "Staff";
      appendAudit({
        action: "STATUS_CHANGE",
        module: "Students",
        recordId: student.id,
        details: `${employeeName} updated Overall Document Receipt Status. Previous: ${currentSavedStatus}, New: ${selectedStatus}`,
        before: currentSavedStatus,
        after: selectedStatus,
        severity: "INFO",
      });

      toast.success("Document receipt status updated successfully.", { id: toastId });
    } catch (err) {
      console.error("Failed to update document receipt status:", err);
      setSaveError("Unable to save status. Please try again.");
      toast.error("Unable to save document receipt status. Please try again.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="p-5 border-l-4 border-l-primary shadow-sm" data-testid="overall-document-receipt-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Overall Document Receipt Status
            </h3>
            <DocumentReceiptBadge status={receiptSummary.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            {receiptSummary.status === "No Requirements Configured"
              ? "No required document checklist configured for this destination country."
              : `Overall submission status across ${receiptSummary.totalRequired} required checklist documents (${receiptSummary.receivedRequired} received).`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="w-[200px]">
            <Select
              value={selectedStatus}
              onValueChange={(val) => {
                setSelectedStatus(val as DocumentReceiptStatus);
                setSaveError(null);
              }}
              disabled={isSaving}
            >
              <SelectTrigger
                data-testid="document-receipt-status-trigger"
                aria-label="Overall Document Receipt Status"
                className="h-9 w-full bg-background"
              >
                <SelectValue placeholder="Select status">{selectedStatus}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_RECEIPT_STATUSES.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            data-testid="save-document-receipt-status-button"
            variant="default"
            size="sm"
            disabled={isSaving || !hasChanged}
            onClick={handleSave}
            className="gap-1.5 min-w-[105px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Status</span>
            )}
          </Button>
        </div>
      </div>

      {saveError && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <span>{saveError}</span>
          <Button
            variant="ghost"
            size="xs"
            onClick={handleSave}
            className="text-destructive underline hover:bg-destructive/10"
          >
            Retry
          </Button>
        </div>
      )}
    </Card>
  );
}
