import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BRANCH_OPTIONS } from "@/lib/types";

export function BranchField({
  value,
  onChange,
  label = "Branch",
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
}) {
  const presets = BRANCH_OPTIONS as readonly string[];
  const showingOther = !presets.includes(value);
  return (
    <>
      <FormField label={label} error={showingOther ? undefined : error}>
        <Select value={showingOther ? "Other" : value} onValueChange={(v) => onChange(v === "Other" ? "" : v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BRANCH_OPTIONS.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      {showingOther && (
        <FormField label="Branch name" error={error}>
          <Input
            value={value}
            placeholder="Enter branch name"
            onChange={(e) => onChange(e.target.value)}
          />
        </FormField>
      )}
    </>
  );
}
