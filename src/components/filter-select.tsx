import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FilterOption = string | { value: string; label: string };

function normalize(option: FilterOption) {
  return typeof option === "string" ? { value: option, label: option } : option;
}

export function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  allLabel = "All",
  includeAll = true,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: readonly FilterOption[];
  allLabel?: string;
  includeAll?: boolean;
  className?: string;
}) {
  const items = options.map(normalize);
  return (
    <label className={cn("grid min-w-0 gap-1", className ?? "w-44")}>
      <span className="truncate px-0.5 text-micro font-semibold uppercase tracking-wide text-muted-foreground">
        {placeholder}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full" aria-label={placeholder}>
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent>
          {includeAll && <SelectItem value="all">{allLabel}</SelectItem>}
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
