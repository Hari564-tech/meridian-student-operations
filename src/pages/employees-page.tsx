import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { FormField } from "@/components/form-field";
import { PersonAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import { relativeTime } from "@/lib/format";
import { canViewPayments } from "@/lib/access";
import type { User } from "@/lib/types";
import { toast } from "sonner";

const EMPTY = { name: "", email: "", phone: "", title: "Counselor", department: "Operations", password: "" };

export function EmployeesPage() {
  const employees = useAppStore((s) => s.employees);
  const students = useAppStore((s) => s.students);
  const applications = useAppStore((s) => s.applications);
  const currentUser = useAppStore((s) => s.currentUser);
  const createEmployee = useAppStore((s) => s.createEmployee);
  const updateEmployee = useAppStore((s) => s.updateEmployee);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  const staff = employees.filter((e) => e.role === "employee");
  const stats = {
    total: staff.length,
    active: staff.filter((e) => e.status === "Active").length,
    inactive: staff.filter((e) => e.status === "Inactive").length,
    newThis: staff.filter((e) => Date.now() - new Date(e.joinedAt).getTime() < 30 * 86400000).length,
  };

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Employee",
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
      { accessorKey: "title", header: "Role" },
      {
        id: "students",
        header: "Students",
        cell: ({ row }) => students.filter((s) => s.employeeId === row.original.id).length,
      },
      {
        id: "apps",
        header: "Applications",
        cell: ({ row }) => applications.filter((a) => a.employeeId === row.original.id).length,
      },
      {
        id: "offers",
        header: "Offers",
        cell: ({ row }) =>
          students.filter(
            (s) => s.employeeId === row.original.id && (s.status === "Offered" || s.status === "Got Visa"),
          ).length,
      },
      {
        id: "visa",
        header: "Visa",
        cell: ({ row }) =>
          students.filter((s) => s.employeeId === row.original.id && s.status === "Got Visa").length,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.status === "Active" ? "success" : "secondary"}>{row.original.status}</Badge>
        ),
      },
      {
        id: "payments",
        header: "Payments",
        cell: ({ row }) => (
          <Badge variant={row.original.canViewPayments ? "success" : "secondary"}>
            {row.original.canViewPayments ? "Allowed" : "Hidden"}
          </Badge>
        ),
      },
      {
        accessorKey: "lastActive",
        header: "Last active",
        cell: ({ row }) => relativeTime(row.original.lastActive),
      },
    ],
    [students, applications],
  );

  function patch(partial: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...partial }));
    setError("");
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (currentUser?.role !== "admin") {
      setError("Only an administrator can add employees.");
      return;
    }
    const result = createEmployee(form);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success(`${result.employee.name} can sign in`);
    setOpen(false);
    setForm(EMPTY);
    void navigate({ to: `/admin/employees/${result.employee.id}` });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Employees"
        description="Directory, assignments and performance."
        actions={
          <Button
            onClick={() => {
              setForm(EMPTY);
              setError("");
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> Add employee
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Total employees" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Inactive" value={stats.inactive} />
        <StatCard label="New this month" value={stats.newThis} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Payment section access</CardTitle>
          <CardDescription>
            Only an administrator can choose who sees Payments. Selected employees can open that section. Everyone
            else will not see it in their menu, and opening it directly is blocked.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {staff.length === 0 && <p className="text-sm text-muted-foreground">Add an employee to grant access.</p>}
          {staff.map((employee) => (
            <div
              key={employee.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <PersonAvatar name={employee.name} hue={employee.avatarHue} className="size-8" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{employee.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {employee.title} · {employee.email}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {canViewPayments(employee) ? "Can view" : "No access"}
                <Switch
                  checked={employee.canViewPayments === true}
                  disabled={currentUser?.role !== "admin"}
                  onCheckedChange={(allowed) => {
                    if (currentUser?.role !== "admin") return;
                    updateEmployee(employee.id, { canViewPayments: allowed });
                    toast.success(
                      allowed
                        ? `${employee.name} can now open Payments`
                        : `${employee.name} can no longer open Payments`,
                    );
                  }}
                  aria-label={`Payments access for ${employee.name}`}
                />
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
      <DataTable
        data={staff}
        columns={columns}
        getRowId={(e) => e.id}
        searchPlaceholder="Search employees…"
        onRowClick={(e) => void navigate({ to: `/admin/employees/${e.id}` })}
        emptyTitle="No employees found"
        renderMobileCard={(e) => (
          <div className="flex items-center gap-2">
            <PersonAvatar name={e.name} hue={e.avatarHue} />
            <div>
              <p className="font-medium">{e.name}</p>
              <p className="text-xs text-muted-foreground">{e.title}</p>
            </div>
          </div>
        )}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New employee</DialogTitle>
            <DialogDescription>
              Creates an active counselor account. They sign in with the email and password you set here.
            </DialogDescription>
          </DialogHeader>
          <form id="new-employee" onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <FormField label="Name" required className="sm:col-span-2">
              <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Full name" />
            </FormField>
            <FormField label="Email" required className="sm:col-span-2">
              <Input
                type="email"
                autoComplete="off"
                value={form.email}
                onChange={(e) => patch({ email: e.target.value })}
                placeholder="name@meridian.edu"
              />
            </FormField>
            <FormField label="Password" required>
              <Input
                type="text"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => patch({ password: e.target.value })}
                placeholder="At least 4 characters"
              />
            </FormField>
            <FormField label="Phone">
              <Input value={form.phone} onChange={(e) => patch({ phone: e.target.value })} placeholder="Optional" />
            </FormField>
            <FormField label="Title">
              <Input value={form.title} onChange={(e) => patch({ title: e.target.value })} />
            </FormField>
            <FormField label="Department">
              <Input value={form.department} onChange={(e) => patch({ department: e.target.value })} />
            </FormField>
            {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="new-employee">
              Create employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
