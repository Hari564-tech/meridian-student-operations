import {
  APPLICATION_STATUSES,
  B2B_CONSULTANCIES,
  BRANCH_OPTIONS,
  COUNTRIES,
  INTAKES,
  intakeIdPrefix,
  type Application,
  type ApplicationStatus,
  type AppNotification,
  type AuditEvent,
  type AuditSeverity,
  type Country,
  type Intake,
  type IntakeRecord,
  type B2BConsultancyRecord,
  type Lead,
  type LeadPipeline,
  type OrgSettings,
  type PaymentRecord,
  type PaymentStatus,
  type Student,
  type StudentDocument,
  type StudentDocumentPortal,
  type University,
  type User,
  type WorkItem,
  type DocumentActivity,
  type DocumentStatus,
  type DocumentVersion,
  type PortalAccessLog,
} from "@/lib/types";
import { buildRequirementDocs, DEFAULT_PORTAL_PERMISSIONS } from "@/lib/documents";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pick<T>(r: () => number, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)]!;
}

function pickN<T>(r: () => number, arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(r() * copy.length);
    out.push(copy.splice(idx, 1)[0]!);
  }
  return out;
}

function pad(n: number, w = 3) {
  return String(n).padStart(w, "0");
}

function iso(ms: number) {
  return new Date(ms).toISOString();
}

function phone(r: () => number) {
  const n = 6000000000 + Math.floor(r() * 3999999999);
  const s = String(n);
  return `+91 ${s.slice(0, 5)} ${s.slice(5)}`;
}

function hue(r: () => number) {
  return Math.floor(r() * 360);
}

const FIRST = [
  "Rahul", "Priya", "Ananya", "Vikram", "Sneha", "Arjun", "Kavya", "Rohan", "Divya", "Aditya",
  "Meera", "Karan", "Pooja", "Siddharth", "Ishita", "Nikhil", "Anjali", "Varun", "Shreya", "Manish",
  "Neha", "Aakash", "Harini", "Suresh", "Deepika", "Ravi", "Nisha", "Gaurav", "Aishwarya", "Sanjay",
  "Lakshmi", "Abhinav", "Tanvi", "Harsh", "Keerthi", "Yash", "Sowmya", "Pranav", "Ritika", "Vivek",
];

const LAST = [
  "Kumar", "Sharma", "Reddy", "Singh", "Patel", "Nair", "Iyer", "Mehta", "Krishnan", "Rao",
  "Joshi", "Malhotra", "Desai", "Gupta", "Verma", "Kapoor", "Bansal", "Tiwari", "Chopra", "Agarwal",
  "Menon", "Pillai", "Bhat", "Saxena", "Ghosh", "Das", "Kulkarni", "Jain", "Choudhary", "Pandey",
];

const COLLEGES = [
  "JNTU Hyderabad", "Osmania University", "Andhra University", "VIT Vellore", "SRM Chennai",
  "Anna University", "NIT Warangal", "NIT Trichy", "BITS Hyderabad", "KL University",
  "CBIT Hyderabad", "Vasavi College of Engineering", "CVR College", "Gokaraju Rangaraju",
  "MVSR Engineering", "Chaitanya Bharathi",
];

const DEVICES = ["iPhone 14", "iPhone 15", "Samsung S24", "Pixel 8", "OnePlus 12", "iPad Air", "MacBook Air"];
const AGENTS = [
  "Chrome / macOS", "Chrome / Windows", "Safari / iOS", "Chrome / Android", "Edge / Windows", "Firefox / macOS",
];
const IPS = ["192.168.14.22", "192.168.8.41", "103.210.44.18", "103.77.12.90", "49.37.8.122", "117.192.64.11"];

const UNI_DE = [
  ["Technical University of Munich", "Munich"],
  ["RWTH Aachen University", "Aachen"],
  ["University of Stuttgart", "Stuttgart"],
  ["TU Berlin", "Berlin"],
  ["Heidelberg University", "Heidelberg"],
  ["University of Cologne", "Cologne"],
  ["TU Darmstadt", "Darmstadt"],
  ["University of Hamburg", "Hamburg"],
  ["Karlsruhe Institute of Technology", "Karlsruhe"],
  ["University of Freiburg", "Freiburg"],
  ["TU Dresden", "Dresden"],
  ["University of Bonn", "Bonn"],
];
const UNI_UK = [
  ["University of Manchester", "Manchester"],
  ["University of Birmingham", "Birmingham"],
  ["University of Leeds", "Leeds"],
  ["University of Glasgow", "Glasgow"],
  ["University of Sheffield", "Sheffield"],
  ["King's College London", "London"],
  ["University of Edinburgh", "Edinburgh"],
  ["University of Bristol", "Bristol"],
  ["University of Nottingham", "Nottingham"],
  ["Queen Mary University of London", "London"],
];
const UNI_US = [
  ["Arizona State University", "Tempe"],
  ["Northeastern University", "Boston"],
  ["University of Texas at Dallas", "Dallas"],
  ["New York University", "New York"],
  ["University of Illinois Chicago", "Chicago"],
  ["San Jose State University", "San Jose"],
  ["University of Florida", "Gainesville"],
  ["Boston University", "Boston"],
  ["University of Southern California", "Los Angeles"],
  ["Purdue University", "West Lafayette"],
];

const COURSES: Record<string, string[]> = {
  Mech: ["Mechanical Engineering"],
  EEE: ["Electrical and Electronics Engineering"],
  ECE: ["Electronics and Communication Engineering"],
  CIVIL: ["Civil Engineering"],
  Agriculture: ["Agriculture"],
  BCOM: ["B.Com"],
  BCA: ["BCA"],
  CSE: ["Computer Science and Engineering"],
  "CSE - AI": ["CSE — Artificial Intelligence"],
  "CSE - DS": ["CSE — Data Science"],
  "CSE - AI&ML": ["CSE — AI and Machine Learning"],
  "CSE - AI&DS": ["CSE — AI and Data Science"],
  IT: ["Information Technology"],
  BIOTEC: ["Biotechnology"],
  CHEMISTRY: ["Chemistry"],
  "PHARM C": ["Pharm C"],
  "PHARM D": ["Pharm D"],
};

const TASKS = [
  "Submit Uni-Assist",
  "Collect APS certificate",
  "Upload SOP draft",
  "Follow up on offer",
  "Verify transcripts",
  "Blocked account application",
  "Pay remaining fee",
  "Book visa slot",
  "Courier documents",
  "Update IELTS score",
];

const PIPELINES: LeadPipeline[] = ["New", "Shortlisting", "Applications", "Offer", "Visa"];

function intakePrefix(intake: Intake) {
  return intakeIdPrefix(intake);
}

function weightedStatus(r: () => number): ApplicationStatus {
  const x = r();
  if (x < 0.16) return "Shortlisting Sent";
  if (x < 0.38) return "Applications Started";
  if (x < 0.46) return "Applications on Hold";
  if (x < 0.62) return "Offered";
  if (x < 0.72) return "Waiting";
  if (x < 0.78) return "Deferred";
  if (x < 0.84) return "Dropped";
  if (x < 0.88) return "Private Registered";
  if (x < 0.91) return "Private Shifted";
  if (x < 0.94) return "Still Thinking";
  return "Got Visa";
}

function paymentFromAmounts(total: number, paid: number, discount: number): PaymentStatus {
  if (paid >= total - discount) return "Paid";
  if (paid <= 0) return "Pending";
  if (paid < total * 0.25) return "Overdue";
  return "Partially Paid";
}

export const INITIAL_INTAKES: IntakeRecord[] = [
  { id: "INT-001", name: "October 2026", type: "Monthly", year: 2026, status: "Active", createdAt: "2026-06-29T10:00:00.000Z", updatedAt: "2026-06-29T10:00:00.000Z" },
  { id: "INT-002", name: "November 2026", type: "Monthly", year: 2026, status: "Active", createdAt: "2026-06-29T10:00:00.000Z", updatedAt: "2026-06-29T10:00:00.000Z" },
  { id: "INT-003", name: "December 2026", type: "Monthly", year: 2026, status: "Active", createdAt: "2026-06-29T10:00:00.000Z", updatedAt: "2026-06-29T10:00:00.000Z" },
  { id: "INT-004", name: "January 2027", type: "Monthly", year: 2027, status: "Active", createdAt: "2026-07-29T10:00:00.000Z", updatedAt: "2026-07-29T10:00:00.000Z" },
  { id: "INT-005", name: "February 2027", type: "Monthly", year: 2027, status: "Active", createdAt: "2026-07-29T10:00:00.000Z", updatedAt: "2026-07-29T10:00:00.000Z" },
  { id: "INT-006", name: "March 2027", type: "Monthly", year: 2027, status: "Active", createdAt: "2026-07-29T10:00:00.000Z", updatedAt: "2026-07-29T10:00:00.000Z" },
  { id: "INT-007", name: "April 2027", type: "Monthly", year: 2027, status: "Active", createdAt: "2026-07-29T10:00:00.000Z", updatedAt: "2026-07-29T10:00:00.000Z" },
  { id: "INT-008", name: "May 2027", type: "Monthly", year: 2027, status: "Active", createdAt: "2026-07-29T10:00:00.000Z", updatedAt: "2026-07-29T10:00:00.000Z" },
  { id: "INT-009", name: "June 2027", type: "Monthly", year: 2027, status: "Active", createdAt: "2026-07-29T10:00:00.000Z", updatedAt: "2026-07-29T10:00:00.000Z" },
  { id: "INT-010", name: "July 2027", type: "Monthly", year: 2027, status: "Active", createdAt: "2026-07-29T10:00:00.000Z", updatedAt: "2026-07-29T10:00:00.000Z" },
  { id: "INT-011", name: "August 2027", type: "Monthly", year: 2027, status: "Active", createdAt: "2026-07-29T10:00:00.000Z", updatedAt: "2026-07-29T10:00:00.000Z" },
  { id: "INT-012", name: "September 2027", type: "Monthly", year: 2027, status: "Active", createdAt: "2026-07-29T10:00:00.000Z", updatedAt: "2026-07-29T10:00:00.000Z" },
  { id: "INT-013", name: "October 2027", type: "Monthly", year: 2027, status: "Active", createdAt: "2026-07-29T10:00:00.000Z", updatedAt: "2026-07-29T10:00:00.000Z" },
  { id: "INT-014", name: "November 2027", type: "Monthly", year: 2027, status: "Active", createdAt: "2026-07-29T10:00:00.000Z", updatedAt: "2026-07-29T10:00:00.000Z" },
  { id: "INT-015", name: "December 2027", type: "Monthly", year: 2027, status: "Active", createdAt: "2026-07-29T10:00:00.000Z", updatedAt: "2026-07-29T10:00:00.000Z" },
  { id: "INT-016", name: "Summer 2027", type: "Seasonal", year: 2027, status: "Active", createdAt: "2026-08-28T10:00:00.000Z", updatedAt: "2026-08-28T10:00:00.000Z" },
  { id: "INT-017", name: "Winter 2027", type: "Seasonal", year: 2027, status: "Active", createdAt: "2026-08-28T10:00:00.000Z", updatedAt: "2026-08-28T10:00:00.000Z" },
  { id: "INT-018", name: "Spring 2027", type: "Seasonal", year: 2027, status: "Active", createdAt: "2026-08-28T10:00:00.000Z", updatedAt: "2026-08-28T10:00:00.000Z" },
  { id: "INT-019", name: "Oct 2026", type: "Monthly", year: 2026, status: "Active", createdAt: "2026-06-29T10:00:00.000Z", updatedAt: "2026-06-29T10:00:00.000Z" },
  { id: "INT-020", name: "Nov 2026", type: "Monthly", year: 2026, status: "Active", createdAt: "2026-06-29T10:00:00.000Z", updatedAt: "2026-06-29T10:00:00.000Z" },
  { id: "INT-021", name: "Dec 2026", type: "Monthly", year: 2026, status: "Active", createdAt: "2026-06-29T10:00:00.000Z", updatedAt: "2026-06-29T10:00:00.000Z" },
  { id: "INT-022", name: "Jan 2027", type: "Monthly", year: 2027, status: "Active", createdAt: "2026-07-29T10:00:00.000Z", updatedAt: "2026-07-29T10:00:00.000Z" },
  { id: "INT-023", name: "Feb 2027", type: "Monthly", year: 2027, status: "Active", createdAt: "2026-07-29T10:00:00.000Z", updatedAt: "2026-07-29T10:00:00.000Z" },
  { id: "INT-024", name: "Summer 2026", type: "Seasonal", year: 2026, status: "Archived", createdAt: "2025-12-31T10:00:00.000Z", updatedAt: "2026-07-19T10:00:00.000Z" },
  { id: "INT-025", name: "Winter 2026", type: "Seasonal", year: 2026, status: "Inactive", createdAt: "2026-02-19T10:00:00.000Z", updatedAt: "2026-08-08T10:00:00.000Z" },
];

export const INITIAL_B2B_CONSULTANCIES: B2BConsultancyRecord[] = [
  { id: "B2B-001", name: "ABC Overseas Consultancy", contactPerson: "Rajesh Varma", email: "rajesh@abcoverlink.com", phone: "9848022334", status: "Active", notes: "Key partner for South India student recruitment.", createdAt: "2026-04-30T10:00:00.000Z", updatedAt: "2026-09-27T10:00:00.000Z" },
  { id: "B2B-002", name: "Global Education Consultants", contactPerson: "Sunita Menon", email: "sunita@globaledu.org", phone: "9876543210", status: "Active", notes: "High volume STEM candidate pipeline.", createdAt: "2026-05-30T10:00:00.000Z", updatedAt: "2026-10-07T10:00:00.000Z" },
  { id: "B2B-003", name: "Future Path Overseas", contactPerson: "Vikram Sethi", email: "vikram@futurepath.in", phone: "9988776655", status: "Active", notes: "Focus on Germany and UK universities.", createdAt: "2026-06-29T10:00:00.000Z", updatedAt: "2026-10-12T10:00:00.000Z" },
  { id: "B2B-004", name: "Dream Abroad", contactPerson: "Anil Kapoor", email: "anil@dreamabroad.co", phone: "9123456789", status: "Active", notes: "Established consultancy partner.", createdAt: "2026-04-10T10:00:00.000Z", updatedAt: "2026-10-17T10:00:00.000Z" },
  { id: "B2B-005", name: "AHM", contactPerson: "Mohammed Arif", email: "arif@ahmoverseas.com", phone: "9849112233", status: "Active", notes: "Telangana & AP network.", createdAt: "2026-07-19T10:00:00.000Z", updatedAt: "2026-10-22T10:00:00.000Z" },
  { id: "B2B-006", name: "IOE", contactPerson: "Kavita Rao", email: "kavita@ioe-edu.com", phone: "9440112244", status: "Active", notes: "Europe specialized.", createdAt: "2026-07-29T10:00:00.000Z", updatedAt: "2026-10-22T10:00:00.000Z" },
  { id: "B2B-007", name: "IAS", contactPerson: "Suresh Babu", email: "suresh@iasglobal.in", phone: "9701234567", status: "Active", notes: "Standard institutional agreement.", createdAt: "2026-08-08T10:00:00.000Z", updatedAt: "2026-10-22T10:00:00.000Z" },
  { id: "B2B-008", name: "V FOR", contactPerson: "Pooja Hegde", email: "pooja@vforconsultants.com", phone: "9848123456", status: "Active", createdAt: "2026-08-18T10:00:00.000Z", updatedAt: "2026-10-22T10:00:00.000Z" },
  { id: "B2B-009", name: "KC", contactPerson: "Karthik Chandran", email: "kc@kcedu.com", phone: "9885123456", status: "Active", createdAt: "2026-08-28T10:00:00.000Z", updatedAt: "2026-10-22T10:00:00.000Z" },
  { id: "B2B-010", name: "IEPL", contactPerson: "Dinesh Reddy", email: "dinesh@iepl.in", phone: "9949123456", status: "Active", createdAt: "2026-09-07T10:00:00.000Z", updatedAt: "2026-10-22T10:00:00.000Z" },
  { id: "B2B-011", name: "Easy GO", contactPerson: "Sneha Reddy", email: "sneha@easygo.co.in", phone: "9848765432", status: "Active", createdAt: "2026-09-17T10:00:00.000Z", updatedAt: "2026-10-22T10:00:00.000Z" },
  { id: "B2B-012", name: "VISA AXIS", contactPerson: "Manoj Sharma", email: "manoj@visaaxis.com", phone: "9810123456", status: "Active", createdAt: "2026-09-27T10:00:00.000Z", updatedAt: "2026-10-22T10:00:00.000Z" },
  { id: "B2B-013", name: "SL", contactPerson: "Lakshmi Narayana", email: "info@sloverseas.org", phone: "9848998877", status: "Inactive", notes: "Temporary pause during renewal.", createdAt: "2026-07-29T10:00:00.000Z", updatedAt: "2026-10-17T10:00:00.000Z" },
  { id: "B2B-014", name: "SMART SCHLORS", contactPerson: "Ramesh Gupta", email: "ramesh@smartscholars.in", phone: "9820123456", status: "Archived", notes: "Archived after merger.", createdAt: "2025-12-31T10:00:00.000Z", updatedAt: "2026-08-28T10:00:00.000Z" },
  { id: "B2B-015", name: "Karthi Overseas", contactPerson: "Karthi Sundaram", email: "karthi@karthioverseas.com", phone: "9840123456", status: "Active", createdAt: "2026-10-07T10:00:00.000Z", updatedAt: "2026-10-22T10:00:00.000Z" },
];

export function createSeed(now = Date.now()) {
  const r = rng(26_09_2026);

  const staff = [
    "Nagaraju",
    "Bhavani B",
    "Bhavani K",
    "Bharathi",
    "Sony",
    "Nagamani",
    "Chaitanya",
    "Sravani",
    "Anusha",
    "Sravya",
    "Aruna",
    "Nikhila",
    "Swaroopa",
    "Sunitha",
    "Bhagyalakshmi",
    "Priyanka",
    "Anil",
    "Kartheek",
  ];
  const employees: User[] = [
    { id: "EMP-001", name: "Hari", email: "admin@demo.com", phone: "+91 98480 11001", role: "admin", title: "Administrator", department: "Operations", status: "Active", lastActive: iso(now - 8 * 60000), joinedAt: iso(now - 860 * 86400000), avatarHue: 210 },
    ...staff.map((name, i): User => ({
      id: `EMP-${String(i + 2).padStart(3, "0")}`,
      name,
      email: i === 0 ? "employee@demo.com" : `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "")}@abroadaspirants.com`,
      phone: `+91 98480 ${11002 + i}`,
      role: "employee",
      title: i === 0 ? "Senior Counselor" : "Counselor",
      department: "Admissions",
      status: "Active",
      canViewPayments: false,
      lastActive: iso(now - (12 + i * 18) * 60000),
      joinedAt: iso(now - (640 - i * 24) * 86400000),
      avatarHue: (i * 37 + 12) % 360,
    })),
  ];

  const counselors = employees.filter((e) => e.role === "employee" && e.status === "Active");

  const universities: University[] = [];
  const extraUnis: Array<[string, string, Country]> = [
    ["University of Toronto", "Toronto", "Canada"],
    ["University of British Columbia", "Vancouver", "Canada"],
    ["University of Melbourne", "Melbourne", "Australia"],
    ["University of Sydney", "Sydney", "Australia"],
    ["University of Auckland", "Auckland", "New Zealand"],
    ["University College Dublin", "Dublin", "Ireland"],
    ["Trinity College Dublin", "Dublin", "Ireland"],
    ["TU Wien", "Vienna", "Austria"],
    ["University of Vienna", "Vienna", "Austria"],
    ["Sorbonne University", "Paris", "France"],
    ["Université Paris-Saclay", "Gif-sur-Yvette", "France"],
    ["Politecnico di Milano", "Milan", "Italy"],
    ["University of Bologna", "Bologna", "Italy"],
    ["TU Delft", "Delft", "Netherlands"],
    ["University of Amsterdam", "Amsterdam", "Netherlands"],
    ["KTH Royal Institute of Technology", "Stockholm", "Sweden"],
    ["Lund University", "Lund", "Sweden"],
    ["Aalto University", "Espoo", "Finland"],
    ["University of Helsinki", "Helsinki", "Finland"],
    ["Technical University of Denmark", "Lyngby", "Denmark"],
    ["University of Copenhagen", "Copenhagen", "Denmark"],
    ["University of Oslo", "Oslo", "Norway"],
    ["NTNU", "Trondheim", "Norway"],
    ["KU Leuven", "Leuven", "Belgium"],
    ["Ghent University", "Ghent", "Belgium"],
    ["Universidad Complutense de Madrid", "Madrid", "Spain"],
    ["University of Barcelona", "Barcelona", "Spain"],
    ["Charles University", "Prague", "Czech Republic"],
    ["Czech Technical University", "Prague", "Czech Republic"],
    ["Eötvös Loránd University", "Budapest", "Hungary"],
    ["Budapest University of Technology", "Budapest", "Hungary"],
    ["ETH Zurich", "Zurich", "Switzerland"],
    ["EPFL", "Lausanne", "Switzerland"],
    ["University of Malta", "Msida", "Malta"],
    ["University of Cyprus", "Nicosia", "Cyprus"],
    ["Cyprus University of Technology", "Limassol", "Cyprus"],
  ];
  const uniRows: Array<[string, string, Country]> = [
    ...UNI_DE.map(([n, l]) => [n, l, "Germany"] as [string, string, Country]),
    ...UNI_UK.map(([n, l]) => [n, l, "UK"] as [string, string, Country]),
    ...UNI_US.map(([n, l]) => [n, l, "USA"] as [string, string, Country]),
    ...extraUnis,
  ];
  uniRows.forEach(([name, location, country], i) => {
    const branch = name.includes("Munich") ? "CSE" : BRANCH_OPTIONS[i % BRANCH_OPTIONS.length]!;
    const course = pick(r, COURSES[branch] ?? [branch]);
    const intake = pick(r, INTAKES);
    universities.push({
      id: `UNI-${pad(i + 1)}`,
      name,
      location,
      country,
      course,
      branch,
      intake,
      ielts: country === "Germany" ? pick(r, [6, 6.5, 7]) : pick(r, [6.5, 7, 7.5]),
      toefl: country === "USA" ? pick(r, [80, 90, 100]) : pick(r, [72, 79, 88, 94]),
      germanLanguage: country === "Germany" ? pick(r, ["A2", "B1", "B2"]) : "None",
      gre: country === "USA" ? pick(r, ["Optional", "300+", "310+", "Not required"]) : "Not required",
      germanGrade: country === "Germany" ? Number((1.8 + r() * 1.4).toFixed(1)) : 2.5,
      applicationVia: country === "Germany" ? pick(r, ["Uni-Assist", "Direct", "Hochschulstart"]) : country === "UK" ? "UCAS / Direct" : "University portal",
      applicationFee: country === "Germany" ? pick(r, [0, 75, 100]) : country === "UK" ? pick(r, [0, 28, 60]) : pick(r, [50, 75, 85, 125]),
      deadline: iso(now + (20 + Math.floor(r() * 140)) * 86400000),
      tuitionFees: country === "Germany" ? pick(r, [0, 3000, 4500, 12000, 18000]) * 90 : country === "UK" ? pick(r, [18000, 22000, 26500, 31000]) * 105 : pick(r, [28000, 34000, 42000, 52000]) * 83,
      moi: r() > 0.35,
      documentsCourier: country === "Germany" ? pick(r, ["Required", "Not required", "After offer"]) : "Not required",
      aptitudeTest: country === "USA" ? pick(r, ["GRE optional", "None"]) : country === "Germany" ? pick(r, ["None", "TestAS optional"]) : "None",
      archived: i === uniRows.length - 1,
    });
  });

  const featured = ["Rahul Kumar", "Priya Sharma", "Ananya Reddy", "Vikram Singh", "Sneha Patel", "Arjun Nair"];
  const names: string[] = [...featured];
  const used = new Set(featured);
  while (names.length < 72) {
    const n = `${pick(r, FIRST)} ${pick(r, LAST)}`;
    if (!used.has(n)) {
      used.add(n);
      names.push(n);
    }
  }

  const counters: Record<string, number> = { OCT26: 1 };
  const students: Student[] = names.map((name, i) => {
    const country: Country = COUNTRIES[i % COUNTRIES.length]!;
    const intake: Intake = i === 0 ? "Oct 2026" : pick(r, INTAKES);
    const prefix = intakePrefix(intake);
    let id: string;
    if (i === 0) {
      id = "OCT26_001";
    } else {
      counters[prefix] = (counters[prefix] ?? 0) + 1;
      id = `${prefix}_${pad(counters[prefix]!)}`;
    }
    const status = i < 6
      ? (["Applications Started", "Offered", "Got Visa", "Waiting", "Shortlisting Sent", "Applications Started"][i] as ApplicationStatus)
      : weightedStatus(r);
    const branch = pick(r, BRANCH_OPTIONS);
    const totalFee = pick(r, [75000, 85000, 100000, 120000, 150000]);
    const discount = r() > 0.7 ? pick(r, [5000, 8000, 10000, 15000]) : 0;
    const paidRatio = status === "Dropped" ? r() * 0.2 : 0.2 + r() * 0.8;
    const paidAmount = Math.min(totalFee - discount, Math.round((totalFee * paidRatio) / 1000) * 1000);
    const employee = i < 12 ? counselors[1 % counselors.length] : pick(r, counselors);
    // First 12 students assigned to Nagaraju so the employee demo is rich
    const assigned = i < 12 ? employees.find((e) => e.id === "EMP-002")! : employee!;
    const createdAt = now - Math.floor((20 + r() * 250) * 86400000);
    const updatedAt = now - Math.floor(r() * 12 * 86400000);
    const LOCATIONS = [
      { state: "Andhra Pradesh", district: "Guntur", villageCity: "Repalle" },
      { state: "Andhra Pradesh", district: "Krishna", villageCity: "Vijayawada" },
      { state: "Telangana", district: "Hyderabad", villageCity: "Ameerpet" },
      { state: "Telangana", district: "Rangareddy", villageCity: "Shamshabad" },
      { state: "Karnataka", district: "Bengaluru Urban", villageCity: "Koramangala" },
      { state: "Tamil Nadu", district: "Chennai", villageCity: "Adyar" },
      { state: "Maharashtra", district: "Pune", villageCity: "Kothrud" },
      { state: "Delhi", district: "New Delhi", villageCity: "Connaught Place" },
      { state: "Gujarat", district: "Ahmedabad", villageCity: "Navrangpura" },
      { state: "Kerala", district: "Ernakulam", villageCity: "Kochi" },
    ];
    const loc = LOCATIONS[i % LOCATIONS.length]!;
    const slug = name.toLowerCase().replaceAll(" ", ".");
    const germany = country === "Germany";
    const rec1 = phone(r);
    const rec2 = r() > 0.4 ? phone(r) : undefined;
    const rec3 = r() > 0.7 ? phone(r) : undefined;
    const cgpaVal = Number((6.8 + r() * 2.6).toFixed(2));
    return {
      id,
      name,
      email: `${slug}@gmail.com`,
      phone1: phone(r),
      phone2: r() > 0.55 ? phone(r) : "",
      country,
      intake,
      state: loc.state,
      district: loc.district,
      villageCity: loc.villageCity,
      branch,
      college: pick(r, COLLEGES),
      referredBy: r() > 0.6 ? pick(r, ["Venkat Rao", "Kiran Mai", "Sunil Reddy", "B2B Partner"]) : undefined,
      mastersDetails: r() > 0.7 ? "M.Tech in Software Engineering" : undefined,
      employeeId: assigned.id,
      status,
      paymentStatus: paymentFromAmounts(totalFee, paidAmount, discount),
      createdAt: iso(createdAt),
      updatedAt: iso(Math.max(createdAt, updatedAt)),
      cgpa: cgpaVal,
      bachelorsCgpa: cgpaVal,
      mastersCgpa: r() > 0.8 ? Number((7.2 + r() * 2.3).toFixed(2)) : undefined,
      ielts: r() > 0.15 ? Number((6 + r() * 2.5).toFixed(1)) : undefined,
      toefl: country === "USA" || r() > 0.7 ? Math.round(78 + r() * 30) : undefined,
      duolingo: r() > 0.8 ? Math.round(105 + r() * 40) : undefined,
      germanGrade: germany ? Number((1.6 + r() * 1.8).toFixed(1)) : undefined,
      gre: country === "USA" && r() > 0.4 ? Math.round(300 + r() * 28) : undefined,
      germanLanguage: germany ? pick(r, ["A1", "A2", "B1", "B2"]) : "None",
      gmailId: `${slug}@gmail.com`,
      gmailPassword: `AbroadAspirants!${pad(i + 11, 2)}`,
      recoveryNumber: rec1,
      recoveryNumber1: rec1,
      recoveryNumber2: rec2,
      recoveryNumber3: rec3,
      recoveryGmail1: `recovery.${slug}@gmail.com`,
      recoveryGmail2: r() > 0.5 ? `backup.${slug}@gmail.com` : undefined,
      recoveryGmail3: r() > 0.8 ? `alt.${slug}@gmail.com` : undefined,
      device: pick(r, DEVICES),
      twoStep: r() > 0.35,
      apsUsername: germany ? `aps.${slug.split(".")[0]}` : undefined,
      apsPassword: germany ? `Aps#${pad(i + 21, 2)}` : undefined,
      uniAssistId: germany ? `UA${800000 + i}` : undefined,
      uniAssistPassword: germany ? `Ua@${pad(i + 31, 2)}` : undefined,
      uniAssistDocuments: germany ? (r() > 0.4 ? "Uploaded" : "Not Uploaded") : undefined,
      blockedAccount: germany ? (r() > 0.55 ? "Yes" : "Not Applied") : undefined,
      enrollment: germany ? (status === "Got Visa" || r() > 0.75 ? "Enrolled" : (r() > 0.5 ? "Applied" : "Not Applied")) : undefined,
      studentDorm: germany ? (r() > 0.7 ? "Accommodation Confirmed" : (r() > 0.4 ? "Applied" : "Not Applied")) : undefined,
      totalFee,
      paidAmount,
      discount,
      leadType: r() > 0.78 ? "B2B" : "Direct",
      b2bOrg: undefined,
      notes: "",
      avatarHue: hue(r),
    } satisfies Student;
  });

  const rahul = students[0];
  if (rahul) {
    const clash = students.findIndex((s, i) => i !== 0 && s.id === "OCT26_001");
    if (clash >= 0) students[clash]!.id = `OCT26_${pad(90 + clash)}`;
    Object.assign(rahul, {
      id: "OCT26_001",
      name: "Rahul Kumar",
      email: "rahul.kumar@gmail.com",
      gmailId: "rahul.kumar@gmail.com",
      country: "Germany",
      intake: "Oct 2026",
      state: "Andhra Pradesh",
      district: "Guntur",
      villageCity: "Repalle",
      recoveryNumber: "9848022338",
      recoveryNumber1: "9848022338",
      recoveryNumber2: "9876543210",
      recoveryNumber3: "9123456780",
      branch: "CSE",
      employeeId: "EMP-002",
      status: "Applications Started",
    } satisfies Partial<Student>);
  }

  students.forEach((s) => {
    if (s.leadType === "B2B") {
      s.b2bOrg = pick(r, B2B_CONSULTANCIES);
    }
  });

  const applications: Application[] = [];
  let appN = 1;
  students.forEach((s) => {
    const pool = universities.filter((u) => u.country === s.country && !u.archived);
    const tum = universities.find((u) => u.name.includes("Munich"));
    const count = 1 + Math.floor(r() * 3);
    let chosen = pickN(r, pool, Math.min(count, pool.length));
    if (s.id === "OCT26_001" && tum) {
      chosen = [tum, ...chosen.filter((u) => u.id !== tum.id)].slice(0, Math.max(2, chosen.length));
    }
    chosen.forEach((u, idx) => {
      const submitted = s.status !== "Shortlisting Sent" && s.status !== "Still Thinking";
      applications.push({
        id: `APP-${pad(appN++, 4)}`,
        studentId: s.id,
        universityId: u.id,
        course: u.course,
        country: u.country,
        status: idx === 0 ? s.status : pick(r, APPLICATION_STATUSES),
        submittedAt: submitted ? iso(now - Math.floor(r() * 60) * 86400000) : undefined,
        offerReceived: s.status === "Offered" || s.status === "Got Visa" || s.status === "Waiting" ? idx === 0 : r() > 0.85,
        deadline: u.deadline,
        employeeId: s.employeeId,
        createdAt: s.createdAt,
      });
    });
  });

  const payments: PaymentRecord[] = students.map((s, i) => ({
    id: `PAY-${pad(i + 1, 3)}`,
    studentId: s.id,
    totalFee: s.totalFee,
    initialPayment: Math.min(s.paidAmount, Math.round(s.totalFee * 0.4)),
    remaining: Math.max(0, s.totalFee - s.discount - s.paidAmount),
    discount: s.discount,
    status: s.paymentStatus,
    lastPayment: s.paidAmount > 0 ? s.updatedAt : undefined,
    method: s.paidAmount > 0 ? pick(r, ["UPI", "NEFT", "Card", "Cash"]) : undefined,
  }));

  const leads: Lead[] = Array.from({ length: 32 }, (_, i) => {
    const name = `${pick(r, FIRST)} ${pick(r, LAST)}`;
    const pipeline = pick(r, PIPELINES);
    const type = r() > 0.7 ? "B2B" : "Direct";
    const created = now - Math.floor(r() * 40) * 86400000;
    return {
      id: `LD-${pad(i + 1, 3)}`,
      name,
      email: `${name.toLowerCase().replaceAll(" ", ".")}@gmail.com`,
      phone: phone(r),
      country: pick(r, COUNTRIES),
      intake: pick(r, INTAKES),
      employeeId: i < 6 ? "EMP-002" : pick(r, counselors).id,
      type,
      b2bOrg: type === "B2B" ? pick(r, B2B_CONSULTANCIES) : undefined,
      pipeline,
      status: pipeline,
      createdAt: iso(created),
      updatedAt: iso(created + Math.floor(r() * 8) * 86400000),
      notes: "",
    };
  });

  const documents: StudentDocument[] = [];
  const documentVersions: DocumentVersion[] = [];
  const documentActivities: DocumentActivity[] = [];
  const portals: StudentDocumentPortal[] = [];
  const portalAccessLogs: PortalAccessLog[] = [];
  let docN = 1;
  let verN = 1;
  let actN = 1;

  const tum = universities.find((u) => u.name.includes("Munich")) ?? universities.find((u) => u.country === "Germany");

  function pushActivity(
    documentId: string,
    studentId: string,
    actor: string,
    actorRole: DocumentActivity["actorRole"],
    action: string,
    timestamp: string,
    detail?: string,
  ) {
    documentActivities.push({
      id: `DA-${pad(actN++, 4)}`,
      documentId,
      studentId,
      actor,
      actorRole,
      action,
      detail,
      timestamp,
    });
  }

  students.forEach((s, si) => {
    const extras =
      s.id === "OCT26_001" && tum
        ? [{ type: "SOP", required: true, universityId: tum.id, universityName: tum.name, course: tum.course }]
        : s.country === "Germany" && tum && r() > 0.72
          ? [{ type: "SOP", required: true, universityId: tum.id, universityName: tum.name, course: tum.course }]
          : [];
    const reqs = buildRequirementDocs(s, extras, iso(now));
    reqs.forEach((req, ri) => {
      const id = `DOC-${pad(docN++, 4)}`;
      let status: DocumentStatus = "pending";
      let uploadedBy: string | undefined;
      let uploadedByRole: StudentDocument["uploadedByRole"];
      let uploadedAt: string | undefined;
      let fileName: string | undefined;
      let fileType: string | undefined;
      let fileSize: string | undefined;
      let version = 0;
      const due =
        ri % 4 === 1 ? iso(now + (3 + Math.floor(r() * 18)) * 86400000) : ri % 7 === 0 ? iso(now - 2 * 86400000) : undefined;

      if (s.id === "OCT26_001") {
        const script: Array<{ status: DocumentStatus; by: "Nagaraju" | "Rahul Kumar"; role: "employee" | "student"; days: number }> = [
          { status: "verified", by: "Nagaraju", role: "employee", days: 0 },
          { status: "under_review", by: "Rahul Kumar", role: "student", days: 0 },
          { status: "verified", by: "Nagaraju", role: "employee", days: 1 },
          { status: "pending", by: "Nagaraju", role: "employee", days: 0 },
          { status: "uploaded", by: "Nagaraju", role: "employee", days: 2 },
          { status: "under_review", by: "Rahul Kumar", role: "student", days: 0 },
          { status: "verified", by: "Nagaraju", role: "employee", days: 3 },
          { status: "verified", by: "Nagaraju", role: "employee", days: 4 },
          { status: "pending", by: "Nagaraju", role: "employee", days: 0 },
          { status: "verified", by: "Nagaraju", role: "employee", days: 5 },
          { status: "verified", by: "Nagaraju", role: "employee", days: 6 },
          { status: "uploaded", by: "Rahul Kumar", role: "student", days: 0 },
          { status: "pending", by: "Nagaraju", role: "employee", days: 0 },
        ];
        const row = script[ri] ?? { status: "pending" as const, by: "Nagaraju" as const, role: "employee" as const, days: 0 };
        status = row.status;
        if (status !== "pending") {
          uploadedBy = row.by;
          uploadedByRole = row.role;
          uploadedAt = iso(now - row.days * 86400000 - 90 * 60000);
          fileName = `${req.type.replaceAll(" ", "-")}.pdf`;
          fileType = "application/pdf";
          fileSize = `${(0.6 + r() * 2.4).toFixed(1)} MB`;
          version = req.type === "Passport" ? 2 : 1;
        }
      } else {
        const roll = r();
        if (roll > 0.22) {
          status = roll > 0.72 ? "verified" : roll > 0.5 ? "under_review" : roll > 0.38 ? "uploaded" : roll > 0.3 ? "rejected" : "uploaded";
          uploadedBy = r() > 0.55 ? s.name : employees.find((e) => e.id === s.employeeId)?.name ?? "Nagaraju";
          uploadedByRole = uploadedBy === s.name ? "student" : "employee";
          uploadedAt = iso(now - Math.floor(r() * 40) * 86400000);
          fileName = `${req.type.replaceAll(" ", "-")}.${r() > 0.85 ? "jpg" : "pdf"}`;
          fileType = fileName.endsWith(".jpg") ? "image/jpeg" : "application/pdf";
          fileSize = `${(0.4 + r() * 3.6).toFixed(1)} MB`;
          version = 1;
        } else if (r() > 0.92) {
          status = "expired";
        }
      }

      const doc: StudentDocument = {
        ...req,
        id,
        status,
        uploadedBy,
        uploadedByRole,
        uploadedAt,
        fileName,
        fileType,
        fileSize,
        version,
        dueDate: due,
        rejectReason: status === "rejected" ? "Document unclear" : undefined,
        updatedAt: uploadedAt ?? req.updatedAt,
      };
      documents.push(doc);

      if (version > 0 && fileName) {
        for (let v = 1; v <= version; v++) {
          documentVersions.push({
            id: `VER-${pad(verN++, 4)}`,
            documentId: id,
            studentId: s.id,
            version: v,
            fileName,
            fileType: fileType ?? "application/pdf",
            fileSize: fileSize ?? "1.0 MB",
            uploadedBy: v === version ? (uploadedBy ?? "Nagaraju") : "Nagaraju",
            uploadedByRole: v === version ? (uploadedByRole ?? "employee") : "employee",
            uploadedAt: iso((uploadedAt ? new Date(uploadedAt).getTime() : now) - (version - v) * 86400000),
          });
        }
        pushActivity(id, s.id, uploadedBy ?? "Nagaraju", uploadedByRole ?? "employee", "uploaded document", uploadedAt ?? iso(now), fileName);
        if (status === "verified") {
          pushActivity(id, s.id, "Nagaraju", "employee", "verified document", iso(now - 45 * 60000));
        }
        if (status === "rejected") {
          pushActivity(id, s.id, "Nagaraju", "employee", "rejected document", iso(now - 20 * 60000), "Document unclear");
        }
      }
    });

    if (s.id === "OCT26_001" || (si < 10 && r() > 0.35)) {
      const token = s.id === "OCT26_001" ? "Ab92Xk7Pq82Lm" : `Tk${pad(si, 3)}${Math.floor(r() * 90000 + 10000)}`;
      const portal: StudentDocumentPortal = {
        id: `PRT-${pad(si + 1, 3)}`,
        studentId: s.id,
        accessMethod: s.id === "OCT26_001" ? "email_and_link" : r() > 0.5 ? "link_only" : "email_and_link",
        email: s.email,
        token,
        status: "active",
        expiresAt: iso(now + 7 * 86400000),
        permissions: { ...DEFAULT_PORTAL_PERMISSIONS },
        createdAt: iso(now - 2 * 86400000),
        lastAccessedAt: s.id === "OCT26_001" ? iso(now - 28 * 60000) : undefined,
      };
      portals.push(portal);
      if (s.id === "OCT26_001") {
        portalAccessLogs.push(
          { id: "PAL-001", portalId: portal.id, studentId: s.id, actor: s.name, action: "accessed portal", timestamp: iso(now - 28 * 60000) },
          { id: "PAL-002", portalId: portal.id, studentId: s.id, actor: s.name, action: "uploaded Transcript.pdf", timestamp: iso(now - 26 * 60000) },
          { id: "PAL-003", portalId: portal.id, studentId: s.id, actor: s.name, action: "uploaded Passport.pdf", timestamp: iso(now - 23 * 60000) },
        );
      }
    }
  });

  const workItems: WorkItem[] = [];
  const nagarajuStudents = students.filter((s) => s.employeeId === "EMP-002");
  nagarajuStudents.slice(0, 8).forEach((s, i) => {
    workItems.push({
      id: `WQ-${pad(i + 1, 3)}`,
      studentId: s.id,
      studentName: s.name,
      task: TASKS[i % TASKS.length]!,
      priority: i < 3 ? "High" : i < 6 ? "Medium" : "Low",
      deadline: iso(now + (i - 1) * 86400000),
      status: i === 2 ? "In Progress" : "Pending",
      employeeId: "EMP-002",
    });
  });
  students.filter((s) => s.employeeId !== "EMP-002").slice(0, 10).forEach((s, i) => {
    workItems.push({
      id: `WQ-${pad(i + 20, 3)}`,
      studentId: s.id,
      studentName: s.name,
      task: pick(r, TASKS),
      priority: pick(r, ["High", "Medium", "Low"] as const),
      deadline: iso(now + Math.floor(r() * 10 - 2) * 86400000),
      status: "Pending",
      employeeId: s.employeeId,
    });
  });

  const auditEvents: AuditEvent[] = [];
  const modules = ["Students", "Applications", "Payments", "Universities", "Employees", "Leads", "Reports"];
  const actions = [
    { action: "CREATE" as const, severity: "SUCCESS" as AuditSeverity, details: "Created student" },
    { action: "STATUS_CHANGE" as const, severity: "WARNING" as AuditSeverity, details: "Updated application status" },
    { action: "PAYMENT_UPDATE" as const, severity: "WARNING" as AuditSeverity, details: "Recorded payment" },
    { action: "UPDATE" as const, severity: "INFO" as AuditSeverity, details: "Updated student profile" },
    { action: "UNIVERSITY_UPDATE" as const, severity: "INFO" as AuditSeverity, details: "Updated university record" },
    { action: "EMPLOYEE_ASSIGN" as const, severity: "INFO" as AuditSeverity, details: "Reassigned counselor" },
    { action: "LOGIN" as const, severity: "INFO" as AuditSeverity, details: "Signed in" },
    { action: "EXPORT" as const, severity: "INFO" as AuditSeverity, details: "Exported report" },
    { action: "DELETE" as const, severity: "CRITICAL" as AuditSeverity, details: "Deleted draft record" },
    { action: "VIEW" as const, severity: "INFO" as AuditSeverity, details: "Viewed student credentials" },
  ];

  for (let i = 0; i < 220; i++) {
    const actor = i % 17 === 0 ? employees[0]! : pick(r, counselors);
    const student = pick(r, students);
    const spec = pick(r, actions);
    const ts = now - Math.floor(r() * (i < 48 ? 16 : 30 * 24) * 3600000);
    const before = spec.action === "STATUS_CHANGE" ? pick(r, APPLICATION_STATUSES) : spec.action === "PAYMENT_UPDATE" ? "Pending" : undefined;
    const after = spec.action === "STATUS_CHANGE" ? student.status : spec.action === "PAYMENT_UPDATE" ? student.paymentStatus : undefined;
    auditEvents.push({
      id: `AUD-${800000 + i}`,
      timestamp: iso(ts),
      user: actor.name,
      userId: actor.id,
      role: actor.role,
      action: spec.action,
      module: spec.action === "LOGIN" ? "Auth" : spec.action === "UNIVERSITY_UPDATE" ? "Universities" : spec.action === "EXPORT" ? "Reports" : pick(r, modules),
      recordId: spec.action === "LOGIN" ? actor.id : student.id,
      before,
      after,
      details: spec.details,
      severity: spec.severity,
      ip: pick(r, IPS),
      userAgent: pick(r, AGENTS),
    });
  }
  auditEvents.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  // Pin a few highly readable recent events
  auditEvents.unshift(
    {
      id: "AUD-DOC-1",
      timestamp: iso(now - 23 * 60000),
      user: "Rahul Kumar",
      userId: "OCT26_001",
      role: "student",
      action: "STUDENT_UPLOADED_DOCUMENT",
      module: "Documents",
      recordId: "OCT26_001",
      details: "Uploaded document Transcript.pdf",
      after: "under_review",
      severity: "SUCCESS",
      ip: "49.37.8.122",
      userAgent: "Chrome / Android",
    },
    {
      id: "AUD-DOC-2",
      timestamp: iso(now - 15 * 60000),
      user: "Nagaraju",
      userId: "EMP-002",
      role: "employee",
      action: "PORTAL_CREATED",
      module: "Documents",
      recordId: "OCT26_001",
      details: "Created student upload portal · Access: Email + Link",
      after: "email_and_link",
      severity: "SUCCESS",
      ip: "192.168.14.22",
      userAgent: "Chrome / Android",
    },
    {
      id: "AUD-DOC-3",
      timestamp: iso(now - 45 * 60000),
      user: "Nagaraju",
      userId: "EMP-002",
      role: "employee",
      action: "DOCUMENT_VERIFIED",
      module: "Documents",
      recordId: "OCT26_001",
      details: "Verified Passport.pdf",
      before: "under_review",
      after: "verified",
      severity: "SUCCESS",
      ip: "192.168.14.22",
      userAgent: "Chrome / Android",
    },
    {
      id: "AUD-DOC-4",
      timestamp: iso(now - 70 * 60000),
      user: "Priya Sharma",
      userId: students[1]!.id,
      role: "student",
      action: "STUDENT_REPLACED_DOCUMENT",
      module: "Documents",
      recordId: students[1]!.id,
      details: "Replaced Passport.pdf",
      before: "rejected",
      after: "under_review",
      severity: "INFO",
      ip: "103.210.44.18",
      userAgent: "Chrome / Windows",
    },
    {
      id: "AUD-829182",
      timestamp: iso(now - 15 * 60000),
      user: "Nagaraju",
      userId: "EMP-002",
      role: "employee",
      action: "STATUS_CHANGE",
      module: "Students",
      recordId: students[0]!.id,
      before: "Applications Started",
      after: "Offered",
      details: "Updated student status",
      severity: "WARNING",
      ip: "192.168.14.22",
      userAgent: "Chrome / Android",
    },
    {
      id: "AUD-829183",
      timestamp: iso(now - 29 * 60000),
      user: "Priya Sharma",
      userId: "EMP-003",
      role: "employee",
      action: "CREATE",
      module: "Students",
      recordId: students[1]!.id,
      details: "Registered a new student",
      severity: "SUCCESS",
      ip: "103.210.44.18",
      userAgent: "Chrome / Windows",
    },
    {
      id: "AUD-829184",
      timestamp: iso(now - 63 * 60000),
      user: "Hari",
      userId: "EMP-001",
      role: "admin",
      action: "UNIVERSITY_UPDATE",
      module: "Universities",
      recordId: universities[0]!.id,
      details: "Updated university eligibility data",
      severity: "INFO",
      ip: "192.168.8.41",
      userAgent: "Chrome / macOS",
    },
  );

  const notifications: AppNotification[] = [
    { id: "NT-1", title: "New student registered", body: `${students[1]!.name} was added to ${students[1]!.intake}.`, timestamp: iso(now - 18 * 60000), read: false, href: `/admin/students/${students[1]!.id}`, kind: "student" },
    { id: "NT-2", title: "Payment pending", body: `Balance remaining for ${students[0]!.name}.`, timestamp: iso(now - 42 * 60000), read: false, href: `/admin/payments`, kind: "payment" },
    { id: "NT-3", title: "Application deadline approaching", body: `${universities[2]!.name} deadline is in 6 days.`, timestamp: iso(now - 2 * 3600000), read: false, href: `/admin/universities`, kind: "application" },
    { id: "NT-4", title: "Offer received", body: `${students[0]!.name} received an offer.`, timestamp: iso(now - 5 * 3600000), read: false, href: `/admin/students/${students[0]!.id}`, kind: "application" },
    { id: "NT-5", title: "Status changed", body: `Nagaraju updated ${students[0]!.id} to Offered.`, timestamp: iso(now - 15 * 60000), read: false, href: `/admin/audit`, kind: "student" },
    { id: "NT-6", title: "Visa received", body: `${students[2]!.name} received a visa.`, timestamp: iso(now - 26 * 3600000), read: false, href: `/admin/students/${students[2]!.id}`, kind: "application" },
    { id: "NT-7", title: "Overdue payment", body: `A student payment marked overdue needs review.`, timestamp: iso(now - 30 * 3600000), read: false, href: `/admin/payments`, kind: "payment" },
    { id: "NT-8", title: "University data updated", body: "TUM eligibility thresholds were revised.", timestamp: iso(now - 2 * 86400000), read: true, href: `/admin/universities`, kind: "system" },
    { id: "NT-9", title: "Weekly report ready", body: "Employee performance report is available to export.", timestamp: iso(now - 3 * 86400000), read: true, href: `/admin/reports`, kind: "system" },
    { id: "NT-10", title: "Rahul uploaded Transcript.pdf", body: "A student upload is waiting for review.", timestamp: iso(now - 26 * 60000), read: false, href: `/admin/students/OCT26_001`, kind: "document" },
    { id: "NT-11", title: "Priya replaced Passport.pdf", body: "A replacement file was submitted.", timestamp: iso(now - 70 * 60000), read: false, href: `/admin/students/${students[1]!.id}`, kind: "document" },
    { id: "NT-12", title: "A document request is overdue", body: "SOP for Rahul Kumar is past its due date.", timestamp: iso(now - 3 * 3600000), read: false, href: `/admin/documents`, kind: "document" },
    { id: "NT-13", title: "Student portal expires tomorrow", body: "Rahul Kumar’s upload portal expires in 24 hours.", timestamp: iso(now - 5 * 3600000), read: false, href: `/admin/students/OCT26_001`, kind: "document" },
    { id: "NT-14", title: "Student completed document submission", body: `${students[2]!.name} submitted all requested documents.`, timestamp: iso(now - 9 * 3600000), read: false, href: `/admin/students/${students[2]!.id}`, kind: "document" },
    { id: "NT-15", title: "Document rejected by Nagaraju", body: "A document was rejected and a replacement was requested.", timestamp: iso(now - 11 * 3600000), read: false, href: `/admin/documents`, kind: "document" },
  ];

  const settings: OrgSettings = {
    name: "Abroad Aspirants",
    legalName: "Abroad Aspirants Pvt. Ltd.",
    timezone: "Asia/Kolkata",
    currency: "INR",
    twoFactor: false,
    sessionTimeout: 30,
    loginNotifications: true,
    emailAlerts: true,
    slackAlerts: false,
    auditRetentionDays: 90,
    defaultIntake: "Oct 2026",
  };

  return {
    employees,
    students,
    universities,
    applications,
    payments,
    leads,
    documents,
    documentVersions,
    documentActivities,
    portals,
    portalAccessLogs,
    workItems,
    auditEvents,
    notifications,
    settings,
    intakes: [...INITIAL_INTAKES],
    b2bConsultancies: [...INITIAL_B2B_CONSULTANCIES],
  };
}

export type SeedData = ReturnType<typeof createSeed>;
