import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

describe("Admin Intake, B2B Consultancy, Student Location & Recovery Numbers", () => {
  test("src/lib/types.ts defines all required models and helpers", () => {
    const typesPath = path.join(root, "src/lib/types.ts");
    assert.ok(fs.existsSync(typesPath), "src/lib/types.ts must exist");
    const content = fs.readFileSync(typesPath, "utf-8");

    // Intake types
    assert.ok(content.includes("INTAKE_TYPES"), "types.ts must define INTAKE_TYPES");
    assert.ok(content.includes("INTAKE_STATUSES"), "types.ts must define INTAKE_STATUSES");
    assert.ok(content.includes("export interface IntakeRecord"), "types.ts must define IntakeRecord");

    // B2B types
    assert.ok(content.includes("B2B_CONSULTANCY_STATUSES"), "types.ts must define B2B_CONSULTANCY_STATUSES");
    assert.ok(content.includes("export interface B2BConsultancyRecord"), "types.ts must define B2BConsultancyRecord");

    // Student fields
    assert.ok(content.includes("state?: string;"), "Student must include state");
    assert.ok(content.includes("district?: string;"), "Student must include district");
    assert.ok(content.includes("villageCity?: string;"), "Student must include villageCity");
    assert.ok(content.includes("isManualLocation?: boolean;"), "Student must include isManualLocation");
    assert.ok(content.includes("recoveryNumber1?: string;"), "Student must include recoveryNumber1");
    assert.ok(content.includes("recoveryNumber2?: string;"), "Student must include recoveryNumber2");
    assert.ok(content.includes("recoveryNumber3?: string;"), "Student must include recoveryNumber3");
    assert.ok(content.includes("otherB2bOrg?: string;"), "Student must include otherB2bOrg");

    // getStudentRecoveryNumbers helper
    assert.ok(content.includes("export function getStudentRecoveryNumbers"), "types.ts must export getStudentRecoveryNumbers");
    assert.ok(content.includes("export function toTenDigits"), "types.ts must export toTenDigits");
    assert.ok(content.includes("export function isTenDigitPhone"), "types.ts must export isTenDigitPhone");
  });

  test("getStudentRecoveryNumbers provides backward-compatible fallback for legacy students", async () => {
    const { getStudentRecoveryNumbers, toTenDigits, isTenDigitPhone } = await import("../src/lib/types.ts");

    // Case 1: Legacy student with single recoveryNumber
    const legacy = { recoveryNumber: "9876543210" };
    const res1 = getStudentRecoveryNumbers(legacy);
    assert.equal(res1.recovery1, "9876543210", "Legacy recoveryNumber maps to recovery1");
    assert.equal(res1.recovery2, "", "recovery2 defaults to empty string");
    assert.equal(res1.recovery3, "", "recovery3 defaults to empty string");

    // Case 2: Modern student with 3 recovery numbers
    const modern = {
      recoveryNumber1: "9848022338",
      recoveryNumber2: "9876543210",
      recoveryNumber3: "9123456780",
    };
    const res2 = getStudentRecoveryNumbers(modern);
    assert.equal(res2.recovery1, "9848022338");
    assert.equal(res2.recovery2, "9876543210");
    assert.equal(res2.recovery3, "9123456780");

    // Case 3: 10-digit validation and sanitization
    assert.equal(toTenDigits("9848022338"), "9848022338");
    assert.equal(toTenDigits("+91 9848022338"), "9848022338");
    assert.equal(toTenDigits("919848022338"), "9848022338");
    assert.ok(isTenDigitPhone("9848022338"));
    assert.ok(isTenDigitPhone("+91-98480-22338"));
    assert.ok(!isTenDigitPhone("12345"));
    assert.ok(!isTenDigitPhone(""));
  });

  test("locationService supports hierarchical lookup for India with caching", async () => {
    const { locationService, INDIA_LOCATION_DATA } = await import("../src/lib/location-data.ts");

    // Check dataset coverage
    assert.ok(INDIA_LOCATION_DATA.states.includes("Andhra Pradesh"), "Andhra Pradesh must be present");
    assert.ok(INDIA_LOCATION_DATA.districtsByState["Andhra Pradesh"].includes("Guntur"), "Guntur district must be present");
    assert.ok(
      INDIA_LOCATION_DATA.villagesByDistrict["Guntur"].includes("Repalle"),
      "Repalle must be present in Guntur",
    );

    // States lookup
    const states = await locationService.getStates("India");
    assert.ok(states.length > 20, "Should return Indian states");
    assert.ok(states.includes("Andhra Pradesh"));
    assert.ok(states.includes("Telangana"));
    assert.ok(states.includes("Karnataka"));

    // Districts lookup
    const districts = await locationService.getDistricts("Andhra Pradesh", "India");
    assert.ok(districts.includes("Guntur"));
    assert.ok(districts.includes("Krishna"));

    // Villages lookup
    const villages = await locationService.getVillagesCities("Guntur", "Andhra Pradesh", "India");
    assert.ok(villages.includes("Repalle"));
    assert.ok(villages.includes("Tenali"));

    // International country fallback
    const usStates = await locationService.getStates("USA");
    assert.ok(usStates.includes("California"));
    assert.ok(usStates.includes("New York"));
  });

  test("Initial intakes and consultancies are defined in mock-data.ts and store.ts", () => {
    const mockContent = fs.readFileSync(path.join(root, "src/lib/mock-data.ts"), "utf-8");

    assert.ok(mockContent.includes("export const INITIAL_INTAKES: IntakeRecord[]"), "INITIAL_INTAKES must be exported");
    assert.ok(mockContent.includes('"January 2027"'), "January 2027 in INITIAL_INTAKES");
    assert.ok(mockContent.includes('"February 2027"'), "February 2027 in INITIAL_INTAKES");
    assert.ok(mockContent.includes('"Summer 2027"'), "Summer 2027 in INITIAL_INTAKES");
    assert.ok(mockContent.includes('"Winter 2027"'), "Winter 2027 in INITIAL_INTAKES");

    assert.ok(
      mockContent.includes("export const INITIAL_B2B_CONSULTANCIES: B2BConsultancyRecord[]"),
      "INITIAL_B2B_CONSULTANCIES must be exported",
    );
    assert.ok(mockContent.includes('"ABC Overseas Consultancy"'), "ABC Overseas Consultancy in initial consultancies");
    assert.ok(mockContent.includes('"Global Education Consultants"'), "Global Education Consultants in initial consultancies");

    // Student seeding
    assert.ok(mockContent.includes('state: "Andhra Pradesh"'), "Rahul Kumar seeded with state Andhra Pradesh");
    assert.ok(mockContent.includes('district: "Guntur"'), "Rahul Kumar seeded with district Guntur");
    assert.ok(mockContent.includes('villageCity: "Repalle"'), "Rahul Kumar seeded with villageCity Repalle");
    assert.ok(mockContent.includes('recoveryNumber1: "9848022338"'), "Rahul Kumar seeded with recoveryNumber1");
    assert.ok(mockContent.includes('recoveryNumber2: "9876543210"'), "Rahul Kumar seeded with recoveryNumber2");
    assert.ok(mockContent.includes('recoveryNumber3: "9123456780"'), "Rahul Kumar seeded with recoveryNumber3");

    // Store actions
    const storeContent = fs.readFileSync(path.join(root, "src/lib/store.ts"), "utf-8");
    assert.ok(storeContent.includes("addIntake:"), "Store must include addIntake");
    assert.ok(storeContent.includes("updateIntake:"), "Store must include updateIntake");
    assert.ok(storeContent.includes("deleteIntake:"), "Store must include deleteIntake");
    assert.ok(storeContent.includes("archiveIntake:"), "Store must include archiveIntake");
    assert.ok(storeContent.includes("addB2BConsultancy:"), "Store must include addB2BConsultancy");
    assert.ok(storeContent.includes("updateB2BConsultancy:"), "Store must include updateB2BConsultancy");
    assert.ok(storeContent.includes("deleteB2BConsultancy:"), "Store must include deleteB2BConsultancy");
    assert.ok(storeContent.includes("archiveB2BConsultancy:"), "Store must include archiveB2BConsultancy");
  });

  test("Settings page supports intake and b2b tabs and components exist", () => {
    const settingsPath = path.join(root, "src/pages/settings-page.tsx");
    const content = fs.readFileSync(settingsPath, "utf-8");

    assert.ok(content.includes('value="intakes"'), "Settings page must have intakes tab");
    assert.ok(content.includes('value="b2b"'), "Settings page must have b2b tab");
    assert.ok(content.includes("<IntakeManagement />"), "Settings page must render IntakeManagement");
    assert.ok(content.includes("<B2BConsultancyManagement />"), "Settings page must render B2BConsultancyManagement");

    const intakeCompPath = path.join(root, "src/components/settings/intake-management.tsx");
    assert.ok(fs.existsSync(intakeCompPath), "intake-management.tsx must exist");

    const b2bCompPath = path.join(root, "src/components/settings/b2b-consultancy-management.tsx");
    assert.ok(fs.existsSync(b2bCompPath), "b2b-consultancy-management.tsx must exist");
  });

  test("Student Form includes StudentLocationFields, 3 recovery numbers, and dynamic B2B selection", () => {
    const formPath = path.join(root, "src/pages/student-form.tsx");
    const content = fs.readFileSync(formPath, "utf-8");

    assert.ok(content.includes("<StudentLocationFields"), "student-form.tsx must render StudentLocationFields");
    assert.ok(content.includes("Recovery Number 1"), "student-form.tsx must have Recovery Number 1");
    assert.ok(content.includes("Recovery Number 2"), "student-form.tsx must have Recovery Number 2");
    assert.ok(content.includes("Recovery Number 3"), "student-form.tsx must have Recovery Number 3");
    assert.ok(content.includes("Enter a 10-digit mobile number without the country code."), "Helper text present");
    assert.ok(content.includes("otherB2bOrg"), "otherB2bOrg supported in form draft");
  });

  test("Student Detail shows location, updated B2B display, and 3 recovery numbers", () => {
    const detailPath = path.join(root, "src/pages/student-detail.tsx");
    const content = fs.readFileSync(detailPath, "utf-8");

    assert.ok(content.includes('label="State"'), "student-detail.tsx must display State");
    assert.ok(content.includes('label="District"'), "student-detail.tsx must display District");
    assert.ok(content.includes('label="Village / City"'), "student-detail.tsx must display Village / City");
    assert.ok(content.includes("Recovery Number 1 (Primary)"), "student-detail.tsx must display Recovery Number 1");
    assert.ok(content.includes("Recovery Number 2"), "student-detail.tsx must display Recovery Number 2");
    assert.ok(content.includes("Recovery Number 3"), "student-detail.tsx must display Recovery Number 3");
    assert.ok(content.includes("canViewSecrets"), "Recovery numbers protected by canViewSecrets");
  });

  test("Students Page CSV export includes location and B2B fields", () => {
    const listPath = path.join(root, "src/pages/students-page.tsx");
    const content = fs.readFileSync(listPath, "utf-8");

    assert.ok(content.includes("state: s.state ??"), "CSV export must include state");
    assert.ok(content.includes("district: s.district ??"), "CSV export must include district");
    assert.ok(content.includes("villageCity: s.villageCity ??"), "CSV export must include villageCity");
    assert.ok(content.includes("leadType: s.leadType"), "CSV export must include leadType");
    assert.ok(content.includes("b2bOrg: s.leadType === \"B2B\""), "CSV export must include b2bOrg");
  });
});
