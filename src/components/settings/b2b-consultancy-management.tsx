import { useMemo, useState } from "react";
import {
  Archive,
  Building,
  CheckCircle2,
  Edit2,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import type { B2BConsultancyRecord, B2BConsultancyStatus } from "@/lib/types";
import { toast } from "sonner";

export function B2BConsultancyManagement() {
  const consultancies = useAppStore((s) => s.b2bConsultancies);
  const students = useAppStore((s) => s.students);
  const addConsultancy = useAppStore((s) => s.addB2BConsultancy);
  const updateConsultancy = useAppStore((s) => s.updateB2BConsultancy);
  const deleteConsultancy = useAppStore((s) => s.deleteB2BConsultancy);
  const archiveConsultancy = useAppStore((s) => s.archiveB2BConsultancy);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<B2BConsultancyRecord | null>(null);
  const [deleteItem, setDeleteItem] = useState<B2BConsultancyRecord | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formContactPerson, setFormContactPerson] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formStatus, setFormStatus] = useState<B2BConsultancyStatus>("Active");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");

  const filtered = useMemo(() => {
    return consultancies.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (
        search.trim() &&
        !item.name.toLowerCase().includes(search.toLowerCase()) &&
        !item.contactPerson?.toLowerCase().includes(search.toLowerCase()) &&
        !item.email?.toLowerCase().includes(search.toLowerCase()) &&
        !item.phone?.includes(search)
      ) {
        return false;
      }
      return true;
    });
  }, [consultancies, search, statusFilter]);

  const activeCount = consultancies.filter((c) => c.status === "Active").length;
  const inactiveCount = consultancies.filter((c) => c.status === "Inactive").length;
  const archivedCount = consultancies.filter((c) => c.status === "Archived").length;

  function openAddModal() {
    setFormName("");
    setFormContactPerson("");
    setFormEmail("");
    setFormPhone("");
    setFormStatus("Active");
    setFormNotes("");
    setFormError("");
    setAddOpen(true);
  }

  function openEditModal(item: B2BConsultancyRecord) {
    setEditItem(item);
    setFormName(item.name);
    setFormContactPerson(item.contactPerson ?? "");
    setFormEmail(item.email ?? "");
    setFormPhone(item.phone ?? "");
    setFormStatus(item.status);
    setFormNotes(item.notes ?? "");
    setFormError("");
  }

  function handleAddSubmit() {
    if (!formName.trim()) {
      setFormError("Consultancy name is required.");
      return;
    }

    const res = addConsultancy({
      name: formName.trim(),
      contactPerson: formContactPerson.trim() || undefined,
      email: formEmail.trim() || undefined,
      phone: formPhone.trim() || undefined,
      status: formStatus,
      notes: formNotes.trim() || undefined,
    });

    if (!res.ok) {
      setFormError(res.error || "Failed to add consultancy");
      return;
    }

    toast.success(`B2B Consultancy "${formName.trim()}" added successfully.`);
    setAddOpen(false);
  }

  function handleEditSubmit() {
    if (!editItem) return;
    if (!formName.trim()) {
      setFormError("Consultancy name is required.");
      return;
    }

    const res = updateConsultancy(editItem.id, {
      name: formName.trim(),
      contactPerson: formContactPerson.trim() || undefined,
      email: formEmail.trim() || undefined,
      phone: formPhone.trim() || undefined,
      status: formStatus,
      notes: formNotes.trim() || undefined,
    });

    if (!res.ok) {
      setFormError(res.error || "Failed to update consultancy");
      return;
    }

    toast.success(`B2B Consultancy "${formName.trim()}" updated successfully.`);
    setEditItem(null);
  }

  function handleDeleteConfirm() {
    if (!deleteItem) return;
    const res = deleteConsultancy(deleteItem.id);
    if (!res.ok) {
      toast.error(res.error || "Cannot delete consultancy.");
    } else {
      toast.success(`Consultancy "${deleteItem.name}" deleted.`);
    }
    setDeleteItem(null);
  }

  return (
    <div className="space-y-5" data-testid="b2b-management-view">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">B2B Consultancy Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage partner educational consultancies. Active agencies are selectable in student applications under Lead Type = B2B.
          </p>
        </div>
        <Button onClick={openAddModal} className="gap-1.5 shrink-0 self-start sm:self-center" data-testid="add-consultancy-button">
          <Plus className="size-4" /> Add Consultancy
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Total Consultancies</p>
          <p className="mt-1 text-2xl font-bold">{consultancies.length}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <p className="text-xs font-medium text-muted-foreground">Active Partners</p>
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
              placeholder="Search by consultancy, contact, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="b2b-search-input"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-[150px]">
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

            {(search || statusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                Reset filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Consultancies Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-table" data-testid="b2b-table">
            <thead className="bg-muted/40 text-left text-muted-foreground border-b">
              <tr>
                <th className="px-5 py-3 font-semibold">Consultancy Name</th>
                <th className="px-5 py-3 font-semibold">Contact Person</th>
                <th className="px-5 py-3 font-semibold">Contact Info</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Referred Students</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                    No consultancies found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const studentCount = students.filter(
                    (s) => s.leadType === "B2B" && s.b2bOrg === item.name
                  ).length;
                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors" data-testid={`b2b-row-${item.id}`}>
                      <td className="px-5 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <Building className="size-4 text-muted-foreground shrink-0" />
                          <div>
                            <span className="font-semibold block">{item.name}</span>
                            {item.notes && (
                              <span className="text-micro text-muted-foreground line-clamp-1">
                                {item.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm">
                        {item.contactPerson ? (
                          <span className="inline-flex items-center gap-1.5">
                            <User className="size-3.5 text-muted-foreground" />
                            {item.contactPerson}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm">
                        <div className="space-y-0.5">
                          {item.email && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Mail className="size-3" />
                              <a href={`mailto:${item.email}`} className="hover:underline">
                                {item.email}
                              </a>
                            </div>
                          )}
                          {item.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                              <Phone className="size-3" />
                              <span>{item.phone}</span>
                            </div>
                          )}
                          {!item.email && !item.phone && <span className="text-muted-foreground">—</span>}
                        </div>
                      </td>
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
                                updateConsultancy(item.id, { status: "Inactive" });
                                toast.success(`Consultancy "${item.name}" set to inactive.`);
                              }}
                              title="Deactivate consultancy"
                            >
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-emerald-600 hover:text-emerald-700"
                              onClick={() => {
                                updateConsultancy(item.id, { status: "Active" });
                                toast.success(`Consultancy "${item.name}" activated.`);
                              }}
                              title="Activate consultancy"
                            >
                              Activate
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => openEditModal(item)}
                            title="Edit consultancy"
                            data-testid={`edit-b2b-${item.id}`}
                          >
                            <Edit2 className="size-3.5" />
                          </Button>

                          {item.status !== "Archived" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                archiveConsultancy(item.id);
                                toast.success(`Consultancy "${item.name}" archived.`);
                              }}
                              title="Archive consultancy"
                            >
                              <Archive className="size-3.5" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteItem(item)}
                            title="Delete consultancy"
                            data-testid={`delete-b2b-${item.id}`}
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

      {/* Add Consultancy Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add B2B Consultancy</DialogTitle>
            <DialogDescription>
              Register an authorized educational consultancy partner. Active consultancies appear in student onboarding.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {formError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                {formError}
              </div>
            )}

            <label className="grid gap-1.5 text-sm font-medium">
              Consultancy Name *
              <Input
                placeholder="e.g. Apex Global Overseas"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  setFormError("");
                }}
                data-testid="b2b-name-input"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-sm font-medium">
                Contact Person
                <Input
                  placeholder="e.g. Rajesh Kumar"
                  value={formContactPerson}
                  onChange={(e) => setFormContactPerson(e.target.value)}
                  data-testid="b2b-contact-input"
                />
              </label>

              <label className="grid gap-1.5 text-sm font-medium">
                Contact Phone
                <Input
                  placeholder="10-digit phone"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  data-testid="b2b-phone-input"
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-medium">
              Contact Email
              <Input
                type="email"
                placeholder="contact@consultancy.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                data-testid="b2b-email-input"
              />
            </label>

            <label className="grid gap-1.5 text-sm font-medium">
              Status
              <Select value={formStatus} onValueChange={(v) => setFormStatus(v as B2BConsultancyStatus)}>
                <SelectTrigger data-testid="b2b-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active (Selectable for B2B leads)</SelectItem>
                  <SelectItem value="Inactive">Inactive (Temporarily paused)</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label className="grid gap-1.5 text-sm font-medium">
              Internal Notes
              <Textarea
                placeholder="Optional notes regarding commission agreement or recruitment regions..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
                data-testid="b2b-notes-input"
              />
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSubmit} data-testid="submit-add-b2b-button">
              Save Consultancy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Consultancy Modal */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit B2B Consultancy</DialogTitle>
            <DialogDescription>
              Update partner contact details, commission notes, or active status.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {formError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                {formError}
              </div>
            )}

            <label className="grid gap-1.5 text-sm font-medium">
              Consultancy Name *
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
                Contact Person
                <Input
                  value={formContactPerson}
                  onChange={(e) => setFormContactPerson(e.target.value)}
                />
              </label>

              <label className="grid gap-1.5 text-sm font-medium">
                Contact Phone
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-medium">
              Contact Email
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </label>

            <label className="grid gap-1.5 text-sm font-medium">
              Status
              <Select value={formStatus} onValueChange={(v) => setFormStatus(v as B2BConsultancyStatus)}>
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

            <label className="grid gap-1.5 text-sm font-medium">
              Internal Notes
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
              />
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} data-testid="submit-edit-b2b-button">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        title="Delete B2B Consultancy?"
        description={`Are you sure you want to delete "${deleteItem?.name}"? If students are linked to this consultancy, please archive it instead of deleting.`}
        confirmLabel="Delete Consultancy"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
