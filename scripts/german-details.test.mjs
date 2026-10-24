import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

describe("German-Specific Details Invariant Tests", () => {
  test("src/lib/types.ts defines the exact required dropdown options", async () => {
    const typesContent = fs.readFileSync(path.join(root, "src/lib/types.ts"), "utf-8");

    // 1. BLOCKED_ACCOUNT_OPTIONS: Yes, No, Not Applied
    assert.ok(typesContent.includes("export const BLOCKED_ACCOUNT_OPTIONS = ["));
    assert.ok(typesContent.includes('"Not Applied"'));
    assert.ok(typesContent.includes('"Yes"'));
    assert.ok(typesContent.includes('"No"'));

    // 2. ENROLLMENT_STATUS_OPTIONS: 7 options
    const expectedEnrollment = [
      "Not Applied",
      "Applied",
      "Awaiting Confirmation",
      "Enrolled",
      "Enrollment Certificate Received",
      "On Hold",
      "Not Required",
    ];
    for (const opt of expectedEnrollment) {
      assert.ok(typesContent.includes(`"${opt}"`), `types.ts must include enrollment option: ${opt}`);
    }

    // 3. STUDENT_DORM_STATUS_OPTIONS: 8 options
    const expectedDorm = [
      "Not Applied",
      "Applied",
      "Searching",
      "Waiting List",
      "Accommodation Confirmed",
      "Contract Signed",
      "No Availability",
      "Not Required",
    ];
    for (const opt of expectedDorm) {
      assert.ok(typesContent.includes(`"${opt}"`), `types.ts must include student dorm option: ${opt}`);
    }
  });

  test("src/pages/student-form.tsx contains dropdowns, defaults, and no Uni-Assist Documents upload", () => {
    const formContent = fs.readFileSync(path.join(root, "src/pages/student-form.tsx"), "utf-8");

    // 1. Completely remove Uni-Assist Documents upload
    assert.doesNotMatch(formContent, /<FormField label="Uni-Assist Documents"/, "Uni-Assist Documents upload field must be removed");
    assert.doesNotMatch(formContent, /addUniAssistFiles/, "addUniAssistFiles function must be removed");
    assert.doesNotMatch(formContent, /removeUniAssistFile/, "removeUniAssistFile function must be removed");

    // 2. Keep APS and Uni-Assist credentials
    assert.match(formContent, /label="APS Username"/);
    assert.match(formContent, /label="APS Password"/);
    assert.match(formContent, /label="Uni-Assist ID"/);
    assert.match(formContent, /label="Uni-Assist Password"/);

    // 3. Dropdown fields with exact labels
    assert.match(formContent, /<FormField label="Blocked Account">/);
    assert.match(formContent, /<FormField label="Enrollment Status">/);
    assert.match(formContent, /<FormField label="Student Dorm Status">/);

    // 4. Student Dorm Status must not be sm:col-span-2
    assert.doesNotMatch(formContent, /<FormField label="Student Dorm Status"[^>]*sm:col-span-2/, "Student dorm must not span 2 columns");

    // 5. Default values in emptyDraft
    assert.match(formContent, /blockedAccount:\s*"Not Applied"/);
    assert.match(formContent, /enrollment:\s*"Not Applied"/);
    assert.match(formContent, /studentDorm:\s*"Not Applied"/);

    // 6. Review section has updated labels and no Uni-Assist Documents
    assert.match(formContent, /<ReviewField label="Blocked Account"/);
    assert.match(formContent, /<ReviewField label="Enrollment Status"/);
    assert.match(formContent, /<ReviewField label="Student Dorm Status"/);
    assert.doesNotMatch(formContent, /<ReviewField label="Uni-Assist Documents"/);
  });

  test("src/pages/student-detail.tsx renders subtle semantic status badges and removes Uni-Assist Documents", () => {
    const detailContent = fs.readFileSync(path.join(root, "src/pages/student-detail.tsx"), "utf-8");

    // Uni-Assist Documents removed
    assert.doesNotMatch(detailContent, /<p[^>]*>Uni-Assist Documents<\/p>/, "Uni-Assist Documents must be removed from detail card");

    // Semantic status badge fields used
    assert.match(detailContent, /<StatusBadgeField label="Blocked Account"/);
    assert.match(detailContent, /<StatusBadgeField label="Enrollment Status"/);
    assert.match(detailContent, /<StatusBadgeField label="Student Dorm Status"/);
    assert.match(detailContent, /function getGermanStatusBadgeVariant/);
  });

  test("src/pages/students-page.tsx includes German fields in export", () => {
    const studentsPageContent = fs.readFileSync(path.join(root, "src/pages/students-page.tsx"), "utf-8");
    assert.match(studentsPageContent, /blockedAccount:\s*s\.blockedAccount/);
    assert.match(studentsPageContent, /enrollmentStatus:\s*s\.enrollment/);
    assert.match(studentsPageContent, /studentDormStatus:\s*s\.studentDorm/);
  });
});
