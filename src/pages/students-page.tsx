import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Copy, Download, ExternalLink, MoreHorizontal, Plus, Trash2, Upload } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { FilterSelect } from "@/components/filter-select";
import { PaymentBadge, StatusBadge } from "@/components/status-badge";
import { PersonAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useAppStore } from "@/lib/store";
import { useEmployeeMap, useScopedIds } from "@/lib/scoped";
import { useWorkspace } from "@/lib/workspace";
import { useCanViewPayments } from "@/lib/access";
import { APPLICATION_STATUSES, COUNTRIES, INTAKES, type Student } from "@/lib/types";
import { relativeTime, toCsv, downloadText } from "@/lib/format";
import {
  DOCUMENT_RECEIPT_STATUSES,
  getStudentDocumentReceiptStatus,
  portalEffectiveStatus,
  portalUrl,
} from "@/lib/documents";
import { DocumentReceiptBadge } from "@/components/documents/document-receipt-badge";
import { toast } from "sonner";

export function StudentsPage() {
  const { students } = useScopedIds();
  const allDocuments = useAppStore((s) => s.documents);
  const employees = useAppStore((s) => s.employees);
  const deleteStudent = useAppStore((s) => s.deleteStudent);
  const appendAudit = useAppStore((s) => s.appendAudit);
  const portals = useAppStore((s) => s.portals);
  const empMap = useEmployeeMap();
  const showPayments = useCanViewPayments();
  const { base, role } = useWorkspace();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("all");
  const [intake, setIntake] = useState("all");
  const [employee, setEmployee] = useState("all");
  const [status, setStatus] = useState("all");
  const [docStatus, setDocStatus] = useState("all");
  const storeIntakes = useAppStore((s) => s.intakes);
  const intakeOptions = useMemo(() => {
    return Array.from(
      new Set([
        ...storeIntakes.filter((i) => i.status === "Active").map((i) => i.name),
        ...students.map((s) => s.intake),
        ...INTAKES,
      ]),
    ).filter(Boolean);
  }, [storeIntakes, students]);
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (country !== "all" && s.country !== country) return false;
      if (intake !== "all" && s.intake !== intake) return false;
      if (employee !== "all" && s.employeeId !== employee) return false;
      if (status !== "all" && s.status !== status) return false;
      if (docStatus !== "all") {
        const sDocs = allDocuments.filter((d) => d.studentId === s.id);
        const receipt = getStudentDocumentReceiptStatus(s, sDocs);
        if (receipt.status !== docStatus) return false;
      }
      if (q && !`${s.name} ${s.id} ${s.email}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [students, country, intake, employee, status, docStatus, q, allDocuments]);

  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Application ID",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.id}</span>,
      },
      {
        accessorKey: "name",
        header: "Student",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2">
            <PersonAvatar name={row.original.name} hue={row.original.avatarHue} className="size-7" />
            <span>
              <span className="block font-medium">{row.original.name}</span>
              <span className="text-micro text-muted-foreground">{row.original.email}</span>
            </span>
          </span>
        ),
      },
      { accessorKey: "country", header: "Country" },
      { accessorKey: "intake", header: "Intake" },
      {
        id: "employee",
        header: "Employee",
        cell: ({ row }) => empMap[row.original.employeeId]?.name ?? "—",
      },
      {
        accessorKey: "status",
        header: "Application status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "documentStatus",
        header: "Document Status",
        enableSorting: true,
        accessorFn: (row) => {
          const docs = allDocuments.filter((d) => d.studentId === row.id);
          return getStudentDocumentReceiptStatus(row, docs).status;
        },
        cell: ({ row }) => {
          const student = row.original;
          const docs = allDocuments.filter((d) => d.studentId === student.id);
          const receipt = getStudentDocumentReceiptStatus(student, docs);
          return (
            <div
              data-testid={`document-status-cell-${student.id}`}
              className="group/doc-status flex flex-col items-start gap-1 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                void navigate({ to: `${base}/students/${student.id}`, search: { tab: "documents" } });
              }}
              title="Click to view documents"
            >
              <DocumentReceiptBadge status={receipt.status} className="group-hover/doc-status:ring-2 transition-all" />
              {receipt.totalRequired > 0 && receipt.status !== "No Requirements Configured" ? (
                <span className="text-micro text-muted-foreground group-hover/doc-status:text-foreground">
                  {receipt.receivedRequired} / {receipt.totalRequired} documents
                </span>
              ) : (
                <span className="text-micro text-muted-foreground">0 required</span>
              )}
            </div>
          );
        },
      },
      ...(showPayments
        ? [
            {
              accessorKey: "paymentStatus",
              header: "Payment",
              cell: ({ row }: { row: { original: Student } }) => <PaymentBadge status={row.original.paymentStatus} />,
            } satisfies ColumnDef<Student>,
          ]
        : []),
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => <span className="text-muted-foreground">{relativeTime(row.original.updatedAt)}</span>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="size-8" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => void navigate({ to: `${base}/students/${row.original.id}` })}>
                View student
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  sessionStorage.setItem(`aa-upload-${row.original.id}`, "1");
                  void navigate({ to: `${base}/students/${row.original.id}` });
                }}
              >
                <Upload className="size-4" /> Upload document
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  sessionStorage.setItem(`aa-portal-${row.original.id}`, "1");
                  void navigate({ to: `${base}/students/${row.original.id}` });
                }}
              >
                <ExternalLink className="size-4" /> Open document portal
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const portal = portals.find(
                    (p) => p.studentId === row.original.id && portalEffectiveStatus(p) === "active",
                  );
                  if (!portal) {
                    toast.message("No active portal yet. Generate one from the student profile.");
                    sessionStorage.setItem(`aa-portal-${row.original.id}`, "1");
                    void navigate({ to: `${base}/students/${row.original.id}` });
                    return;
                  }
                  void navigator.clipboard.writeText(portalUrl(portal.token)).then(() => {
                    appendAudit({
                      action: "PORTAL_LINK_COPIED",
                      module: "Documents",
                      recordId: row.original.id,
                      details: "Copied student portal link",
                      severity: "INFO",
                    });
                    toast.success("Link copied");
                  });
                }}
              >
                <Copy className="size-4" /> Copy portal link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void navigate({ to: `${base}/students/${row.original.id}/edit` })}>
                Edit
              </DropdownMenuItem>
              {role === "admin" && (
                <DropdownMenuItem destructive onClick={() => setPendingDelete(row.original)}>
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [empMap, base, navigate, role, portals, appendAudit, showPayments, allDocuments],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Students"
        description="Manage registered students and applications."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                downloadText(
                  "students.csv",
                  toCsv(
                    filtered.map((s) => {
                      const sDocs = allDocuments.filter((d) => d.studentId === s.id);
                      const receipt = getStudentDocumentReceiptStatus(s, sDocs);
                      return {
                        id: s.id,
                        name: s.name,
                        country: s.country,
                        state: s.state ?? "",
                        district: s.district ?? "",
                        villageCity: s.villageCity ?? "",
                        intake: s.intake,
                        leadType: s.leadType,
                        b2bOrg: s.leadType === "B2B" ? (s.b2bOrg === "Other" ? (s.otherB2bOrg || "Other") : (s.b2bOrg || "")) : "",
                        status: s.status,
                        documentStatus: receipt.status,
                        documentCount: `${receipt.receivedRequired} / ${receipt.totalRequired}`,
                        ...(s.country === "Germany"
                          ? {
                              blockedAccount: s.blockedAccount ?? "Not Applied",
                              enrollmentStatus: s.enrollment ?? "Not Applied",
                              studentDormStatus: s.studentDorm ?? "Not Applied",
                            }
                          : {}),
                        ...(showPayments ? { payment: s.paymentStatus } : {}),
                        employee: empMap[s.employeeId]?.name,
                      };
                    }),
                  ),
                );
                appendAudit({
                  action: "EXPORT",
                  module: "Students",
                  recordId: "LIST",
                  details: `Exported ${filtered.length} students`,
                  severity: "INFO",
                });
                toast.success("Students exported");
              }}
            >
              <Download className="size-4" /> Export
            </Button>
            <Button onClick={() => void navigate({ to: `${base}/students/new` })}>
              <Plus className="size-4" /> Add student
            </Button>
          </>
        }
      />

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(s) => s.id}
        searchPlaceholder="Search students…"
        globalFilter={q}
        onGlobalFilterChange={setQ}
        manualFiltering
        selectable
        onRowClick={(s) => void navigate({ to: `${base}/students/${s.id}` })}
        emptyTitle="No students found"
        emptyDescription="Try changing your filters or search query."
        onClearFilters={() => {
          setQ("");
          setCountry("all");
          setIntake("all");
          setEmployee("all");
          setStatus("all");
          setDocStatus("all");
        }}
        pageSize={100}
        extraFilters={
          <>
            <FilterSelect
              value={country}
              onChange={setCountry}
              placeholder="Countries"
              allLabel="All countries"
              options={COUNTRIES}
            />
            <FilterSelect
              value={intake}
              onChange={setIntake}
              placeholder="Intakes"
              allLabel="All intakes"
              options={intakeOptions}
            />
            {role === "admin" && (
              <FilterSelect
                value={employee}
                onChange={setEmployee}
                placeholder="Employees"
                allLabel="All employees"
                options={employees.filter((e) => e.role === "employee").map((e) => ({ value: e.id, label: e.name }))}
              />
            )}
            <FilterSelect
              value={status}
              onChange={setStatus}
              placeholder="Statuses"
              allLabel="All statuses"
              options={APPLICATION_STATUSES}
            />
            <FilterSelect
              value={docStatus}
              onChange={setDocStatus}
              placeholder="Document Status"
              allLabel="All Document Statuses"
              options={DOCUMENT_RECEIPT_STATUSES}
            />
          </>
        }
        renderMobileCard={(s) => {
          const sDocs = allDocuments.filter((d) => d.studentId === s.id);
          const receipt = getStudentDocumentReceiptStatus(s, sDocs);
          return (
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-2">
                <PersonAvatar name={s.name} hue={s.avatarHue} />
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="font-mono text-micro text-muted-foreground">{s.id}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.country} · {s.intake}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <DocumentReceiptBadge status={receipt.status} />
                    <span className="text-micro text-muted-foreground">
                      {receipt.receivedRequired} / {receipt.totalRequired}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={s.status} />
                {role === "admin" && (
                  <Button
                    size="xs"
                    variant="outline"
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDelete(s);
                    }}
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </Button>
                )}
              </div>
            </div>
          );
        }}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(v) => !v && setPendingDelete(null)}
        title="Delete student?"
        description={
          pendingDelete ? (
            <p>
              This action cannot be undone.
              <br />
              <span className="mt-2 block font-medium text-foreground">
                {pendingDelete.name}
                <br />
                <span className="font-mono text-xs">{pendingDelete.id}</span>
              </span>
            </p>
          ) : null
        }
        confirmLabel="Delete student"
        onConfirm={() => {
          if (pendingDelete) {
            deleteStudent(pendingDelete.id);
            toast.success("Student deleted");
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
}
