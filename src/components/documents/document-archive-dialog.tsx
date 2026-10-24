import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Download,
  FileArchive,
  FolderArchive,
  Loader2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  generateStudentDocumentArchive,
  triggerBlobDownload,
  type ArchiveGenerationResult,
} from "@/lib/document-archive";
import { useAppStore } from "@/lib/store";
import type { Student, StudentDocument } from "@/lib/types";
import { toast } from "sonner";

export function DocumentArchiveDialog({
  open,
  onOpenChange,
  student,
  documents,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student;
  documents: StudentDocument[];
}) {
  const [phase, setPhase] = useState<"idle" | "empty" | "generating" | "success" | "error">("idle");
  const [statusText, setStatusText] = useState("Preparing student document archive...");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ArchiveGenerationResult | null>(null);
  const currentUser = useAppStore((s) => s.currentUser);
  const appendAudit = useAppStore((s) => s.appendAudit);

  // Available documents = belongs to this student and has a file/status uploaded
  const availableDocs = documents.filter(
    (d) => d.studentId === student.id && (Boolean(d.fileName) || d.status !== "pending"),
  );

  useEffect(() => {
    if (!open) {
      setPhase("idle");
      setProgress(0);
      setResult(null);
      return;
    }

    if (availableDocs.length === 0) {
      setPhase("empty");
      return;
    }

    // Auto-start generation when dialog opens
    let cancelled = false;
    async function startExport() {
      setPhase("generating");
      setProgress(10);
      setStatusText("Preparing student document archive...");

      try {
        const res = await generateStudentDocumentArchive(student, documents, (step, pct) => {
          if (!cancelled) {
            setStatusText(step);
            setProgress(pct);
          }
        });

        if (cancelled) return;

        if (res.success && res.blob) {
          triggerBlobDownload(res.blob, res.fileName);
          setResult(res);
          setPhase("success");

          // Append audit record for student documents exported
          appendAudit({
            action: "STUDENT_DOCUMENTS_EXPORTED",
            module: "Documents",
            recordId: student.id,
            details: `Exported ${res.includedFiles.length} document${res.includedFiles.length === 1 ? "" : "s"} for ${student.name} (${student.id})`,
            severity: "INFO",
          });

          toast.success("Student documents downloaded successfully");
        } else {
          setPhase("empty");
        }
      } catch (err) {
        if (!cancelled) {
          setPhase("error");
          toast.error("Failed to generate document archive");
        }
      }
    }

    startExport();

    return () => {
      cancelled = true;
    };
  }, [open, student.id]);

  function handleRedownload() {
    if (result?.blob) {
      triggerBlobDownload(result.blob, result.fileName);
      toast.success("Student documents downloaded successfully");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {phase === "empty" ? (
          <>
            <DialogHeader>
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary">
                <FileArchive className="size-6 text-muted-foreground" />
              </div>
              <DialogTitle className="text-center">No documents available to download</DialogTitle>
              <DialogDescription className="text-center">
                Upload or receive documents before generating the archive.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 text-center text-xs text-muted-foreground">
              Student: <span className="font-medium text-foreground">{student.name}</span> ({student.id})
            </div>
            <DialogFooter className="sm:justify-center">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : phase === "generating" ? (
          <>
            <DialogHeader>
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
              <DialogTitle className="text-center">Preparing student document archive...</DialogTitle>
              <DialogDescription className="text-center">
                Student: {student.name} ({student.id})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-muted-foreground">{statusText}</span>
                <span className="tabular-nums font-semibold">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-center text-xs text-muted-foreground">
                Collecting files and packaging structured ZIP archive...
              </p>
            </div>
          </>
        ) : phase === "success" && result ? (
          <>
            <DialogHeader>
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="size-6 text-success" />
              </div>
              <DialogTitle className="text-center text-success">
                ✔ Student documents downloaded successfully
              </DialogTitle>
              <DialogDescription className="text-center">
                Archive generated for {student.name} ({student.id})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div className="rounded-lg border bg-secondary/30 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <Archive className="size-4 text-primary shrink-0" />
                  <span className="font-mono font-medium truncate">{result.fileName}</span>
                </div>
                <div className="mt-2 text-muted-foreground">
                  Includes {result.includedFiles.length} file{result.includedFiles.length === 1 ? "" : "s"} organized by category with <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">Document_Manifest.txt</code>.
                </div>
              </div>

              {result.unavailableFiles.length > 0 && (
                <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs text-warning-foreground">
                  <div className="flex items-center gap-1.5 font-semibold text-warning">
                    <AlertTriangle className="size-3.5" />
                    <span>Unavailable file contents:</span>
                  </div>
                  <ul className="mt-1 list-disc pl-5 space-y-0.5 text-muted-foreground">
                    {result.unavailableFiles.map((u, i) => (
                      <li key={i}>
                        {u.name} — {u.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={handleRedownload}>
                <Download className="size-4" /> Download again
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Download Archive</DialogTitle>
              <DialogDescription>An unexpected error occurred while preparing the archive.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
