import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CreditCard,
  FileText,
  GraduationCap,
  Loader2,
  MoreHorizontal,
  Pencil,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PasswordField } from "@/components/password-field";
import { PaymentBadge, StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { PersonAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentWorkspace } from "@/components/documents/document-workspace";
import { DocumentSubmissionBadge } from "@/components/documents/document-submission-badge";
import { DocumentReceiptBadge } from "@/components/documents/document-receipt-badge";
import { calculateDocumentSubmissionStatus, getStudentDocumentReceiptStatus } from "@/lib/documents";
import { useAppStore } from "@/lib/store";
import { useEmployeeMap, useUniversityMap } from "@/lib/scoped";
import { useWorkspace } from "@/lib/workspace";
import { useCanViewPayments } from "@/lib/access";
import {
  APPLICATION_STATUSES,
  BLOCKED_ACCOUNT_OPTIONS,
  ENROLLMENT_STATUS_OPTIONS,
  STUDENT_DORM_STATUS_OPTIONS,
  englishFromStudent,
  getStudentRecoveryNumbers,
  type ApplicationStatus,
  type Student,
} from "@/lib/types";
import { formatINR, formatShortDate, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function StudentDetailPage({ studentId }: { studentId: string }) {
  const students = useAppStore((s) => s.students);
  const student = students.find((s) => s.id === studentId);
  const applications = useAppStore((s) => s.applications).filter((a) => a.studentId === studentId);
  const documents = useAppStore((s) => s.documents).filter((d) => d.studentId === studentId);
  const payments = useAppStore((s) => s.payments).filter((p) => p.studentId === studentId);
  const audit = useAppStore((s) => s.auditEvents).filter((e) => e.recordId === studentId);
  const changeStatus = useAppStore((s) => s.changeStudentStatus);
  const updateStudent = useAppStore((s) => s.updateStudent);
  const appendAudit = useAppStore((s) => s.appendAudit);
  const upsertApplication = useAppStore((s) => s.upsertApplication);
  const deleteStudent = useAppStore((s) => s.deleteStudent);
  const empMap = useEmployeeMap();
  const uniMap = useUniversityMap();
  const { base, role } = useWorkspace();
  const currentUser = useAppStore((s) => s.currentUser);
  const showPayments = useCanViewPayments();
  const canViewSecrets = role === "admin" || (!!currentUser && student?.employeeId === currentUser.id);
  const canEditStatus = role === "admin" || role === "employee";
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);

  const timeline = useMemo(() => {
    if (!student) return [];
    const events = [
      {
        id: "reg",
        timestamp: student.createdAt,
        title: "Student registered",
        detail: `${student.name} was added to ${student.intake}.`,
        user: empMap[student.employeeId]?.name,
      },
      ...applications
        .filter((a) => a.submittedAt)
        .map((a) => ({
          id: a.id,
          timestamp: a.submittedAt!,
          title: a.offerReceived ? "Offer received" : "Application submitted",
          detail: `${uniMap[a.universityId]?.name ?? "University"} · ${a.course}`,
          user: empMap[a.employeeId]?.name,
        })),
      ...audit.slice(0, 12).map((e) => ({
        id: e.id,
        timestamp: e.timestamp,
        title: e.details,
        detail: e.before && e.after ? `${e.before} → ${e.after}` : undefined,
        user: e.user,
      })),
    ];
    return events.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }, [student, applications, audit, empMap, uniMap]);

  if (!student) {
    return (
      <EmptyState
        title="Student not found"
        description="This record may have been deleted."
        actionLabel="Back to students"
        onAction={() => void navigate({ to: `${base}/students` })}
      />
    );
  }

  const remaining = Math.max(0, student.totalFee - student.discount - student.paidAmount);
  const pct = student.totalFee ? Math.round((student.paidAmount / (student.totalFee - student.discount || 1)) * 100) : 0;
  const counselor = empMap[student.employeeId];
  const offers = applications.filter((a) => a.offerReceived).length;
  const recovery = useMemo(() => getStudentRecoveryNumbers(student), [student]);
  const initialTab =
    typeof window !== "undefined" &&
    (new URLSearchParams(window.location.search).get("tab") === "documents" ||
      sessionStorage.getItem(`aa-upload-${student.id}`) ||
      sessionStorage.getItem(`aa-portal-${student.id}`))
      ? "documents"
      : "overview";

  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    if (tabParam === "documents") {
      setTab("documents");
    }
  }, [studentId]);

  const submissionSummary = useMemo(
    () => calculateDocumentSubmissionStatus(documents),
    [documents],
  );
  const receiptSummary = useMemo(
    () => getStudentDocumentReceiptStatus(student, documents),
    [student, documents],
  );

  const isGermany =
    student.country === "Germany" ||
    Boolean(
      student.apsUsername ||
      student.apsPassword ||
      student.uniAssistId ||
      student.uniAssistPassword ||
      (student.blockedAccount && student.blockedAccount !== "Not Applied") ||
      (student.enrollment && student.enrollment !== "Not Applied") ||
      (student.studentDorm && student.studentDorm !== "Not Applied"),
    );

  const [quickStatusOpen, setQuickStatusOpen] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleStatusUpdate(
    field: "blockedAccount" | "enrollment" | "studentDorm",
    label: string,
    newValue: string,
  ) {
    if (!student) return;
    const previousValue = (student[field] as string) || "Not Applied";
    if (previousValue === newValue) return;

    setSavingField(field);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });

    const toastId = toast.loading("Saving status...");

    try {
      await new Promise((r) => setTimeout(r, 120));
      updateStudent(student.id, { [field]: newValue });

      const employeeName = currentUser?.name ?? "Staff";
      appendAudit({
        action: "STATUS_CHANGE",
        module: "Students",
        recordId: student.id,
        details: `${employeeName} updated ${label}. Previous value: ${previousValue}, New value: ${newValue}`,
        before: previousValue,
        after: newValue,
        severity: "INFO",
      });

      toast.success(`✓ ${label} status updated successfully.`, { id: toastId });
    } catch (err) {
      console.error(`Failed to update ${label}:`, err);
      toast.error("Unable to update status. Please try again.", { id: toastId });
      setFieldErrors((prev) => ({
        ...prev,
        [field]: "Unable to update status. Please try again.",
      }));
    } finally {
      setSavingField(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={student.name}
        description={`${student.id} · ${student.country} · ${student.intake}`}
        actions={
          <>
            <Select
              value={student.status}
              onValueChange={(v) => {
                changeStatus(student.id, v as ApplicationStatus);
                toast.success("Status changed");
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLICATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isGermany && (
              <Button
                variant="outline"
                onClick={() => setQuickStatusOpen(true)}
                className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
              >
                <SlidersHorizontal className="size-4" /> Germany Status
              </Button>
            )}
            <Button variant="outline" onClick={() => void navigate({ to: `${base}/universities?student=${student.id}` })}>
              <GraduationCap className="size-4" /> Check eligibility
            </Button>
            <Button variant="outline" onClick={() => void navigate({ to: `${base}/students/${student.id}/edit` })}>
              <Pencil className="size-4" /> Edit student
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Student actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isGermany && (
                  <DropdownMenuItem onClick={() => setQuickStatusOpen(true)}>
                    <SlidersHorizontal className="size-4" /> Update Germany Status
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => void navigate({ to: `${base}/students/${student.id}/edit` })}>
                  <Pencil className="size-4" /> Edit student
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void navigate({ to: `${base}/universities?student=${student.id}` })}>
                  <GraduationCap className="size-4" /> Check eligibility
                </DropdownMenuItem>
                {role === "admin" && (
                  <DropdownMenuItem destructive onClick={() => setConfirm(true)}>
                    <Trash2 className="size-4" /> Delete student
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <div className="flex items-center gap-3">
        <PersonAvatar name={student.name} hue={student.avatarHue} className="size-12" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={student.status} />
            {showPayments && <PaymentBadge status={student.paymentStatus} />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {student.branch} · {student.college}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Current status</p>
          <p className="mt-1 text-sm font-semibold">{student.status}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Lead employee</p>
          <p className="mt-1 text-sm font-semibold">{counselor?.name ?? "Unassigned"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Document Status</p>
          <div className="mt-1 flex items-center">
            <DocumentReceiptBadge status={receiptSummary.status} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {submissionSummary.totalRequired > 0 ? (
              <>
                Documents: {submissionSummary.receivedRequired} / {submissionSummary.totalRequired} required
              </>
            ) : (
              "No requirements configured"
            )}
          </p>
        </Card>
        {showPayments && (
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Payment</p>
            <p className="mt-1 text-sm font-semibold">
              {formatINR(student.paidAmount)} / {formatINR(student.totalFee)}
            </p>
            <Progress value={Math.min(100, pct)} className="mt-2" />
          </Card>
        )}
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Applications</p>
          <p className="mt-1 text-sm font-semibold">
            {applications.length} · {offers} offers
          </p>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          {showPayments && <TabsTrigger value="payments">Payments</TabsTrigger>}
          <TabsTrigger value="documents">
            Documents
            {receiptSummary.totalRequired > 0 && (
              <span className="ml-1.5 text-micro text-muted-foreground">
                {receiptSummary.receivedRequired}/{receiptSummary.totalRequired}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="universities">Universities</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-2 p-5 border-l-4 border-l-primary" data-testid="overview-document-status-card">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Document Submission Status
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <DocumentReceiptBadge status={receiptSummary.status} className="text-sm px-3 py-1 font-semibold" />
                  {submissionSummary.status !== receiptSummary.status && (
                    <DocumentSubmissionBadge status={submissionSummary.status} className="text-xs px-2.5 py-0.5 font-medium" />
                  )}
                </div>
                <p className="text-sm font-medium mt-1">
                  {receiptSummary.status === "No Requirements Configured"
                    ? "No document requirements configured for this student."
                    : `${receiptSummary.receivedRequired} of ${receiptSummary.totalRequired} required documents received`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTab("documents")}
                className="shrink-0 self-start sm:self-center"
              >
                <FileText className="size-4" /> View Documents
              </Button>
            </div>
            {receiptSummary.totalRequired > 0 && (
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium">{receiptSummary.percentage}%</span>
                  <span>
                    {receiptSummary.remainingRequired === 0
                      ? "All required documents received"
                      : `${receiptSummary.remainingRequired} document${receiptSummary.remainingRequired === 1 ? "" : "s"} remaining`}
                  </span>
                </div>
                <Progress value={receiptSummary.percentage} className="h-2" />
              </div>
            )}
          </Card>

          {isGermany ? (
            <Card className="lg:col-span-2 border-l-4 border-l-amber-500 shadow-sm" data-testid="germany-status-card">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-semibold">Germany-Specific Status</CardTitle>
                      <Badge variant="outline" className="text-micro font-medium bg-amber-50/80 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800">
                        Germany Requirements
                      </Badge>
                    </div>
                    <CardDescription>
                      German-Specific Details & Credentials · Editable status controls save immediately
                    </CardDescription>
                  </div>
                  {savingField && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
                      <Loader2 className="size-3.5 animate-spin text-primary" />
                      <span>Saving status...</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3 pt-1">
                <StatusBadgeField label="Blocked Account"
                  value={student.blockedAccount}
                  options={BLOCKED_ACCOUNT_OPTIONS}
                  onValueChange={(v) => handleStatusUpdate("blockedAccount", "Blocked Account", v)}
                  disabled={!canEditStatus}
                  saving={savingField === "blockedAccount"}
                  error={fieldErrors["blockedAccount"]}
                />
                <StatusBadgeField label="Enrollment Status"
                  value={student.enrollment}
                  options={ENROLLMENT_STATUS_OPTIONS}
                  onValueChange={(v) => handleStatusUpdate("enrollment", "Enrollment Status", v)}
                  disabled={!canEditStatus}
                  saving={savingField === "enrollment"}
                  error={fieldErrors["enrollment"]}
                />
                <StatusBadgeField label="Student Dorm Status"
                  value={student.studentDorm}
                  options={STUDENT_DORM_STATUS_OPTIONS}
                  onValueChange={(v) => handleStatusUpdate("studentDorm", "Student Dorm Status", v)}
                  disabled={!canEditStatus}
                  saving={savingField === "studentDorm"}
                  error={fieldErrors["studentDorm"]}
                />
              </CardContent>
              <div className="border-t px-6 py-4 bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Portal Credentials
                  </p>
                  {!canViewSecrets && (
                    <span className="text-micro text-muted-foreground">
                      Credentials masked. Only administrator or assigned counselor can reveal.
                    </span>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="APS Username" value={student.apsUsername || "—"} />
                  <PasswordField className="min-w-0" label="APS Password" value={canViewSecrets ? (student.apsPassword ?? "") : ""} />
                  <Field label="Uni-Assist ID" value={student.uniAssistId || "—"} />
                  <PasswordField className="min-w-0" label="Uni-Assist Password" value={canViewSecrets ? (student.uniAssistPassword ?? "") : ""} />
                </div>
              </div>
            </Card>
          ) : (
            <Card className="lg:col-span-2 p-4 bg-muted/10 border-dashed border-border/80">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Germany-Specific Status</span>
                  <span>·</span>
                  <span>Not applicable (Destination country: {student.country})</span>
                </div>
                <Badge variant="outline" className="text-micro">Not required</Badge>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Personal</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Application ID" value={student.id} />
              <Field label="Name" value={student.name} />
              <Field label="Phone 1" value={student.phone1} />
              <Field label="Phone 2" value={student.phone2 || "—"} />
              <Field label="Email" value={student.email} />
              <Field label="Country" value={student.country} />
              <Field label="State" value={student.state || "—"} />
              <Field label="District" value={student.district || "—"} />
              <Field label="Village / City" value={student.villageCity || "—"} />
              <Field label="Intake" value={student.intake} />
              <Field label="Branch" value={student.branch} />
              <Field label="College / University" value={student.college} />
              <Field label="Lead type" value={student.leadType} />
              <Field
                label="B2B consultancy"
                value={
                  student.leadType === "B2B"
                    ? student.b2bOrg === "Other"
                      ? student.otherB2bOrg
                        ? `${student.otherB2bOrg} (Other)`
                        : "Other"
                      : student.b2bOrg || "—"
                    : "—"
                }
              />
              <Field label="Device" value={student.device || "—"} />
              <Field label="Lead By" value={counselor?.name ?? "Unassigned"} />
              <Field label="Application status" value={student.status} />
              <Field label="Registered" value={formatShortDate(student.createdAt)} />
              <Field label="Last updated" value={relativeTime(student.updatedAt)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Academic</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <Field label="CGPA" value={student.cgpa.toFixed(2)} />
              <Field label="English test" value={englishFromStudent(student).englishTest ?? "—"} />
              <Field
                label="English score"
                value={
                  englishFromStudent(student).englishScore != null
                    ? String(englishFromStudent(student).englishScore)
                    : "—"
                }
              />
              <Field label="German grade" value={student.germanGrade?.toFixed(1) ?? "—"} />
              <Field label="GRE" value={student.gre?.toString() ?? "—"} />
              <Field label="German language" value={student.germanLanguage} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Account credentials</CardTitle>
              <span className="inline-flex items-center gap-1 text-micro text-warning">
                <ShieldAlert className="size-3" /> Sensitive data
              </span>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="text-xs text-muted-foreground">
                Passwords and recovery numbers stay masked and are encrypted in saved records. Only an administrator or the assigned
                counselor can reveal them.
              </p>
              <Field label="Gmail ID" value={student.gmailId} />
              <PasswordField label="Gmail password" value={canViewSecrets ? student.gmailPassword : ""} />
              <Field
                label="Recovery Number 1 (Primary)"
                value={canViewSecrets ? (recovery.recovery1 || "—") : (recovery.recovery1 ? "••••••••••" : "—")}
              />
              <Field
                label="Recovery Number 2"
                value={canViewSecrets ? (recovery.recovery2 || "—") : (recovery.recovery2 ? "••••••••••" : "—")}
              />
              <Field
                label="Recovery Number 3"
                value={canViewSecrets ? (recovery.recovery3 || "—") : (recovery.recovery3 ? "••••••••••" : "—")}
              />
              <Field label="2-step verification" value={student.twoStep ? "Enabled" : "Off"} />
            </CardContent>
          </Card>
          {showPayments && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4" /> Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Total fee" value={formatINR(student.totalFee)} />
              <Field label="Collected" value={formatINR(student.paidAmount)} />
              <Field label="Discount" value={formatINR(student.discount)} />
              <Field label="Remaining" value={formatINR(remaining)} />
              <Field label="Payment status" value={student.paymentStatus} />
              <Field label="Applications" value={`${applications.length} · ${offers} offers`} />
            </CardContent>
          </Card>
          )}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{student.notes?.trim() || "No notes recorded."}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic">
          <Card>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="CGPA" value={student.cgpa.toFixed(2)} />
              <Field label="English test" value={englishFromStudent(student).englishTest ?? "—"} />
              <Field
                label="English score"
                value={
                  englishFromStudent(student).englishScore != null
                    ? String(englishFromStudent(student).englishScore)
                    : "—"
                }
              />
              <Field label="German grade" value={student.germanGrade?.toFixed(1) ?? "—"} />
              <Field label="GRE" value={student.gre?.toString() ?? "—"} />
              <Field label="German language" value={student.germanLanguage} />
              <Field label="Branch" value={student.branch} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-table">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    {["University", "Course", "Status", "Submitted", "Offer", "Deadline"].map((h) => (
                      <th key={h} className="px-5 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {applications.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="px-5 py-2.5">{uniMap[a.universityId]?.name ?? a.universityId}</td>
                      <td className="px-5 py-2.5">{a.course}</td>
                      <td className="px-5 py-2.5">
                        <Select
                          value={a.status}
                          onValueChange={(v) => {
                            upsertApplication({ ...a, status: v as ApplicationStatus });
                            toast.success("Application status updated");
                          }}
                        >
                          <SelectTrigger className="h-8 w-[190px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {APPLICATION_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-5 py-2.5 text-muted-foreground">
                        {a.submittedAt ? formatShortDate(a.submittedAt) : "—"}
                      </td>
                      <td className="px-5 py-2.5">{a.offerReceived ? "Yes" : "—"}</td>
                      <td className="px-5 py-2.5 text-muted-foreground">{formatShortDate(a.deadline)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {applications.length === 0 && <EmptyState title="No applications yet" />}
            </CardContent>
          </Card>
        </TabsContent>

        {showPayments && (
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4" /> Payment summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Total fee" value={formatINR(student.totalFee)} />
                <Field label="Collected" value={formatINR(student.paidAmount)} />
                <Field label="Discount" value={formatINR(student.discount)} />
                <Field label="Remaining" value={formatINR(remaining)} />
              </div>
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span>{p.method ?? "Record"}</span>
                  <span className="text-muted-foreground">
                    {p.lastPayment ? relativeTime(p.lastPayment) : "No payment yet"}
                  </span>
                  <PaymentBadge status={p.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        )}

        <TabsContent value="documents">
          <DocumentWorkspace student={student} />
        </TabsContent>

        <TabsContent value="universities">
          <div className="grid gap-3 sm:grid-cols-2">
            {applications.map((a) => {
              const u = uniMap[a.universityId];
              if (!u) return null;
              return (
                <Card key={a.id} className="p-4">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {u.course} · {u.location}
                  </p>
                  <div className="mt-3">
                    <StatusBadge status={a.status} />
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <Card className="p-5">
            <Timeline events={timeline} />
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete student?"
        description={
          <p>
            This action cannot be undone.
            <br />
            <span className="mt-2 block font-medium text-foreground">
              {student.name}
              <br />
              <span className="font-mono text-xs">{student.id}</span>
            </span>
          </p>
        }
        confirmLabel="Delete student"
        onConfirm={() => {
          deleteStudent(student.id);
          toast.success("Student deleted");
          void navigate({ to: `${base}/students` });
        }}
      />

      {isGermany && student && (
        <QuickGermanyStatusDialog
          open={quickStatusOpen}
          onOpenChange={setQuickStatusOpen}
          student={student}
          canEditStatus={canEditStatus}
          onUpdateStatus={handleStatusUpdate}
          savingField={savingField}
          fieldErrors={fieldErrors}
        />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm font-medium">{value}</p>
    </div>
  );
}

function getGermanStatusBadgeVariant(
  value: string | undefined,
): "secondary" | "success" | "warning" | "danger" | "info" | "outline" {
  if (!value || value === "Not Applied" || value === "Not Required" || value === "—") {
    return "secondary";
  }
  switch (value) {
    case "Yes":
    case "Account Opened":
    case "Funds Deposited":
    case "Confirmation Received":
    case "Completed":
    case "Enrolled":
    case "Enrollment Certificate Received":
    case "Accommodation Confirmed":
    case "Contract Signed":
      return "success";
    case "Applied":
    case "In Progress":
    case "Documents Pending":
    case "Awaiting Confirmation":
    case "Searching":
    case "Waiting List":
    case "On Hold":
      return "warning";
    case "No":
    case "No Availability":
      return "danger";
    default:
      return "outline";
  }
}

function StatusBadgeField({
  label,
  value,
  options,
  onValueChange,
  disabled = false,
  saving = false,
  error,
}: {
  label: string;
  value?: string;
  options?: readonly string[];
  onValueChange?: (val: string) => void;
  disabled?: boolean;
  saving?: boolean;
  error?: string;
}) {
  const displayVal = value?.trim() || "Not Applied";
  const variant = getGermanStatusBadgeVariant(displayVal);
  const items = useMemo(() => {
    if (!options) return [];
    const list = [...options];
    if (displayVal && !list.includes(displayVal)) {
      list.push(displayVal);
    }
    return list;
  }, [options, displayVal]);

  const testId = `status-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="min-w-0 space-y-1.5" data-testid={testId}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Badge variant={variant} className="text-micro font-medium">
          {displayVal}
        </Badge>
      </div>
      {options && onValueChange ? (
        <div className="relative">
          <Select
            value={displayVal}
            onValueChange={onValueChange}
            disabled={disabled || saving}
          >
            <SelectTrigger
              aria-label={label}
              data-testid={`${testId}-trigger`}
              className={cn("h-9 w-full bg-background", saving && "opacity-75")}
            >
              <div className="flex items-center gap-2 truncate">
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />
                    <span className="text-xs text-muted-foreground">Saving status...</span>
                  </>
                ) : (
                  <SelectValue placeholder={displayVal}>{displayVal}</SelectValue>
                )}
              </div>
            </SelectTrigger>
            <SelectContent>
              {items.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
      ) : (
        <div className="mt-1">
          <Badge variant={variant}>{displayVal}</Badge>
        </div>
      )}
    </div>
  );
}

function QuickGermanyStatusDialog({
  open,
  onOpenChange,
  student,
  canEditStatus,
  onUpdateStatus,
  savingField,
  fieldErrors,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student;
  canEditStatus: boolean;
  onUpdateStatus: (
    field: "blockedAccount" | "enrollment" | "studentDorm",
    label: string,
    newValue: string,
  ) => void;
  savingField: string | null;
  fieldErrors: Record<string, string>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" />
            Germany-Specific Status
          </DialogTitle>
          <DialogDescription>
            Update German status requirements for {student.name} ({student.id}). Changes save immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <StatusBadgeField
            label="Blocked Account"
            value={student.blockedAccount}
            options={BLOCKED_ACCOUNT_OPTIONS}
            onValueChange={(v) => onUpdateStatus("blockedAccount", "Blocked Account", v)}
            disabled={!canEditStatus}
            saving={savingField === "blockedAccount"}
            error={fieldErrors["blockedAccount"]}
          />
          <StatusBadgeField
            label="Enrollment Status"
            value={student.enrollment}
            options={ENROLLMENT_STATUS_OPTIONS}
            onValueChange={(v) => onUpdateStatus("enrollment", "Enrollment Status", v)}
            disabled={!canEditStatus}
            saving={savingField === "enrollment"}
            error={fieldErrors["enrollment"]}
          />
          <StatusBadgeField
            label="Student Dorm Status"
            value={student.studentDorm}
            options={STUDENT_DORM_STATUS_OPTIONS}
            onValueChange={(v) => onUpdateStatus("studentDorm", "Student Dorm Status", v)}
            disabled={!canEditStatus}
            saving={savingField === "studentDorm"}
            error={fieldErrors["studentDorm"]}
          />
        </div>
        <DialogFooter className="sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

