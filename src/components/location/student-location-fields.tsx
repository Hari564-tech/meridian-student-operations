import { useEffect, useState } from "react";
import { AlertCircle, Check, ChevronsUpDown, Loader2, MapPin, RefreshCw } from "lucide-react";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { locationService } from "@/lib/location-data";
import type { Country } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StudentLocationFieldsProps {
  country?: string;
  state?: string;
  district?: string;
  villageCity?: string;
  isManualLocation?: boolean;
  errors?: {
    state?: string;
    district?: string;
    villageCity?: string;
  };
  onChange: (patch: {
    state?: string;
    district?: string;
    villageCity?: string;
    isManualLocation?: boolean;
  }) => void;
}

export function StudentLocationFields({
  country = "India",
  state = "",
  district = "",
  villageCity = "",
  isManualLocation = false,
  errors = {},
  onChange,
}: StudentLocationFieldsProps) {
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [villages, setVillages] = useState<string[]>([]);

  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load States for Country
  useEffect(() => {
    let active = true;
    async function fetchStates() {
      setLoadingStates(true);
      setLoadError(null);
      try {
        const list = await locationService.getStates(country);
        if (active) {
          setStates(list);
        }
      } catch (err) {
        if (active) {
          setLoadError("Failed to load states. Please try again.");
        }
      } finally {
        if (active) setLoadingStates(false);
      }
    }
    void fetchStates();
    return () => {
      active = false;
    };
  }, [country]);

  // Load Districts when State changes
  useEffect(() => {
    let active = true;
    if (!state) {
      setDistricts([]);
      return;
    }
    async function fetchDistricts() {
      setLoadingDistricts(true);
      setLoadError(null);
      try {
        const list = await locationService.getDistricts(state, country);
        if (active) {
          setDistricts(list);
        }
      } catch (err) {
        if (active) {
          setLoadError("Failed to load districts. Please try again.");
        }
      } finally {
        if (active) setLoadingDistricts(false);
      }
    }
    void fetchDistricts();
    return () => {
      active = false;
    };
  }, [state, country]);

  // Load Villages/Cities when District changes
  useEffect(() => {
    let active = true;
    if (!district || !state) {
      setVillages([]);
      return;
    }
    async function fetchVillages() {
      setLoadingVillages(true);
      setLoadError(null);
      try {
        const list = await locationService.getVillagesCities(district, state, country);
        if (active) {
          setVillages(list);
        }
      } catch (err) {
        if (active) {
          setLoadError("Failed to load cities/villages. Please try again.");
        }
      } finally {
        if (active) setLoadingVillages(false);
      }
    }
    void fetchVillages();
    return () => {
      active = false;
    };
  }, [district, state, country]);

  const handleStateChange = (newVal: string) => {
    onChange({
      state: newVal,
      district: "",
      villageCity: "",
    });
  };

  const handleDistrictChange = (newVal: string) => {
    onChange({
      district: newVal,
      villageCity: "",
    });
  };

  const handleVillageChange = (newVal: string) => {
    onChange({
      villageCity: newVal,
    });
  };

  const toggleManual = () => {
    onChange({
      isManualLocation: !isManualLocation,
    });
  };

  return (
    <div className="sm:col-span-2 space-y-3 rounded-xl border bg-muted/10 p-4" data-testid="student-location-section">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-primary shrink-0" />
            <h3 className="text-sm font-semibold text-foreground">Student Location</h3>
            <span className="text-micro font-medium text-destructive">* Required</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {country === "India"
              ? "Select State, District, and Village/City in sequence or enter manually if unlisted."
              : `Select administrative division and locality for ${country}.`}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleManual}
          className="h-8 text-xs shrink-0 self-start sm:self-center"
          data-testid="toggle-manual-location-button"
        >
          {isManualLocation ? "Select from list" : "Enter location manually"}
        </Button>
      </div>

      {loadError && (
        <div className="flex items-center justify-between rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{loadError}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setLoadError(null);
              // Trigger reload
              onChange({ state, district, villageCity });
            }}
            className="h-7 text-xs text-destructive hover:bg-destructive/10 gap-1"
          >
            <RefreshCw className="size-3" /> Retry
          </Button>
        </div>
      )}

      {isManualLocation ? (
        /* Manual Input Mode */
        <div className="grid gap-3 sm:grid-cols-3 pt-1" data-testid="manual-location-inputs">
          <FormField label="State / Province" required error={errors.state}>
            <Input
              placeholder="e.g. Andhra Pradesh"
              value={state}
              onChange={(e) => onChange({ state: e.target.value })}
              data-testid="manual-state-input"
            />
          </FormField>

          <FormField label="District / County" required error={errors.district}>
            <Input
              placeholder="e.g. Guntur"
              value={district}
              onChange={(e) => onChange({ district: e.target.value })}
              data-testid="manual-district-input"
            />
          </FormField>

          <FormField label="Village / Town / City" required error={errors.villageCity}>
            <Input
              placeholder="e.g. Repalle"
              value={villageCity}
              onChange={(e) => onChange({ villageCity: e.target.value })}
              data-testid="manual-village-input"
            />
          </FormField>
        </div>
      ) : (
        /* Cascading Dropdowns Mode */
        <div className="grid gap-3 sm:grid-cols-3 pt-1" data-testid="cascading-location-selects">
          {/* State Select */}
          <FormField label="State" required error={errors.state}>
            <Select value={state} onValueChange={handleStateChange} disabled={loadingStates}>
              <SelectTrigger data-testid="state-select-trigger" className={cn(errors.state && "border-destructive")}>
                <SelectValue placeholder={loadingStates ? "Loading states..." : "Select State"} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {state && !states.includes(state) && (
                  <SelectItem value={state}>{state}</SelectItem>
                )}
                {states.map((st) => (
                  <SelectItem key={st} value={st}>
                    {st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* District Select */}
          <FormField label="District" required error={errors.district}>
            <Select
              value={district}
              onValueChange={handleDistrictChange}
              disabled={!state || loadingDistricts}
            >
              <SelectTrigger
                data-testid="district-select-trigger"
                className={cn(errors.district && "border-destructive", !state && "opacity-60 cursor-not-allowed")}
              >
                <SelectValue
                  placeholder={
                    !state
                      ? "Choose State first"
                      : loadingDistricts
                      ? "Loading districts..."
                      : "Select District"
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {district && !districts.includes(district) && (
                  <SelectItem value={district}>{district}</SelectItem>
                )}
                {districts.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Village / City Select */}
          <FormField label="Village / City" required error={errors.villageCity}>
            <Select
              value={villageCity}
              onValueChange={handleVillageChange}
              disabled={!district || loadingVillages}
            >
              <SelectTrigger
                data-testid="village-select-trigger"
                className={cn(
                  errors.villageCity && "border-destructive",
                  !district && "opacity-60 cursor-not-allowed"
                )}
              >
                <SelectValue
                  placeholder={
                    !district
                      ? "Choose District first"
                      : loadingVillages
                      ? "Loading towns..."
                      : "Select Village / City"
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {villageCity && !villages.includes(villageCity) && (
                  <SelectItem value={villageCity}>{villageCity}</SelectItem>
                )}
                {villages.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      )}

      {/* Helper text showing selected hierarchy */}
      {state && district && villageCity && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
          <Check className="size-3.5 text-emerald-600" />
          <span>Selected hierarchy:</span>
          <span className="font-medium text-foreground">
            {villageCity}, {district}, {state}
          </span>
        </div>
      )}
    </div>
  );
}
