import { useEffect, useMemo, useState } from "react";
import { Archive, FilePlus2, Link2, Upload } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/empty-state";
import { DocumentChecklist } from "@/components/documents/document-checklist";
import { DocumentUpload } from "@/components/documents/document-upload";
import { DocumentDetailsDrawer } from "@/components/documents/document-details-drawer";
import { DocumentRequestModal } from "@/components/documents/document-request-modal";
import { PortalShareDrawer } from "@/components/documents/portal-share-drawer";
import { PortalLink } from "@/components/documents/portal-link";
import { DocumentArchiveDialog } from "@/components/documents/document-archive-dialog";
import { DocumentReceiptStatusCard } from "@/components/documents/document-receipt-card";
import { documentStats, portalEffectiveStatus, DOCUMENT_TYPE_CATALOG } from "@/lib/documents";
import { useAppStore } from "@/lib/store";
import type { Student, StudentDocument } from "@/lib/types";

export function DocumentWorkspace({
  student,
  compactHeader = false,
  showPortalBanner = true,
  onCreatePortal,
}: {
  student: Student;
  compactHeader?: boolean;
  showPortalBanner?: boolean;
  onCreatePortal?: () => void;
}) {
  const allDocuments = useAppStore((s) => s.documents);
  const portals = useAppStore((s) => s.portals);
  const seed = useAppStore((s) => s.seedStudentDocuments);
  const documents = useMemo(
    () => allDocuments.filter((d) => d.studentId === student.id),
    [allDocuments, student.id],
  );
  const [uploadOpen, setUploadOpen] = useState(false);
  const [presetType, setPresetType] = useState<string>();
  const [replaceOf, setReplaceOf] = useState<StudentDocument>();
  const [active, setActive] = useState<StudentDocument | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const uploadFlag = sessionStorage.getItem(`aa-upload-${student.id}`);
    const portalFlag = sessionStorage.getItem(`aa-portal-${student.id}`);
    if (uploadFlag) {
      sessionStorage.removeItem(`aa-upload-${student.id}`);
      seed(student.id);
      setUploadOpen(true);
    }
    if (portalFlag) {
      sessionStorage.removeItem(`aa-portal-${student.id}`);
      seed(student.id);
      setPortalOpen(true);
    }
  }, [student.id, seed]);

  const stats = useMemo(() => documentStats(documents), [documents]);
  const portal =
    portals.find((p) => p.studentId === student.id && portalEffectiveStatus(p) === "active") ??
    portals.find((p) => p.studentId === student.id);

  function openPortal() {
    if (onCreatePortal) {
      onCreatePortal();
      return;
    }
    setPortalOpen(true);
  }

  if (documents.length === 0) {
    return (
      <div className="space-y-5">
        {!compactHeader && (
          <PageHeader
            title="Documents"
            description="Upload, manage and collect documents for this student."
            actions={
              <div className="flex flex-wrap gap-2">
                <Button onClick={openPortal}>
                  <Link2 className="size-4" /> Generate student upload link
                </Button>
                <Button variant="outline" onClick={() => setArchiveOpen(true)}>
                  <Archive className="size-4" /> Download All Documents (.ZIP)
                </Button>
              </div>
            }
          />
        )}
        <DocumentReceiptStatusCard student={student} documents={documents} />
        <EmptyState
          icon={Upload}
          title="No documents uploaded yet."
          description="Upload a document or create a student upload portal."
          actionLabel="Upload document"
          onAction={() => {
            seed(student.id);
            setUploadOpen(true);
          }}
        />
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              seed(student.id);
              openPortal();
            }}
          >
            Generate portal
          </Button>
          <Button variant="outline" onClick={() => setArchiveOpen(true)}>
            <Archive className="size-4" /> Download All Documents (.ZIP)
          </Button>
        </div>
        <DocumentUpload open={uploadOpen} onOpenChange={setUploadOpen} student={student} />
        <PortalShareDrawer open={portalOpen} onOpenChange={setPortalOpen} student={student} />
        <DocumentArchiveDialog
          open={archiveOpen}
          onOpenChange={setArchiveOpen}
          student={student}
          documents={documents}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {compactHeader ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Documents</h2>
            <p className="text-sm text-muted-foreground">Upload, manage and collect documents for this student.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setRequestOpen(true)}>
              <FilePlus2 className="size-4" /> Request document
            </Button>
            <Button size="sm" onClick={openPortal}>
              <Link2 className="size-4" /> Generate student upload link
            </Button>
            <Button variant="outline" size="sm" onClick={() => setArchiveOpen(true)}>
              <Archive className="size-4" /> Download All Documents (.ZIP)
            </Button>
          </div>
        </div>
      ) : (
        <PageHeader
          title="Documents"
          description="Upload, manage and collect documents for this student."
          actions={
            <>
              <Button variant="outline" onClick={() => setRequestOpen(true)}>
                <FilePlus2 className="size-4" /> Request document
              </Button>
              <Button onClick={openPortal}>
                <Link2 className="size-4" /> Generate student upload link
              </Button>
              <Button variant="outline" onClick={() => setArchiveOpen(true)}>
                <Archive className="size-4" /> Download All Documents (.ZIP)
              </Button>
            </>
          }
        />
      )}

      <DocumentReceiptStatusCard student={student} documents={documents} />

      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Documents</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {stats.complete} / {stats.requiredTotal} complete
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{stats.remaining} documents remaining</p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="text-success">✓ {stats.verified} Verified</span>
            <span className="text-info">◷ {stats.underReview} Under Review</span>
            <span className="text-muted-foreground">! {stats.pending} Pending</span>
          </div>
        </div>
        <Progress value={stats.percent} className="mt-4 h-2" />
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Total Documents" value={stats.total} />
        <Stat label="Uploaded" value={stats.uploaded} />
        <Stat label="Pending" value={stats.pending} />
        <Stat label="Under Review" value={stats.underReview} />
        <Stat label="Verified" value={stats.verified} />
      </div>

      {showPortalBanner && (
        <Card className="grid gap-3 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Student upload link</p>
              {portal ? (
                <p className="text-micro capitalize text-muted-foreground">
                  <span
                    className={`mr-1.5 inline-block size-1.5 rounded-full ${
                      portalEffectiveStatus(portal) === "active" ? "bg-success" : "bg-destructive"
                    }`}
                  />
                  {portalEffectiveStatus(portal) === "active" ? "Active" : portalEffectiveStatus(portal)}
                  {portal.expiresAt ? "" : " · no expiry"}
                </p>
              ) : (
                <p className="text-micro text-muted-foreground">No link generated yet.</p>
              )}
            </div>
            {!(portal && portalEffectiveStatus(portal) === "active") && (
              <Button size="sm" onClick={openPortal}>
                <Link2 className="size-4" /> Generate upload link
              </Button>
            )}
          </div>
          {portal && portalEffectiveStatus(portal) === "active" ? (
            <PortalLink token={portal.token} studentId={student.id} />
          ) : null}
        </Card>
      )}

      <DocumentChecklist
        documents={documents}
        onAdd={(category) => {
          const match = DOCUMENT_TYPE_CATALOG.find((d) => d.category === category);
          setPresetType(match?.type);
          setReplaceOf(undefined);
          setUploadOpen(true);
        }}
        onView={(doc) => setActive(doc)}
        onUpload={(doc) => {
          setPresetType(doc.type);
          setReplaceOf(doc.status === "pending" || doc.status === "rejected" ? doc : undefined);
          setUploadOpen(true);
        }}
        onReview={(doc) => setActive(doc)}
      />

      <DocumentUpload
        open={uploadOpen}
        onOpenChange={(v) => {
          setUploadOpen(v);
          if (!v) setReplaceOf(undefined);
        }}
        student={student}
        presetType={presetType}
        replaceOf={replaceOf}
      />
      <DocumentDetailsDrawer
        open={!!active}
        onOpenChange={(v) => !v && setActive(null)}
        document={active}
        student={student}
        onReplace={(doc) => {
          setActive(null);
          setReplaceOf(doc);
          setPresetType(doc.type);
          setUploadOpen(true);
        }}
      />
      <DocumentRequestModal open={requestOpen} onOpenChange={setRequestOpen} student={student} />
      <PortalShareDrawer open={portalOpen} onOpenChange={setPortalOpen} student={student} />
      <DocumentArchiveDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        student={student}
        documents={documents}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}
