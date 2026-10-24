import { CheckCircle2, Clock, FileQuestion, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DocumentReceiptStatus } from "@/lib/types";

export function DocumentReceiptBadge({
  status,
  className,
  showIcon = true,
}: {
  status: DocumentReceiptStatus | "No Requirements Configured" | string;
  className?: string;
  showIcon?: boolean;
}) {
  function renderIcon() {
    if (!showIcon) return null;
    const iconClass = "size-3.5 shrink-0";
    switch (status) {
      case "Completely Received":
        return <CheckCircle2 className={iconClass} />;
      case "Partially Received":
        return <Clock className={iconClass} />;
      case "Not Received":
        return <FileQuestion className={iconClass} />;
      case "No Requirements Configured":
      default:
        return <HelpCircle className={iconClass} />;
    }
  }

  function getVariantClasses() {
    switch (status) {
      case "Completely Received":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20";
      case "Partially Received":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/20";
      case "Not Received":
        return "bg-secondary text-muted-foreground ring-border";
      case "No Requirements Configured":
      default:
        return "bg-muted/60 text-muted-foreground ring-border/80";
    }
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 border-0 font-medium ring-1 text-xs px-2.5 py-0.5 shadow-none",
        getVariantClasses(),
        className,
      )}
      aria-label={`Document receipt status: ${status}`}
    >
      {renderIcon()}
      <span>{status}</span>
    </Badge>
  );
}
