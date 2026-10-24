import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center overflow-hidden",
        className,
      )}
      aria-label="Abroad Aspirants mark"
    >
      <img
        src="/brand/logo-mark.svg"
        alt="Abroad Aspirants"
        className="h-full w-full object-contain"
        loading="eager"
      />
    </div>
  );
}

export function Logo({
  compact = false,
  className,
  showSubtitle = false,
}: {
  compact?: boolean;
  className?: string;
  showSubtitle?: boolean;
}) {
  if (compact) {
    return <LogoMark className={className} />;
  }

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <img
        src="/brand/logo.svg"
        alt="Abroad Aspirants"
        className="h-8 w-auto max-w-[146px] object-contain"
        loading="eager"
      />
      {showSubtitle && (
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-foreground">Abroad Aspirants</div>
          <div className="text-micro text-muted-foreground">Student operations</div>
        </div>
      )}
    </div>
  );
}
