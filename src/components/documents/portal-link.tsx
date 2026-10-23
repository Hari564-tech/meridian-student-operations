import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { portalUrl } from "@/lib/documents";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

export function PortalLink({
  token,
  studentId,
  showOpen = true,
}: {
  token: string;
  studentId: string;
  showOpen?: boolean;
}) {
  const appendAudit = useAppStore((s) => s.appendAudit);
  const [copied, setCopied] = useState(false);
  const url = portalUrl(token);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Upload link copied");
      appendAudit({
        action: "PORTAL_LINK_COPIED",
        module: "Documents",
        recordId: studentId,
        details: "Copied student portal link",
        severity: "INFO",
      });
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <div className="grid min-w-0 gap-2 rounded-lg border bg-secondary/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">Upload link</p>
        <span className="font-mono text-micro text-muted-foreground">{token}</span>
      </div>
      <Input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        aria-label="Student upload link"
        className="h-10 bg-card font-mono text-xs"
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void copy()}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Link copied" : "Copy link"}
        </Button>
        {showOpen && (
          <Button size="sm" variant="outline" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> Open portal
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
