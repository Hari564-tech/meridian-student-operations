import { useMemo, useState } from "react";
import {
  Archive,
  Calendar,
  CheckCircle2,
  Edit2,
  Filter,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useAppStore } from "@/lib/store";
import { formatShortDate } from "@/lib/format";
import type { IntakeRecord, IntakeStatus, IntakeType } from "@/lib/types";
import { toast } from "sonner";

export function IntakeManagement() {
  const intakes = useAppStore((s) => s.intakes);
  const students = useAppStore((s) => s.students);
  const addIntake = useAppStore((s) => s.addIntake);
  const updateIntake = useAppStore((s) => s.updateIntake);
  const deleteIntake = useAppStore((s) => s.deleteIntake);
  const archiveIntake = useAppStore((s) => s.archiveIntake);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<IntakeRecord | null>(null);
  const [deleteItem, setDeleteItem] = useState<IntakeRecord | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<IntakeType>("Monthly");
  const [formYear, setFormYear] = useState<number>(new Date().getFullYear());
  const [formStatus, setFormStatus] = useState<IntakeStatus>("Active");
  const [formError, setFormError] = useState("");

  const filtered = useMemo(() => {
    return intakes.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (
        search.trim() &&
        !item.name.toLowerCase().includes(search.toLowerCase()) &&
        !String(item.year).includes(search)
      ) {
        return false;
      }
      return true;
    });
  }, [intakes, search, typeFilter, statusFilter]);

  const activeCount = intakes.filter((i) => i.status === "Active").length;
  const inactiveCount = intakes.filter((i) => i.status === "Inactive").length;
  const archivedCount = intakes.filter((i) => i.status === "Archived").length;

  function openAddModal() {
    setFormName("");
    setFormType("Monthly");
    setFormYear(new Date().getFullYear() + 1);
    setFormStatus("Active");
    setFormError("");
    setAddOpen(true);
  }

  function openEditModal(item: IntakeRecord) {
    setEditItem(item);
    setFormName(item.name);
    setFormType(item.type);
    setFormYear(item.year);
    setFormStatus(item.status);
    setFormError("");
  }

  function handleAddSubmit() {
    if (!formName.trim()) {
      setFormError("Intake name is required.");
      return;
    }
    if (!formYear || formYear < 2000 || formYear > 2100) {
      setFormError("Please enter a valid four-digit year (e.g. 2027).");
      return;
    }

    const res = addIntake({
      name: formName.trim(),
      type: formType,
      year: Number(formYear),
      status: formStatus,
    });

    if (!res.ok) {
      setFormError(res.error || "Failed to add intake");
      return;
    }

    toast.success(`Intake "${formName.trim()}" added successfully.`);
    setAddOpen(false);
  }

  function handleEditSubmit() {
    if (!editItem) return;
    if (!formName.trim()) {
      setFormError("Intake name is required.");
      return;
    }
    if (!formYear || formYear < 2000 || formYear > 2100) {
      setFormError("Please enter a valid four-digit year.");
      return;
    }

    const res = updateIntake(editItem.id, {
      name: formName.trim(),
      type: formType,
      year: Number(formYear),
      status: formStatus,
    });

    if (!res.ok) {
      setFormError(res.error || "Failed to update intake");
      return;
    }

    toast.success(`Intake "${formName.trim()}" updated successfully.`);
    setEditItem(null);
  }

  function handleDeleteConfirm() {
    if (!deleteItem) return;
    const res = deleteIntake(deleteItem.id);
    if (!res.ok) {
      toast.error(res.error || "Cannot delete intake.");
    } else {
      toast.success(`Intake "${deleteItem.name}" deleted.`);
    }
    setDeleteItem(null);
  }

  return (
    <div className="space-y-5" data-testid="intake-management-view">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Intake Management</h2>
          <p className="text-sm text-muted-foreground">
            Configure, activate, and archive admission intakes available across student registration and reports.
          </p>
        </div>
        <Button onClick={openAddModal} className="gap-1.5 shrink-0 self-start sm:self-center" data-testid="add-intake-button">
          <Plus className="size-4" /> Add Intake
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Total Intakes</p>
          <p className="mt-1 text-2xl font-bold">{intakes.length}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <p className="text-xs font-medium text-muted-foreground">Active</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <p className="text-xs font-medium text-muted-foreground">Inactive</p>
          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{inactiveCount}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-slate-400">
          <p className="text-xs font-medium text-muted-foreground">Archived</p>
          <p className="mt-1 text-2xl font-bold text-muted-foreground">{archivedCount}</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by intake name or year..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="intake-search-input"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-[140px]">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Intake Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Seasonal">Seasonal</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-[140px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(search || typeFilter !== "all" || statusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("all");
                  setStatusFilter("all");
                }}
              >
                Reset filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Intakes Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-table" data-testid="intake-table">
            <thead className="bg-muted/40 text-left text-muted-foreground border-b">
              <tr>
                <th className="px-5 py-3 font-semibold">Intake Name</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Year</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Assigned Students</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                    No intake records found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const studentCount = students.filter((s) => s.intake === item.name).length;
                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors" data-testid={`intake-row-${item.id}`}>
                      <td className="px-5 py-3 font-medium flex items-center gap-2">
                        <Calendar className="size-4 text-muted-foreground" />
                        <span>{item.name}</span>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className="text-micro font-normal">
                          {item.type}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 font-mono text-sm">{item.year}</td>
                      <td className="px-5 py-3">
                        {item.status === "Active" ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 ring-1 ring-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <CheckCircle2 className="size-3 mr-1" /> Active
                          </Badge>
                        ) : item.status === "Inactive" ? (
                          <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 ring-1 ring-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300">
                            <XCircle className="size-3 mr-1" /> Inactive
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-muted-foreground">
                            <Archive className="size-3 mr-1" /> Archived
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">
                        {studentCount} student{studentCount === 1 ? "" : "s"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status === "Active" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-amber-600 hover:text-amber-700"
                              onClick={() => {
                                updateIntake(item.id, { status: "Inactive" });
                                toast.success(`Intake "${item.name}" deactivated.`);
                              }}
                              title="Deactivate intake"
                            >
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-emerald-600 hover:text-emerald-700"
                              onClick={() => {
                                updateIntake(item.id, { status: "Active" });
                                toast.success(`Intake "${item.name}" activated.`);
                              }}
                              title="Activate intake"
                            >
                              Activate
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => openEditModal(item)}
                            title="Edit intake"
                            data-testid={`edit-intake-${item.id}`}
                          >
                            <Edit2 className="size-3.5" />
                          </Button>

                          {item.status !== "Archived" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                archiveIntake(item.id);
                                toast.success(`Intake "${item.name}" archived.`);
                              }}
                              title="Archive intake"
                            >
                              <Archive className="size-3.5" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteItem(item)}
                            title="Delete intake"
                            data-testid={`delete-intake-${item.id}`}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Intake Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Intake</DialogTitle>
            <DialogDescription>
              Create a new admission intake record. Active intakes will immediately become available in student registration.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {formError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                {formError}
              </div>
            )}

            <label className="grid gap-1.5 text-sm font-medium">
              Intake Name *
              <Input
                placeholder="e.g. January 2028 or Summer 2028"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  setFormError("");
                }}
                data-testid="intake-name-input"
              />
              <span className="text-micro text-muted-foreground">
                Examples: January 2027, Summer 2027, Winter 2027.
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-sm font-medium">
                Intake Type
                <Select value={formType} onValueChange={(v) => setFormType(v as IntakeType)}>
                  <SelectTrigger data-testid="intake-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Seasonal">Seasonal</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="grid gap-1.5 text-sm font-medium">
                Intake Year *
                <Input
                  type="number"
                  min={2020}
                  max={2035}
                  value={formYear}
                  onChange={(e) => {
                    setFormYear(Number(e.target.value));
                    setFormError("");
                  }}
                  data-testid="intake-year-input"
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-medium">
              Status
              <Select value={formStatus} onValueChange={(v) => setFormStatus(v as IntakeStatus)}>
                <SelectTrigger data-testid="intake-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active (Selectable for new students)</SelectItem>
                  <SelectItem value="Inactive">Inactive (Hidden from new selection)</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSubmit} data-testid="submit-add-intake-button">
              Save Intake
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Intake Modal */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Intake</DialogTitle>
            <DialogDescription>
              Modify intake name, type, year, or active status. Existing student assignments remain intact.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {formError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                {formError}
              </div>
            )}

            <label className="grid gap-1.5 text-sm font-medium">
              Intake Name *
              <Input
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  setFormError("");
                }}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-sm font-medium">
                Intake Type
                <Select value={formType} onValueChange={(v) => setFormType(v as IntakeType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Seasonal">Seasonal</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="grid gap-1.5 text-sm font-medium">
                Intake Year *
                <Input
                  type="number"
                  min={2020}
                  max={2035}
                  value={formYear}
                  onChange={(e) => {
                    setFormYear(Number(e.target.value));
                    setFormError("");
                  }}
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-medium">
              Status
              <Select value={formStatus} onValueChange={(v) => setFormStatus(v as IntakeStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} data-testid="submit-edit-intake-button">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        title="Delete Intake Record?"
        description={`Are you sure you want to delete intake "${deleteItem?.name}"? If students are assigned to this intake, please archive it instead of deleting.`}
        confirmLabel="Delete Intake"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
