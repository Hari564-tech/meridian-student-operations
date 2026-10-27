import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { FormField } from "@/components/form-field";
import { PasswordField } from "@/components/password-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DocumentWorkspace } from "@/components/documents/document-workspace";
import { PortalShareDrawer } from "@/components/documents/portal-share-drawer";
import { useAppStore, nextStudentId } from "@/lib/store";
import { BranchField } from "@/components/branch-field";
import { useWorkspace } from "@/lib/workspace";
import { rulesForCountry, categoryForType } from "@/lib/documents";
import { openSecret, seal } from "@/lib/credential-crypto";
import { formatINR } from "@/lib/format";
import { moneyFieldValue, moneyFromInput, settlePayment, type SettledPayment } from "@/lib/payment";
import { StudentLocationFields } from "@/components/location/student-location-fields";
import {
  APPLICATION_STATUSES,
  B2B_CONSULTANCIES,
  BLOCKED_ACCOUNT_OPTIONS,
  COUNTRIES,
  ENGLISH_TESTS,
  ENROLLMENT_STATUS_OPTIONS,
  GERMAN_LEVELS,
  INTAKES,
  STUDENT_DORM_STATUS_OPTIONS,
  englishFromStudent,
  getStudentRecoveryNumbers,
  scoresForEnglish,
  toTenDigits,
  type ApplicationStatus,
  type Country,
  type EnglishTest,
  type Intake,
  type LeadType,
  type Student,
  type UniAssistFile,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STEP_DEFS = [
  { key: "personal", label: "Personal" },
  { key: "academic", label: "Academic" },
  { key: "account", label: "Account" },
  { key: "application", label: "Application" },
  { key: "germany", label: "German-Specific Details" },
  { key: "payment", label: "Payment" },
  { key: "documents", label: "Documents" },
  { key: "review", label: "Review" },
] as const;

type StepKey = (typeof STEP_DEFS)[number]["key"];
const DRAFT_KEY = "abroad-aspirants-student-editor-draft-v1";

type Draft = Omit<Student, "createdAt" | "updatedAt" | "avatarHue" | "paymentStatus">;

function emptyDraft(employeeId: string, intake: Intake): Draft {
  return {
    id: "",
    name: "",
    email: "",
    phone1: "",
    phone2: "",
    country: "USA",
    intake,
    state: "Andhra Pradesh",
    district: "Guntur",
    villageCity: "Repalle",
    isManualLocation: false,
    branch: "CSE",
    college: "",
    employeeId,
    status: "Added newly",
    cgpa: 0,
    germanLanguage: "None",
    gmailId: "",
    gmailPassword: "",
    recoveryNumber: "",
    recoveryNumber1: "",
    recoveryNumber2: "",
    recoveryNumber3: "",
    device: "",
    twoStep: false,
    uniAssistFiles: [],
    blockedAccount: "Not Applied",
    enrollment: "Not Applied",
    studentDorm: "Not Applied",
    totalFee: 100000,
    paidAmount: 0,
    discount: 0,
    leadType: "Direct",
    b2bOrg: undefined,
    otherB2bOrg: undefined,
    notes: "",
  };
}

export function StudentFormPage({ studentId }: { studentId?: string }) {
  const existing = useAppStore((s) => s.students.find((st) => st.id === studentId));
  const students = useAppStore((s) => s.students);
  const employees = useAppStore((s) => s.employees);
  const currentUser = useAppStore((s) => s.currentUser);
  const settings = useAppStore((s) => s.settings);
  const intakes = useAppStore((s) => s.intakes);
  const b2bConsultancies = useAppStore((s) => s.b2bConsultancies);
  const createStudent = useAppStore((s) => s.createStudent);
  const updateStudent = useAppStore((s) => s.updateStudent);
  const { base, role } = useWorkspace();
  const navigate = useNavigate();
  const defaultEmp = role === "employee" ? currentUser?.id ?? "" : employees.find((e) => e.role === "employee")?.id ?? "";
  const [step, setStep] = useState(0);

  const activeIntakes = useMemo(() => {
    const activeList = intakes.filter((i) => i.status === "Active").map((i) => i.name);
    if (existing?.intake && !activeList.includes(existing.intake)) {
      return [existing.intake, ...activeList];
    }
    return activeList.length > 0 ? activeList : [...INTAKES];
  }, [intakes, existing?.intake]);

  const activeConsultancies = useMemo(() => {
    const activeList = b2bConsultancies.filter((c) => c.status === "Active").map((c) => c.name);
    if (existing?.b2bOrg && existing.b2bOrg !== "Other" && !activeList.includes(existing.b2bOrg)) {
      return [existing.b2bOrg, ...activeList];
    }
    return activeList.length > 0 ? activeList : [...B2B_CONSULTANCIES];
  }, [b2bConsultancies, existing?.b2bOrg]);

  const [draft, setDraft] = useState<Draft>(() => {
    if (existing) {
      const rec = getStudentRecoveryNumbers(existing);
      return {
        ...existing,
        recoveryNumber: rec.recovery1,
        recoveryNumber1: rec.recovery1,
        recoveryNumber2: rec.recovery2,
        recoveryNumber3: rec.recovery3,
        state: existing.state ?? "Andhra Pradesh",
        district: existing.district ?? "Guntur",
        villageCity: existing.villageCity ?? "Repalle",
        isManualLocation: existing.isManualLocation ?? false,
        blockedAccount: existing.blockedAccount || "Not Applied",
        enrollment: existing.enrollment || "Not Applied",
        studentDorm: existing.studentDorm || "Not Applied",
        phone1: toTenDigits(existing.phone1),
        phone2: toTenDigits(existing.phone2),
        ...englishFromStudent(existing),
      };
    }
    return emptyDraft(defaultEmp, settings.defaultIntake);
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "unsaved">("idle");
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [portalStudent, setPortalStudent] = useState<Student | null>(null);
  const [savedId, setSavedId] = useState<string | undefined>(studentId);
  const applicationId = useMemo(() => {
    if (existing) return existing.id;
    if (savedId) return savedId;
    return nextStudentId(students, draft.intake);
  }, [existing, savedId, students, draft.intake]);
  const lastSaved = useRef(JSON.stringify(draft));
  const createPortal = useAppStore((s) => s.createPortal);
  const seedDocs = useAppStore((s) => s.seedStudentDocuments);
  const liveStudent = useAppStore((s) => s.students.find((st) => st.id === (existing?.id ?? savedId)));
  const blocker = useBlocker({
    shouldBlockFn: () => JSON.stringify(draft) !== lastSaved.current,
    withResolver: true,
    enableBeforeUnload: true,
  });

  const patch = (p: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...p }));
    setSaveState("unsaved");
  };

  const recordOwner = existing?.employeeId ?? draft.employeeId;
  const canEditSecrets = role === "admin" || (!!currentUser && recordOwner === currentUser.id);

  useEffect(() => {
    if (existing) return;
    let cancelled = false;
    void (async () => {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Draft;
        if (parsed?.name === undefined) return;
        parsed.gmailPassword = await openSecret(parsed.gmailPassword);
        parsed.apsPassword = await openSecret(parsed.apsPassword);
        parsed.uniAssistPassword = await openSecret(parsed.uniAssistPassword);
        if (cancelled) return;
        const rest = { ...parsed, id: "" };
        const next = {
          ...emptyDraft(defaultEmp, settings.defaultIntake),
          ...rest,
          phone1: toTenDigits(rest.phone1 ?? ""),
          phone2: toTenDigits(rest.phone2 ?? ""),
          ...englishFromStudent(rest),
        };
        setDraft((d) => ({ ...d, ...next, id: "" }));
        lastSaved.current = JSON.stringify(next);
        setSaveState("saved");
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveDraft();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (blocker.status === "blocked") setLeaveOpen(true);
  }, [blocker.status]);

  const germany = draft.country === "Germany";
  const steps = STEP_DEFS;
  const stepKey: StepKey = steps[Math.min(step, steps.length - 1)]?.key ?? "personal";

  useEffect(() => {
    if (step > steps.length - 1) setStep(steps.length - 1);
  }, [step, steps.length]);

  function issuesFor(key: StepKey) {
    const e: Record<string, string> = {};
    if (key === "personal") {
      if (!draft.name.trim()) e.name = "Name is required";
      if (!draft.phone1.trim()) e.phone1 = "Phone number is required";
      else if (!/^\d{10}$/.test(draft.phone1)) e.phone1 = "Phone number must be exactly 10 digits";
      if (draft.phone2.trim() && !/^\d{10}$/.test(draft.phone2)) e.phone2 = "Phone 2 must be exactly 10 digits";
      if (!draft.college.trim()) e.college = "College is required";
      if (!draft.branch.trim()) e.branch = "Enter the branch name";
      if (!draft.state?.trim()) e.state = "State is required";
      if (!draft.district?.trim()) e.district = "District is required";
      if (!draft.villageCity?.trim()) e.villageCity = "Village / City is required";
    }
    if (key === "academic") {
      if (!draft.cgpa || draft.cgpa < 0) e.cgpa = "Enter CGPA";
      if (!draft.englishTest) e.englishTest = "Select an English test";
      if (draft.englishScore == null || Number.isNaN(Number(draft.englishScore)) || Number(draft.englishScore) <= 0) {
        e.englishScore = "Enter the test score";
      }
    }
    if (key === "account") {
      const rec1 = draft.recoveryNumber1?.trim() || "";
      if (!rec1) {
        e.recoveryNumber1 = "Recovery Number 1 is required";
      } else if (!/^\d{10}$/.test(toTenDigits(rec1))) {
        e.recoveryNumber1 = "Recovery Number 1 must be exactly 10 digits";
      }
      const rec2 = draft.recoveryNumber2?.trim() || "";
      if (rec2 && !/^\d{10}$/.test(toTenDigits(rec2))) {
        e.recoveryNumber2 = "Recovery Number 2 must be exactly 10 digits";
      }
      const rec3 = draft.recoveryNumber3?.trim() || "";
      if (rec3 && !/^\d{10}$/.test(toTenDigits(rec3))) {
        e.recoveryNumber3 = "Recovery Number 3 must be exactly 10 digits";
      }
    }
    if (key === "application") {
      if (draft.leadType === "B2B") {
        if (!draft.b2bOrg?.trim()) {
          e.b2bOrg = "Select a consultancy";
        } else if (draft.b2bOrg === "Other" && !draft.otherB2bOrg?.trim()) {
          e.otherB2bOrg = "Other consultancy name is required";
        }
      }
    }
    if (key === "payment") {
      if (draft.totalFee <= 0) e.totalFee = "Enter a fee";
      if (draft.discount > draft.totalFee) e.discount = "Discount cannot be more than the total fee";
      const due = Math.max(0, draft.totalFee - draft.discount);
      if (draft.paidAmount > due) e.paidAmount = "Initial payment cannot be more than the amount due";
    }
    return e;
  }

  function validate(key = stepKey) {
    const e = issuesFor(key);
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function guardRequired() {
    for (const key of ["personal", "academic", "account", "application", "payment"] as const) {
      const e = issuesFor(key);
      if (Object.keys(e).length) {
        setErrors(e);
        const at = steps.findIndex((item) => item.key === key);
        if (at >= 0) setStep(at);
        return false;
      }
    }
    return true;
  }

  function payload(): Draft {
    const settled = settlePayment(draft.totalFee, draft.discount, draft.paidAmount);
    const rec1 = toTenDigits(draft.recoveryNumber1 || draft.recoveryNumber || "");
    const rec2 = draft.recoveryNumber2 ? toTenDigits(draft.recoveryNumber2) : undefined;
    const rec3 = draft.recoveryNumber3 ? toTenDigits(draft.recoveryNumber3) : undefined;
    const body: Draft = {
      ...draft,
      id: applicationId,
      totalFee: settled.totalFee,
      discount: settled.discount,
      paidAmount: settled.paidAmount,
      phone1: toTenDigits(draft.phone1),
      phone2: toTenDigits(draft.phone2),
      recoveryNumber: rec1,
      recoveryNumber1: rec1,
      recoveryNumber2: rec2,
      recoveryNumber3: rec3,
      state: draft.state?.trim(),
      district: draft.district?.trim(),
      villageCity: draft.villageCity?.trim(),
      isManualLocation: draft.isManualLocation ?? false,
      b2bOrg: draft.leadType === "B2B" ? draft.b2bOrg : undefined,
      otherB2bOrg: draft.leadType === "B2B" && draft.b2bOrg === "Other" ? draft.otherB2bOrg?.trim() : undefined,
      ...scoresForEnglish(draft.englishTest, draft.englishScore),
    };
    if (!canEditSecrets && existing) {
      body.gmailPassword = existing.gmailPassword;
      body.apsPassword = existing.apsPassword;
      body.uniAssistPassword = existing.uniAssistPassword;
      body.uniAssistFiles = existing.uniAssistFiles;
    }
    return body;
  }

  function next() {
    if (!validate()) return;
    if (stepKey === "payment" || stepKey === "documents") {
      if (!guardRequired()) return;
      persistStudent();
    }
    setStep((s) => Math.min(steps.length - 1, s + 1));
  }

  function persistLocal() {
    if (existing) return;
    const copy: Draft = { ...draft };
    void (async () => {
      copy.gmailPassword = await seal(draft.gmailPassword);
      copy.apsPassword = draft.apsPassword ? await seal(draft.apsPassword) : draft.apsPassword;
      copy.uniAssistPassword = draft.uniAssistPassword ? await seal(draft.uniAssistPassword) : draft.uniAssistPassword;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(copy));
    })();
  }

  function saveDraft() {
    setSaveState("saving");
    persistLocal();
    if (existing) {
      updateStudent(existing.id, payload());
    }
    lastSaved.current = JSON.stringify(draft);
    window.setTimeout(() => setSaveState("saved"), 280);
    toast.success("Draft saved");
  }

  function persistStudent() {
    const body = payload();
    if (existing || savedId) {
      const id = existing?.id ?? savedId!;
      updateStudent(id, body);
      seedDocs(id);
      lastSaved.current = JSON.stringify(draft);
      setSaveState("saved");
      return useAppStore.getState().students.find((s) => s.id === id)!;
    }
    const created = createStudent(body);
    setSavedId(created.id);
    setDraft((d) => ({ ...d, id: created.id }));
    lastSaved.current = JSON.stringify({ ...draft, id: created.id });
    setSaveState("saved");
    localStorage.removeItem(DRAFT_KEY);
    return created;
  }

  function save() {
    if (!guardRequired()) return;
    const created = persistStudent();
    lastSaved.current = JSON.stringify(draft);
    toast.success(existing ? "Student updated" : "Student created successfully");
    void navigate({ to: `${base}/students/${created.id}` });
  }

  function saveAndPortal() {
    if (!guardRequired()) return;
    const created = persistStudent();
    createPortal({
      studentId: created.id,
      accessMethod: "link_only",
    });
    setPortalStudent(created);
    toast.success("Portal created");
  }

  const counselors = useMemo(
    () => employees.filter((e) => e.role === "employee" && e.status === "Active"),
    [employees],
  );
  const payment = settlePayment(draft.totalFee, draft.discount, draft.paidAmount);

  return (
    <div className={cn("mx-auto space-y-6", stepKey === "review" ? "max-w-5xl" : "max-w-3xl")}>
      <PageHeader
        title={existing ? `Edit ${existing.name}` : "Add student"}
        description="Capture personal, academic, application, and optional German-specific details."
      />
      <p className="text-micro text-muted-foreground" aria-live="polite">
        {saveState === "saving" && "Saving…"}
        {saveState === "saved" && "Saved just now"}
        {saveState === "unsaved" && "Unsaved changes"}
      </p>

      <ol className="flex flex-wrap gap-2">
        {steps.map((item, i) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => {
                if (i > step) {
                  for (const key of ["personal", "academic", "account", "application", "payment"] as const) {
                    const at = steps.findIndex((candidate) => candidate.key === key);
                    if (at < 0 || at >= i) continue;
                    const e = issuesFor(key);
                    if (Object.keys(e).length) {
                      setErrors(e);
                      setStep(at);
                      return;
                    }
                  }
                }
                const target = steps[i];
                if ((target.key === "documents" || target.key === "review") && !existing && !savedId) {
                  if (!guardRequired()) return;
                  persistStudent();
                }
                setStep(i);
              }}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium",
                item.key === stepKey ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
              )}
            >
              {String(i + 1).padStart(2, "0")} {item.label}
            </button>
          </li>
        ))}
      </ol>

      <Card className="p-5">
        {stepKey === "personal" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Application ID" hint="Assigned automatically. Continues from the last student in this intake.">
              <Input value={applicationId} readOnly tabIndex={-1} className="bg-secondary font-mono" />
            </FormField>
            <FormField label="Intake" required>
              <Select value={draft.intake} onValueChange={(v) => patch({ intake: v as Intake })}>
                <SelectTrigger data-testid="intake-select-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {activeIntakes.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Country" required>
              <Select value={draft.country} onValueChange={(v) => patch({ country: v as Country })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Name" required error={errors.name}>
              <Input
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                data-testid="student-name-input"
              />
            </FormField>
            <FormField label="Phone 1" required error={errors.phone1} hint="10 digits, no country code">
              <Input
                inputMode="numeric"
                maxLength={10}
                value={draft.phone1}
                placeholder="9876543210"
                onChange={(e) => patch({ phone1: toTenDigits(e.target.value) })}
                data-testid="student-phone1-input"
              />
            </FormField>
            <FormField label="Phone 2" error={errors.phone2} hint="Optional, 10 digits">
              <Input
                inputMode="numeric"
                maxLength={10}
                value={draft.phone2}
                placeholder="9876543210"
                onChange={(e) => patch({ phone2: toTenDigits(e.target.value) })}
              />
            </FormField>
            <BranchField value={draft.branch} onChange={(v) => patch({ branch: v })} error={errors.branch} />
            <FormField label="College / University" required error={errors.college}>
              <Input
                value={draft.college}
                onChange={(e) => patch({ college: e.target.value })}
                data-testid="student-college-input"
              />
            </FormField>
            {role === "admin" && (
              <FormField label="Lead By">
                <Select value={draft.employeeId} onValueChange={(v) => patch({ employeeId: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {counselors.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}

            {/* Student Location Section with Cascading Dropdowns */}
            <StudentLocationFields
              country="India"
              state={draft.state}
              district={draft.district}
              villageCity={draft.villageCity}
              isManualLocation={draft.isManualLocation}
              errors={{
                state: errors.state,
                district: errors.district,
                villageCity: errors.villageCity,
              }}
              onChange={(locationPatch) => patch(locationPatch)}
            />
          </div>
        )}

        {stepKey === "academic" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="CGPA" required error={errors.cgpa}>
              <Input
                type="number"
                step="0.01"
                value={draft.cgpa || ""}
                onChange={(e) => patch({ cgpa: Number(e.target.value) })}
                data-testid="student-cgpa-input"
              />
            </FormField>
            <FormField label="English test" required error={errors.englishTest}>
              <Select
                value={draft.englishTest}
                onValueChange={(v) => patch(scoresForEnglish(v as EnglishTest, draft.englishScore))}
              >
                <SelectTrigger data-testid="student-english-test-select">
                  <SelectValue placeholder="Select test" />
                </SelectTrigger>
                <SelectContent>
                  {ENGLISH_TESTS.map((test) => (
                    <SelectItem key={test} value={test}>
                      {test}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="English test score" required error={errors.englishScore}>
              <Input
                type="number"
                step={draft.englishTest === "IELTS" ? "0.5" : "1"}
                min={0}
                value={draft.englishScore ?? ""}
                placeholder={draft.englishTest === "IELTS" ? "7.0" : "Score"}
                data-testid="student-english-score-input"
                onChange={(e) =>
                  patch(
                    scoresForEnglish(
                      draft.englishTest,
                      e.target.value === "" ? undefined : Number(e.target.value),
                    ),
                  )
                }
              />
            </FormField>
            {germany && (
              <FormField label="German grade">
                <Input
                  type="number"
                  step="0.1"
                  value={draft.germanGrade ?? ""}
                  onChange={(e) => patch({ germanGrade: e.target.value ? Number(e.target.value) : undefined })}
                />
              </FormField>
            )}
            {draft.country === "USA" && (
              <FormField label="GRE">
                <Input
                  type="number"
                  value={draft.gre ?? ""}
                  onChange={(e) => patch({ gre: e.target.value ? Number(e.target.value) : undefined })}
                />
              </FormField>
            )}
            <FormField label="German language">
              <Select value={draft.germanLanguage} onValueChange={(v) => patch({ germanLanguage: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GERMAN_LEVELS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        )}

        {stepKey === "account" && (
          <div className="grid gap-4">
            <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
              Sensitive information. Passwords are masked and encrypted when the student is saved. Only an administrator
              or the assigned counselor can reveal them.
            </p>
            <FormField label="Gmail ID">
              <Input
                value={draft.gmailId}
                onChange={(e) => patch({ gmailId: e.target.value, email: e.target.value })}
                data-testid="student-gmail-input"
              />
            </FormField>
            <PasswordField
              label="Gmail password"
              value={canEditSecrets ? draft.gmailPassword : ""}
              onChange={canEditSecrets ? (v) => patch({ gmailPassword: v }) : undefined}
            />
            {/* Three Independent Recovery Numbers */}
            <div className="space-y-3 rounded-xl border bg-muted/10 p-4" data-testid="recovery-numbers-section">
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold">Account Recovery Numbers</h3>
                <p className="text-xs text-muted-foreground">
                  Enter up to three independent recovery numbers for account restoration. Enter a 10-digit mobile number without the country code.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField
                  label="Recovery Number 1"
                  required
                  error={errors.recoveryNumber1}
                  hint="Required, 10 digits"
                >
                  <Input
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="9876543210"
                    value={draft.recoveryNumber1 || ""}
                    onChange={(e) => {
                      const digits = toTenDigits(e.target.value);
                      patch({ recoveryNumber1: digits, recoveryNumber: digits });
                    }}
                    data-testid="recovery-number-1-input"
                  />
                </FormField>
                <FormField
                  label="Recovery Number 2"
                  error={errors.recoveryNumber2}
                  hint="Optional, 10 digits"
                >
                  <Input
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Optional 10 digits"
                    value={draft.recoveryNumber2 || ""}
                    onChange={(e) => patch({ recoveryNumber2: toTenDigits(e.target.value) })}
                    data-testid="recovery-number-2-input"
                  />
                </FormField>
                <FormField
                  label="Recovery Number 3"
                  error={errors.recoveryNumber3}
                  hint="Optional, 10 digits"
                >
                  <Input
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Optional 10 digits"
                    value={draft.recoveryNumber3 || ""}
                    onChange={(e) => patch({ recoveryNumber3: toTenDigits(e.target.value) })}
                    data-testid="recovery-number-3-input"
                  />
                </FormField>
              </div>
            </div>
            <FormField label="Device">
              <Input value={draft.device} onChange={(e) => patch({ device: e.target.value })} />
            </FormField>
            <label className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              2-step verification
              <Switch checked={draft.twoStep} onCheckedChange={(v) => patch({ twoStep: !!v })} />
            </label>
          </div>
        )}

        {stepKey === "application" && (
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Application status">
                <Select value={draft.status} onValueChange={(v) => patch({ status: v as ApplicationStatus })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICATION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Lead type">
                <Select
                  value={draft.leadType}
                  onValueChange={(v) =>
                    patch({
                      leadType: v as LeadType,
                      b2bOrg: v === "B2B" ? draft.b2bOrg : undefined,
                      otherB2bOrg: v === "B2B" ? draft.otherB2bOrg : undefined,
                    })
                  }
                >
                  <SelectTrigger data-testid="lead-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Direct">Direct</SelectItem>
                    <SelectItem value="B2B">B2B</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              {draft.leadType === "B2B" && (
                <>
                  <FormField label="B2B consultancy" required error={errors.b2bOrg}>
                    <Select
                      value={draft.b2bOrg || undefined}
                      onValueChange={(v) =>
                        patch({
                          b2bOrg: v,
                          otherB2bOrg: v === "Other" ? draft.otherB2bOrg : undefined,
                        })
                      }
                    >
                      <SelectTrigger data-testid="b2b-consultancy-select">
                        <SelectValue placeholder="Select consultancy" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {activeConsultancies.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  {draft.b2bOrg === "Other" && (
                    <FormField label="Other Consultancy Name" required error={errors.otherB2bOrg}>
                      <Input
                        placeholder="Enter consultancy name"
                        value={draft.otherB2bOrg || ""}
                        onChange={(e) => patch({ otherB2bOrg: e.target.value })}
                        data-testid="other-b2b-org-input"
                      />
                    </FormField>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {stepKey === "germany" && (
          <section className="grid gap-5">
            <div>
              <h2 className="text-sm font-semibold">German-Specific Details</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Germany-specific and optional. APS and Uni-Assist logins, blocked account, enrollment status, and
                student dorm status. Leave anything you do not have yet — a student can still be added.
              </p>
            </div>
            {draft.country !== "Germany" && (
              <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
                Destination is {draft.country}. These fields are only needed for Germany applications, and none of them
                are required.
              </p>
            )}
            {!canEditSecrets ? (
              <p className="rounded-lg border px-3 py-2 text-sm text-muted-foreground">
                Only an administrator or the assigned counselor can view or change these credentials.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="APS Username">
                  <Input
                    value={draft.apsUsername ?? ""}
                    autoComplete="off"
                    onChange={(e) => patch({ apsUsername: e.target.value })}
                  />
                </FormField>
                <PasswordField
                  label="APS Password"
                  value={draft.apsPassword ?? ""}
                  onChange={(v) => patch({ apsPassword: v })}
                />
                <FormField label="Uni-Assist ID">
                  <Input
                    value={draft.uniAssistId ?? ""}
                    autoComplete="off"
                    onChange={(e) => patch({ uniAssistId: e.target.value })}
                  />
                </FormField>
                <PasswordField
                  label="Uni-Assist Password"
                  value={draft.uniAssistPassword ?? ""}
                  onChange={(v) => patch({ uniAssistPassword: v })}
                />
                <FormField label="Blocked Account">
                  <Select
                    value={draft.blockedAccount || "Not Applied"}
                    onValueChange={(v) => patch({ blockedAccount: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOCKED_ACCOUNT_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                      {draft.blockedAccount &&
                        !(BLOCKED_ACCOUNT_OPTIONS as readonly string[]).includes(draft.blockedAccount) && (
                          <SelectItem value={draft.blockedAccount}>{draft.blockedAccount}</SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Enrollment Status">
                  <Select
                    value={draft.enrollment || "Not Applied"}
                    onValueChange={(v) => patch({ enrollment: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENROLLMENT_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                      {draft.enrollment &&
                        !(ENROLLMENT_STATUS_OPTIONS as readonly string[]).includes(draft.enrollment) && (
                          <SelectItem value={draft.enrollment}>{draft.enrollment}</SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Student Dorm Status">
                  <Select
                    value={draft.studentDorm || "Not Applied"}
                    onValueChange={(v) => patch({ studentDorm: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STUDENT_DORM_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                      {draft.studentDorm &&
                        !(STUDENT_DORM_STATUS_OPTIONS as readonly string[]).includes(draft.studentDorm) && (
                          <SelectItem value={draft.studentDorm}>{draft.studentDorm}</SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                </FormField>
                <div className="hidden sm:block" />
              </div>
            )}
          </section>
        )}

        {stepKey === "payment" && (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Total fee (₹)" required error={errors.totalFee}>
                <Input
                  inputMode="numeric"
                  value={moneyFieldValue(draft.totalFee)}
                  onChange={(e) => patch({ totalFee: moneyFromInput(e.target.value) })}
                />
              </FormField>
              <FormField label="Initial payment (₹)" error={errors.paidAmount}>
                <Input
                  inputMode="numeric"
                  placeholder="0"
                  value={moneyFieldValue(draft.paidAmount)}
                  onChange={(e) => patch({ paidAmount: moneyFromInput(e.target.value) })}
                />
              </FormField>
              <FormField label="Discount (₹)" error={errors.discount}>
                <Input
                  inputMode="numeric"
                  placeholder="0"
                  value={moneyFieldValue(draft.discount)}
                  onChange={(e) => patch({ discount: moneyFromInput(e.target.value) })}
                />
              </FormField>
            </div>
            <dl className="grid gap-2 rounded-lg border bg-secondary/50 px-3 py-2.5 text-sm sm:grid-cols-2">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Amount due</dt>
                <dd className="font-semibold tabular-nums">{formatINR(payment.payable)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Remaining</dt>
                <dd className="font-semibold tabular-nums">{formatINR(payment.remaining)}</dd>
              </div>
            </dl>
          </div>
        )}

        {stepKey === "documents" && (
          <DocumentsStep
            draft={draft}
            student={existing ?? liveStudent}
            onUploadPortal={() => saveAndPortal()}
          />
        )}

        {stepKey === "review" && (
          <ReviewStep
            draft={draft}
            applicationId={applicationId}
            payment={payment}
            counselorName={counselors.find((e) => e.id === draft.employeeId)?.name ?? "Unassigned"}
            canEditSecrets={canEditSecrets}
            onNotes={(notes) => patch({ notes })}
          />
        )}

        <div className="mt-6 flex flex-wrap justify-between gap-2">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={saveDraft}>
              Save draft
            </Button>
            {stepKey === "documents" && (
              <Button variant="outline" onClick={saveAndPortal}>
                Save & create upload portal
              </Button>
            )}
            {stepKey !== "review" ? (
              <Button onClick={next}>{stepKey === "documents" ? "Save & continue" : "Continue"}</Button>
            ) : (
              <Button onClick={save}>{existing ? "Save changes" : "Create student"}</Button>
            )}
          </div>
        </div>
      </Card>
      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={(v) => {
          setLeaveOpen(v);
          if (!v && blocker.status === "blocked") blocker.reset();
        }}
        title="You have unsaved changes."
        description="Leave this student without saving?"
        confirmLabel="Leave without saving"
        cancelLabel="Stay"
        destructive
        onConfirm={() => {
          lastSaved.current = JSON.stringify(draft);
          setLeaveOpen(false);
          if (blocker.status === "blocked") blocker.proceed();
          else void navigate({ to: `${base}/students` });
        }}
      />
      {portalStudent && (
        <PortalShareDrawer
          open={!!portalStudent}
          onOpenChange={(v) => {
            if (!v) {
              const id = portalStudent.id;
              setPortalStudent(null);
              void navigate({ to: `${base}/students/${id}` });
            }
          }}
          student={portalStudent}
          startCreated
        />
      )}
    </div>
  );
}

function dash(value: string | number | undefined | null) {
  if (value == null) return "—";
  const text = String(value).trim();
  return text ? text : "—";
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-sm font-medium">{value}</p>
    </div>
  );
}

function ReviewSection({
  title,
  hint,
  children,
  wide,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={cn("rounded-xl border bg-secondary/20 p-4", wide && "sm:col-span-2")}>
      <h3 className="text-sm font-semibold">{title}</h3>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function ReviewStep({
  draft,
  applicationId,
  payment,
  counselorName,
  canEditSecrets,
  onNotes,
}: {
  draft: Draft;
  applicationId: string;
  payment: SettledPayment;
  counselorName: string;
  canEditSecrets: boolean;
  onNotes: (notes: string) => void;
}) {
  const english = englishFromStudent(draft);
  const documents = rulesForCountry(draft.country);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ReviewSection title="01 Personal">
        <ReviewField label="Application ID" value={applicationId} />
        <ReviewField label="Name" value={dash(draft.name)} />
        <ReviewField label="Phone 1" value={dash(draft.phone1)} />
        <ReviewField label="Phone 2" value={dash(draft.phone2)} />
        <ReviewField label="Email" value={dash(draft.email)} />
        <ReviewField label="Country" value={draft.country} />
        <ReviewField label="Intake" value={draft.intake} />
        <ReviewField label="State" value={dash(draft.state)} />
        <ReviewField label="District" value={dash(draft.district)} />
        <ReviewField label="Village / City" value={dash(draft.villageCity)} />
        <ReviewField label="Branch" value={dash(draft.branch)} />
        <ReviewField label="College / University" value={dash(draft.college)} />
        <ReviewField label="Lead By" value={counselorName} />
      </ReviewSection>

      <ReviewSection title="02 Academic">
        <ReviewField label="CGPA" value={draft.cgpa ? draft.cgpa.toFixed(2) : "—"} />
        <ReviewField label="English test" value={dash(english.englishTest)} />
        <ReviewField
          label="English score"
          value={english.englishScore != null ? String(english.englishScore) : "—"}
        />
        <ReviewField label="German grade" value={draft.germanGrade != null ? draft.germanGrade.toFixed(1) : "—"} />
        <ReviewField label="GRE" value={draft.gre != null ? String(draft.gre) : "—"} />
        <ReviewField label="German language" value={dash(draft.germanLanguage)} />
      </ReviewSection>

      <ReviewSection title="03 Account" hint="Sensitive credentials. Reveal only when you need them.">
        <ReviewField label="Gmail ID" value={dash(draft.gmailId)} />
        <PasswordField label="Gmail password" value={canEditSecrets ? draft.gmailPassword : ""} />
        <ReviewField label="Recovery Number 1" value={dash(draft.recoveryNumber1 || draft.recoveryNumber)} />
        <ReviewField label="Recovery Number 2" value={dash(draft.recoveryNumber2)} />
        <ReviewField label="Recovery Number 3" value={dash(draft.recoveryNumber3)} />
        <ReviewField label="Device" value={dash(draft.device)} />
        <ReviewField label="2-step verification" value={draft.twoStep ? "Enabled" : "Off"} />
      </ReviewSection>

      <ReviewSection title="04 Application">
        <ReviewField label="Application status" value={draft.status} />
        <ReviewField label="Lead type" value={draft.leadType} />
        <ReviewField
          label="B2B consultancy"
          value={
            draft.leadType === "B2B"
              ? draft.b2bOrg === "Other"
                ? `${draft.otherB2bOrg || "Other"} (Other)`
                : dash(draft.b2bOrg)
              : "—"
          }
        />
      </ReviewSection>

      <ReviewSection
        title="German-Specific Details"
        hint="Germany-specific. Optional — blank fields do not block registration."
        wide
      >
        <ReviewField label="APS Username" value={dash(draft.apsUsername)} />
        <PasswordField label="APS Password" value={canEditSecrets ? (draft.apsPassword ?? "") : ""} />
        <ReviewField label="Uni-Assist ID" value={dash(draft.uniAssistId)} />
        <PasswordField label="Uni-Assist Password" value={canEditSecrets ? (draft.uniAssistPassword ?? "") : ""} />
        <ReviewField label="Blocked Account" value={dash(draft.blockedAccount)} />
        <ReviewField label="Enrollment Status" value={dash(draft.enrollment)} />
        <ReviewField label="Student Dorm Status" value={dash(draft.studentDorm)} />
      </ReviewSection>

      <ReviewSection title="05 Payment">
        <ReviewField label="Total fee" value={formatINR(payment.totalFee)} />
        <ReviewField label="Discount" value={formatINR(payment.discount)} />
        <ReviewField label="Amount due" value={formatINR(payment.payable)} />
        <ReviewField label="Initial payment" value={formatINR(payment.paidAmount)} />
        <ReviewField label="Remaining" value={formatINR(payment.remaining)} />
        <ReviewField label="Payment status" value={payment.status} />
      </ReviewSection>

      <ReviewSection title="06 Documents" hint={`Checklist for ${draft.country}. Saved when the student is created.`} wide>
        {documents.map((rule) => (
          <div key={rule.type} className="flex items-baseline justify-between gap-3 rounded-lg border bg-card px-3 py-2">
            <div>
              <p className="text-sm font-medium">{rule.type}</p>
              <p className="text-micro text-muted-foreground">{categoryForType(rule.type)}</p>
            </div>
            <span className="shrink-0 text-micro text-muted-foreground">{rule.required ? "Required" : "Optional"}</span>
          </div>
        ))}
      </ReviewSection>

      <section className="rounded-xl border bg-secondary/20 p-4 sm:col-span-2">
        <h3 className="text-sm font-semibold">Notes</h3>
        <p className="mt-1 text-xs text-muted-foreground">Anything the counselor should remember about this student.</p>
        <Textarea
          className="mt-3 min-h-24"
          value={draft.notes}
          placeholder="No notes recorded."
          onChange={(e) => onNotes(e.target.value)}
        />
      </section>
    </div>
  );
}

function DocumentsStep({
  draft,
  student,
  onUploadPortal,
}: {
  draft: Draft;
  student?: Student;
  onUploadPortal: () => void;
}) {
  const rules = rulesForCountry(draft.country);
  if (student) {
    return (
      <div className="-mx-1">
        <DocumentWorkspace student={student} compactHeader showPortalBanner onCreatePortal={onUploadPortal} />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Documents</h2>
        <p className="text-sm text-muted-foreground">Upload, manage and collect documents for this student.</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Requirements below are configured for {draft.country}. They are business rules for this destination, not universal
        requirements. Saving this student creates the checklist. Use Save & create upload portal to generate a student
        link.
      </p>
      <ul className="divide-y rounded-xl border">
        {rules.map((rule) => (
          <li key={rule.type} className="flex items-center justify-between px-3 py-2.5 text-sm">
            <span>
              <span className="font-medium">{rule.type}</span>
              <span className="ml-2 text-micro text-muted-foreground">{categoryForType(rule.type)}</span>
            </span>
            <span className="text-micro text-muted-foreground">{rule.required ? "Required" : "Optional"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
