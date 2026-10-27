export type Role = "admin" | "employee";
export const COUNTRIES = [
  "USA",
  "UK",
  "Canada",
  "Australia",
  "New Zealand",
  "Ireland",
  "Germany",
  "Austria",
  "France",
  "Italy",
  "Netherlands",
  "Sweden",
  "Finland",
  "Denmark",
  "Norway",
  "Belgium",
  "Spain",
  "Czech Republic",
  "Hungary",
  "Switzerland",
  "Malta",
  "Cyprus",
] as const;
export type Country = (typeof COUNTRIES)[number];
export type LeadType = "Direct" | "B2B";
export type PaymentStatus = "Paid" | "Partially Paid" | "Pending" | "Overdue";
export type AuditSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
export type DocumentStatus = "pending" | "uploaded" | "under_review" | "verified" | "rejected" | "expired";
export type DocumentCategory =
  | "Identity"
  | "Academic"
  | "Language"
  | "Financial"
  | "Application"
  | "University"
  | "Visa"
  | "Other";
export type DocumentPriority = "high" | "normal" | "optional";
export type PortalAccessMethod = "email_only" | "link_only" | "email_and_link";
export type PortalStatus = "active" | "revoked" | "expired";
export type ActorRole = "admin" | "employee" | "student" | "system";
export type ThemeMode = "light" | "dark" | "system";
export type LeadPipeline = "New" | "Shortlisting" | "Applications" | "Offer" | "Visa";
export type EmployeeStatus = "Active" | "Inactive";
export type Priority = "High" | "Medium" | "Low";
export type WorkStatus = "Pending" | "In Progress" | "Done";

export const APPLICATION_STATUSES = [
  "Added newly",
  "New",
  "Submitted",
  "Cancelled",
  "Not possible",
  "NIBS",
  "Shortlisting Sent",
  "Applications Started",
  "Applications on Hold",
  "Offered",
  "Waiting",
  "Deferred",
  "Dropped",
  "Private Registered",
  "Private Shifted",
  "Still Thinking",
  "Got Visa",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APS_APPLIED_BY_OPTIONS = ["Student", "By Employee"] as const;
export type ApsAppliedBy = (typeof APS_APPLIED_BY_OPTIONS)[number];

export const UNIVERSITY_TYPES = ["Public University", "Private University"] as const;
export type UniversityType = (typeof UNIVERSITY_TYPES)[number];

export const PAYMENT_METHODS = ["Cash", "Bank Transfer", "UPI", "Card", "Other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface PaymentTransaction {
  id: string;
  studentId: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod | string;
  customMethod?: string;
  reference?: string;
  notes?: string;
  receiptUrl?: string;
  receiptFileName?: string;
  recordedBy: string;
  recordedById?: string;
  createdAt: string;
  updatedAt: string;
  status: "Completed" | "Pending" | "Voided";
}

export const INTAKES = [
  "Oct 2026",
  "Nov 2026",
  "Dec 2026",
  "Jan 2027",
  "Feb 2027",
  "Mar 2027",
  "Apr 2027",
  "May 2027",
  "Jun 2027",
  "Jul 2027",
  "Aug 2027",
  "Sep 2027",
  "Oct 2027",
  "Nov 2027",
  "Dec 2027",
] as const;

export type Intake = string;

export const INTAKE_TYPES = ["Monthly", "Seasonal", "Other"] as const;
export type IntakeType = (typeof INTAKE_TYPES)[number];

export const INTAKE_STATUSES = ["Active", "Inactive", "Archived"] as const;
export type IntakeStatus = (typeof INTAKE_STATUSES)[number];

export interface IntakeRecord {
  id: string;
  name: string;
  type: IntakeType;
  year: number;
  status: IntakeStatus;
  createdAt: string;
  updatedAt: string;
}

/** Pull a 10-digit local number from raw input (keeps a leading 91 country code out). */
export function toTenDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("91")) return digits.slice(2, 12);
  return digits.slice(0, 10);
}

export function isTenDigitPhone(value: string) {
  return /^\d{10}$/.test(toTenDigits(value)) && toTenDigits(value).length === 10 && value.replace(/\D/g, "").length <= 12;
}

export const ENGLISH_TESTS = [
  "IELTS",
  "TOEFL",
  "IELTS & TOEFL",
  "Duolingo",
  "PTE",
  "Other",
  "Not Taken",
] as const;
export type EnglishTest = (typeof ENGLISH_TESTS)[number];

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function englishFromStudent(student: {
  englishTest?: EnglishTest | string;
  englishScore?: number;
  ielts?: number;
  toefl?: number;
  duolingo?: number;
  pte?: number;
  otherEnglishTestName?: string;
  otherEnglishTestScore?: number;
}): {
  englishTest?: EnglishTest;
  englishScore?: number;
  ielts?: number;
  toefl?: number;
  duolingo?: number;
  pte?: number;
  otherEnglishTestName?: string;
  otherEnglishTestScore?: number;
} {
  if (
    student.englishTest === "IELTS & TOEFL" ||
    (typeof student.ielts === "number" && typeof student.toefl === "number" && student.englishTest !== "IELTS" && student.englishTest !== "TOEFL")
  ) {
    return {
      englishTest: "IELTS & TOEFL",
      ielts: student.ielts,
      toefl: student.toefl,
    };
  }
  if (student.englishTest === "Other") {
    return {
      englishTest: "Other",
      englishScore: student.englishScore ?? student.otherEnglishTestScore,
      otherEnglishTestName: student.otherEnglishTestName,
      otherEnglishTestScore: student.otherEnglishTestScore ?? student.englishScore,
    };
  }
  if (student.englishTest === "Not Taken") {
    return { englishTest: "Not Taken" };
  }
  if (student.englishTest) {
    return {
      englishTest: student.englishTest as EnglishTest,
      englishScore: student.englishScore,
      ielts: student.ielts,
      toefl: student.toefl,
      duolingo: student.duolingo,
      pte: student.pte,
      otherEnglishTestName: student.otherEnglishTestName,
      otherEnglishTestScore: student.otherEnglishTestScore,
    };
  }
  if (typeof student.ielts === "number" && typeof student.toefl === "number") {
    return { englishTest: "IELTS & TOEFL", ielts: student.ielts, toefl: student.toefl };
  }
  if (typeof student.ielts === "number") return { englishTest: "IELTS", englishScore: student.ielts, ielts: student.ielts };
  if (typeof student.toefl === "number") return { englishTest: "TOEFL", englishScore: student.toefl, toefl: student.toefl };
  if (typeof student.duolingo === "number") return { englishTest: "Duolingo", englishScore: student.duolingo, duolingo: student.duolingo };
  if (typeof student.pte === "number") return { englishTest: "PTE", englishScore: student.pte, pte: student.pte };
  return {};
}

/** Keep legacy score fields in sync so eligibility still reads IELTS / TOEFL / Duolingo. */
export function scoresForEnglish(
  test: EnglishTest | string | undefined,
  score?: number | undefined,
  extra?: {
    ielts?: number;
    toefl?: number;
    duolingo?: number;
    pte?: number;
    otherName?: string;
    otherScore?: number;
  },
) {
  if (test === "IELTS & TOEFL") {
    return {
      englishTest: test,
      englishScore: extra?.ielts ?? score,
      ielts: extra?.ielts,
      toefl: extra?.toefl,
      duolingo: undefined,
      pte: undefined,
      otherEnglishTestName: undefined,
      otherEnglishTestScore: undefined,
    };
  }
  if (test === "IELTS") {
    const val = extra?.ielts ?? score;
    return {
      englishTest: test,
      englishScore: val,
      ielts: val,
      toefl: undefined,
      duolingo: undefined,
      pte: undefined,
      otherEnglishTestName: undefined,
      otherEnglishTestScore: undefined,
    };
  }
  if (test === "TOEFL") {
    const val = extra?.toefl ?? score;
    return {
      englishTest: test,
      englishScore: val,
      ielts: undefined,
      toefl: val,
      duolingo: undefined,
      pte: undefined,
      otherEnglishTestName: undefined,
      otherEnglishTestScore: undefined,
    };
  }
  if (test === "Duolingo") {
    const val = extra?.duolingo ?? score;
    return {
      englishTest: test,
      englishScore: val,
      ielts: undefined,
      toefl: undefined,
      duolingo: val,
      pte: undefined,
      otherEnglishTestName: undefined,
      otherEnglishTestScore: undefined,
    };
  }
  if (test === "PTE") {
    const val = extra?.pte ?? score;
    return {
      englishTest: test,
      englishScore: val,
      ielts: undefined,
      toefl: undefined,
      duolingo: undefined,
      pte: val,
      otherEnglishTestName: undefined,
      otherEnglishTestScore: undefined,
    };
  }
  if (test === "Other") {
    const val = extra?.otherScore ?? score;
    return {
      englishTest: test,
      englishScore: val,
      ielts: undefined,
      toefl: undefined,
      duolingo: undefined,
      pte: undefined,
      otherEnglishTestName: extra?.otherName,
      otherEnglishTestScore: val,
    };
  }
  if (test === "Not Taken") {
    return {
      englishTest: test,
      englishScore: undefined,
      ielts: undefined,
      toefl: undefined,
      duolingo: undefined,
      pte: undefined,
      otherEnglishTestName: undefined,
      otherEnglishTestScore: undefined,
    };
  }
  return {
    englishTest: test,
    englishScore: score,
    ielts: test === "IELTS" ? score : extra?.ielts,
    toefl: test === "TOEFL" ? score : extra?.toefl,
    duolingo: test === "Duolingo" ? score : extra?.duolingo,
    pte: test === "PTE" ? score : extra?.pte,
    otherEnglishTestName: extra?.otherName,
    otherEnglishTestScore: extra?.otherScore,
  };
}

const INTAKE_MONTH: Record<string, string> = {
  Jan: "JAN",
  Feb: "FEB",
  Mar: "MAR",
  Apr: "APR",
  May: "MAY",
  Jun: "JUN",
  Jul: "JUL",
  Aug: "AUG",
  Sep: "SEP",
  Oct: "OCT",
  Nov: "NOV",
  Dec: "DEC",
};

/** Student-id prefix from an intake label, e.g. "Oct 2026" → "OCT26". */
export function intakeIdPrefix(intake: string) {
  const [mon = "", year = ""] = intake.split(" ");
  if (intake.startsWith("Winter")) return `W${intake.slice(-2)}`;
  if (intake.startsWith("Summer")) return `S${intake.slice(-2)}`;
  if (intake.startsWith("January")) return "JAN";
  if (intake.startsWith("Spring")) return `SP${intake.slice(-2)}`;
  return `${INTAKE_MONTH[mon] ?? mon.slice(0, 3).toUpperCase()}${year.slice(-2)}`;
}

export const BRANCHES = [
  "Mech",
  "EEE",
  "ECE",
  "CIVIL",
  "Agriculture",
  "BCOM",
  "BCA",
  "CSE",
  "CSE - AI",
  "CSE - DS",
  "CSE - AI&ML",
  "CSE - AI&DS",
  "IT",
  "BIOTEC",
  "CHEMISTRY",
  "PHARM C",
  "PHARM D",
  "Other",
] as const;

export const BRANCH_OPTIONS = BRANCHES.filter((b) => b !== "Other");

export const B2B_CONSULTANCIES = [
  "Dream Abroad",
  "AHM",
  "IOE",
  "IAS",
  "V FOR",
  "KC",
  "IEPL",
  "Easy GO",
  "VISA AXIS",
  "SL",
  "SMART SCHLORS",
  "Karthi Overseas",
] as const;

export const B2B_CONSULTANCY_STATUSES = ["Active", "Inactive", "Archived"] as const;
export type B2BConsultancyStatus = (typeof B2B_CONSULTANCY_STATUSES)[number];

export interface B2BConsultancyRecord {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  status: B2BConsultancyStatus;
  notes?: string;
  isCustom?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const GERMAN_LEVELS = ["None", "A1", "A2", "B1", "B2", "C1"] as const;

export const DOCUMENT_CATEGORIES = [
  "Identity",
  "Academic",
  "Language",
  "Financial",
  "Application",
  "University",
  "Visa",
  "Other",
] as const;

export const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "STATUS_CHANGE",
  "PAYMENT_UPDATE",
  "EMPLOYEE_ASSIGN",
  "UNIVERSITY_UPDATE",
  "EXPORT",
  "VIEW",
  "SHORTLIST",
  "DOCUMENT_UPLOADED",
  "DOCUMENT_VIEWED",
  "DOCUMENT_DOWNLOADED",
  "DOCUMENT_REPLACED",
  "DOCUMENT_VERIFIED",
  "DOCUMENT_REJECTED",
  "DOCUMENT_DELETED",
  "DOCUMENT_REQUESTED",
  "PORTAL_CREATED",
  "PORTAL_ACCESSED",
  "PORTAL_SHARED",
  "PORTAL_LINK_COPIED",
  "PORTAL_REVOKED",
  "PORTAL_REGENERATED",
  "STUDENT_UPLOADED_DOCUMENT",
  "STUDENT_REPLACED_DOCUMENT",
  "STUDENT_DOCUMENTS_EXPORTED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const DOCUMENT_SUBMISSION_STATUSES = [
  "Not Received",
  "Partially Received",
  "Pending Review",
  "Action Required",
  "All Received",
  "All Verified",
  "No Requirements Configured",
] as const;

export type DocumentSubmissionStatus = (typeof DOCUMENT_SUBMISSION_STATUSES)[number];

export const DOCUMENT_RECEIPT_STATUSES = [
  "Not Received",
  "Partially Received",
  "Completely Received",
] as const;

export type DocumentReceiptStatus = (typeof DOCUMENT_RECEIPT_STATUSES)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  title: string;
  department: string;
  status: EmployeeStatus;
  lastActive: string;
  joinedAt: string;
  avatarHue: number;
  /** Set when an admin creates the account. Seeded demo users have none and accept any password. */
  password?: string;
  /**
   * Payments section. Ignored for admins (they always have access).
   * Employees see Payments only when an admin sets this to true.
   */
  canViewPayments?: boolean;
}

export interface UniAssistFile {
  id: string;
  name: string;
  mime: string;
  size: number;
}

export const BLOCKED_ACCOUNT_OPTIONS = [
  "Yes",
  "No",
  "Not Applied",
  "Applied",
  "In Progress",
  "Account Opened",
  "Funds Deposited",
  "Confirmation Received",
  "Completed",
  "On Hold",
  "Not Required",
] as const;
export type BlockedAccountStatus = (typeof BLOCKED_ACCOUNT_OPTIONS)[number];

export const ENROLLMENT_STATUS_OPTIONS = [
  "Not Applied",
  "Applied",
  "Documents Pending",
  "Awaiting Confirmation",
  "Enrolled",
  "Enrollment Certificate Received",
  "On Hold",
  "Not Required",
] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUS_OPTIONS)[number];

export const STUDENT_DORM_STATUS_OPTIONS = [
  "Not Applied",
  "Applied",
  "Searching",
  "Waiting List",
  "Accommodation Confirmed",
  "Contract Signed",
  "No Availability",
  "Not Required",
] as const;
export type StudentDormStatus = (typeof STUDENT_DORM_STATUS_OPTIONS)[number];

export interface Student {
  id: string;
  name: string;
  email: string;
  phone1: string;
  phone2: string;
  country: Country;
  intake: Intake;
  /** Student Location fields */
  state?: string;
  district?: string;
  villageCity?: string;
  isManualLocation?: boolean;
  branch: string;
  college: string;
  employeeId: string;
  status: ApplicationStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  cgpa: number;
  bachelorsCgpa?: number;
  mastersCgpa?: number;
  referredBy?: string;
  mastersDetails?: string;
  englishTest?: EnglishTest | string;
  englishScore?: number;
  ielts?: number;
  toefl?: number;
  duolingo?: number;
  pte?: number;
  otherEnglishTestName?: string;
  otherEnglishTestScore?: number;
  germanGrade?: number;
  gre?: number;
  germanLanguage: string;
  gmailId: string;
  gmailPassword: string;
  /** Legacy single recovery number */
  recoveryNumber: string;
  /** Three independent recovery numbers */
  recoveryNumber1?: string;
  recoveryNumber2?: string;
  recoveryNumber3?: string;
  /** Three independent recovery gmail addresses */
  recoveryGmail1?: string;
  recoveryGmail2?: string;
  recoveryGmail3?: string;
  device: string;
  twoStep: boolean;
  apsUsername?: string;
  apsPassword?: string;
  apsAppliedBy?: ApsAppliedBy | string;
  uniAssistId?: string;
  uniAssistPassword?: string;
  /** Legacy status kept for older records. New uploads set this from the file list. */
  uniAssistDocuments?: "Uploaded" | "Not Uploaded";
  uniAssistFiles?: UniAssistFile[];
  /** Blocked account status for Germany applications. */
  blockedAccount?: BlockedAccountStatus | string;
  /** Enrollment status for Germany applications. */
  enrollment?: EnrollmentStatus | string;
  /** Student dorm accommodation status for Germany applications. */
  studentDorm?: StudentDormStatus | string;
  /** Employee-managed overall document receipt status (Not Received | Partially Received | Completely Received). */
  documentReceiptStatus?: DocumentReceiptStatus;
  totalFee: number;
  paidAmount: number;
  discount: number;
  leadType: LeadType;
  universityType?: UniversityType | string;
  b2bOrg?: string;
  otherB2bOrg?: string;
  notes: string;
  avatarHue: number;
}

export function getStudentRecoveryNumbers(student?: Partial<Student> | null) {
  if (!student) return { recovery1: "", recovery2: "", recovery3: "" };
  const recovery1 = student.recoveryNumber1 || student.recoveryNumber || "";
  const recovery2 = student.recoveryNumber2 || "";
  const recovery3 = student.recoveryNumber3 || "";
  return { recovery1, recovery2, recovery3 };
}

export function getStudentRecoveryGmails(student?: Partial<Student> | null) {
  if (!student) return { recoveryGmail1: "", recoveryGmail2: "", recoveryGmail3: "" };
  return {
    recoveryGmail1: student.recoveryGmail1 || "",
    recoveryGmail2: student.recoveryGmail2 || "",
    recoveryGmail3: student.recoveryGmail3 || "",
  };
}

export interface University {
  id: string;
  name: string;
  location: string;
  country: Country;
  course: string;
  branch: string;
  intake: Intake;
  ielts: number;
  toefl: number;
  germanLanguage: string;
  gre: string;
  germanGrade: number;
  applicationVia: string;
  applicationFee: number;
  deadline: string;
  tuitionFees: number;
  moi: boolean;
  documentsCourier: string;
  aptitudeTest: string;
  archived: boolean;
}

export interface Application {
  id: string;
  studentId: string;
  universityId: string;
  course: string;
  country: Country;
  status: ApplicationStatus;
  submittedAt?: string;
  offerReceived: boolean;
  deadline: string;
  employeeId: string;
  createdAt: string;
  universityType?: UniversityType | string;
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  totalFee: number;
  initialPayment: number;
  remaining: number;
  discount: number;
  status: PaymentStatus;
  lastPayment?: string;
  method?: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: Country;
  intake: Intake;
  employeeId: string;
  type: LeadType;
  b2bOrg?: string;
  pipeline: LeadPipeline;
  status: string;
  createdAt: string;
  updatedAt: string;
  notes: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  userId: string;
  role: Role | "student";
  action: AuditAction;
  module: string;
  recordId: string;
  before?: string;
  after?: string;
  details: string;
  severity: AuditSeverity;
  ip: string;
  userAgent: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  href: string;
  kind: "student" | "payment" | "application" | "system" | "document";
}

export interface PortalPermissions {
  view: boolean;
  upload: boolean;
  replace: boolean;
  delete: boolean;
  download: boolean;
}

export interface StudentDocument {
  id: string;
  studentId: string;
  name: string;
  type: string;
  category: DocumentCategory;
  fileName?: string;
  fileType?: string;
  fileSize?: string;
  status: DocumentStatus;
  uploadedBy?: string;
  uploadedByRole?: ActorRole;
  uploadedAt?: string;
  updatedAt: string;
  required: boolean;
  priority: DocumentPriority;
  version: number;
  internalNote?: string;
  studentInstruction?: string;
  dueDate?: string;
  universityId?: string;
  universityName?: string;
  course?: string;
  rejectReason?: string;
  rejectNote?: string;
  replacementRequested?: boolean;
  replacementMessage?: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  studentId: string;
  version: number;
  fileName: string;
  fileType: string;
  fileSize: string;
  uploadedBy: string;
  uploadedByRole: ActorRole;
  uploadedAt: string;
}

export interface DocumentActivity {
  id: string;
  documentId: string;
  studentId: string;
  actor: string;
  actorRole: ActorRole;
  action: string;
  detail?: string;
  timestamp: string;
}

export interface StudentDocumentPortal {
  id: string;
  studentId: string;
  accessMethod: PortalAccessMethod;
  email?: string;
  token: string;
  status: PortalStatus;
  expiresAt?: string;
  permissions: PortalPermissions;
  createdAt: string;
  lastAccessedAt?: string;
}

export interface PortalAccessLog {
  id: string;
  portalId: string;
  studentId: string;
  actor: string;
  action: string;
  timestamp: string;
}

export interface WorkItem {
  id: string;
  studentId: string;
  studentName: string;
  task: string;
  priority: Priority;
  deadline: string;
  status: WorkStatus;
  employeeId: string;
}

export interface UniversityShortlist {
  studentId: string;
  universityIds: string[];
  studentMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrgSettings {
  name: string;
  legalName: string;
  timezone: string;
  currency: string;
  twoFactor: boolean;
  sessionTimeout: number;
  loginNotifications: boolean;
  emailAlerts: boolean;
  slackAlerts: boolean;
  auditRetentionDays: number;
  defaultIntake: Intake;
}
