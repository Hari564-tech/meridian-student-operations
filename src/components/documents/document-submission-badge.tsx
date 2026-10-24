import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileQuestion,
  HelpCircle,
  Hourglass,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { documentSubmissionTone, TONE_BADGE } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { DocumentSubmissionStatus } from "@/lib/types";

export function DocumentSubmissionBadge({
  status,
  className,
  showIcon = true,
}: {
  status: DocumentSubmissionStatus;
  className?: string;
  showIcon?: boolean;
}) {
  const tone = documentSubmissionTone(status);

  function renderIcon() {
    if (!showIcon) return null;
    const iconClass = "size-3.5 shrink-0";
    switch (status) {
      case "All Verified":
        return <CheckCircle2 className={iconClass} />;
      case "All Received":
        return <FileCheck2 className={iconClass} />;
      case "Pending Review":
        return <Hourglass className={iconClass} />;
      case "Partially Received":
        return <Clock className={iconClass} />;
      case "Action Required":
        return <AlertCircle className={iconClass} />;
      case "Not Received":
        return <FileQuestion className={iconClass} />;
      case "No Requirements Configured":
      default:
        return <HelpCircle className={iconClass} />;
    }
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 border-0 font-medium ring-1 text-xs px-2.5 py-0.5",
        TONE_BADGE[tone] ?? TONE_BADGE.muted,
        className,
      )}
      aria-label={`Document submission status: ${status}`}
    >
      {renderIcon()}
      <span>{status}</span>
    </Badge>
  );
}
