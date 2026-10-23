import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { FilterSelect } from "@/components/filter-select";
import { StatCard } from "@/components/stat-card";
import { useAppStore } from "@/lib/store";
import { useEmployeeMap, useScopedIds, useStudentMap, useUniversityMap } from "@/lib/scoped";
import { useWorkspace } from "@/lib/workspace";
import { formatShortDate } from "@/lib/format";
import { APPLICATION_STATUSES, type Application, type ApplicationStatus } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function ApplicationsPage() {
  const { applications } = useScopedIds();
  const students = useStudentMap();
  const unis = useUniversityMap();
  const empMap = useEmployeeMap();
  const upsertApplication = useAppStore((s) => s.upsertApplication);
  const { base } = useWorkspace();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(
    () => applications.filter((a) => status === "all" || a.status === status),
    [applications, status],
  );

  const stats = useMemo(
    () => ({
      total: applications.length,
      submitted: applications.filter((a) => a.status === "Submitted" || !!a.submittedAt).length,
      cancelled: applications.filter((a) => a.status === "Cancelled").length,
      notPossible: applications.filter((a) => a.status === "Not possible").length,
      nibs: applications.filter((a) => a.status === "NIBS").length,
      offers: applications.filter((a) => a.offerReceived || a.status === "Offered" || a.status === "Got Visa").length,
    }),
    [applications],
  );

  const columns = useMemo<ColumnDef<Application>[]>(
    () => [
      {
        id: "student",
        header: "Student",
        cell: ({ row }) => students[row.original.studentId]?.name ?? row.original.studentId,
      },
      {
        id: "university",
        header: "University",
        cell: ({ row }) => unis[row.original.universityId]?.name ?? row.original.universityId,
      },
      { accessorKey: "course", header: "Course" },
      { accessorKey: "country", header: "Country" },
      {
        accessorKey: "status",
        header: "Application status",
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <Select
              value={row.original.status}
              onValueChange={(v) => {
                upsertApplication({ ...row.original, status: v as ApplicationStatus });
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
          </div>
        ),
      },
      {
        accessorKey: "submittedAt",
        header: "Submitted",
        cell: ({ row }) => (row.original.submittedAt ? formatShortDate(row.original.submittedAt) : "—"),
      },
      { id: "offer", header: "Offer", cell: ({ row }) => (row.original.offerReceived ? "Yes" : "—") },
      {
        accessorKey: "deadline",
        header: "Deadline",
        cell: ({ row }) => formatShortDate(row.original.deadline),
      },
      { id: "emp", header: "Employee", cell: ({ row }) => empMap[row.original.employeeId]?.name ?? "—" },
    ],
    [students, unis, empMap, upsertApplication],
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Applications" description="Track every university application in flight." />
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Submitted" value={stats.submitted} />
        <StatCard label="Cancelled" value={stats.cancelled} />
        <StatCard label="Not possible" value={stats.notPossible} />
        <StatCard label="NIBS" value={stats.nibs} />
        <StatCard label="Offers" value={stats.offers} />
      </div>
      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(a) => a.id}
        searchPlaceholder="Search applications…"
        globalFilter={q}
        onGlobalFilterChange={setQ}
        onRowClick={(a) => void navigate({ to: `${base}/students/${a.studentId}` })}
        emptyTitle="No applications found"
        onClearFilters={() => {
          setQ("");
          setStatus("all");
        }}
        extraFilters={
          <FilterSelect
            value={status}
            onChange={setStatus}
            placeholder="Status"
            allLabel="All statuses"
            options={APPLICATION_STATUSES}
          />
        }
        renderMobileCard={(a) => (
          <div>
            <p className="font-medium">{students[a.studentId]?.name}</p>
            <p className="text-xs text-muted-foreground">{unis[a.universityId]?.name}</p>
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <Select
                value={a.status}
                onValueChange={(v) => {
                  upsertApplication({ ...a, status: v as ApplicationStatus });
                  toast.success("Application status updated");
                }}
              >
                <SelectTrigger className="h-8 w-full">
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
            </div>
          </div>
        )}
      />
    </div>
  );
}
