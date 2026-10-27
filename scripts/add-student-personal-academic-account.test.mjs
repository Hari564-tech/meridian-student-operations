import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

describe("Add Student: Personal, Academic, and Account Enhancements", () => {
  test("src/lib/types.ts exports ENGLISH_TESTS, isValidEmail, and getStudentRecoveryGmails", async () => {
    const typesPath = path.join(root, "src/lib/types.ts");
    assert.ok(fs.existsSync(typesPath), "src/lib/types.ts must exist");
    const content = fs.readFileSync(typesPath, "utf-8");

    assert.ok(content.includes("export const ENGLISH_TESTS ="), "Must export ENGLISH_TESTS");
    assert.ok(content.includes('"IELTS & TOEFL"'), "Must include 'IELTS & TOEFL'");
    assert.ok(content.includes('"Not Taken"'), "Must include 'Not Taken'");
    assert.ok(content.includes('"Other"'), "Must include 'Other'");
    assert.ok(content.includes("bachelorsCgpa?: number"), "Student interface must have bachelorsCgpa");
    assert.ok(content.includes("mastersCgpa?: number"), "Student interface must have mastersCgpa");
    assert.ok(content.includes("referredBy?: string"), "Student interface must have referredBy");
    assert.ok(content.includes("mastersDetails?: string"), "Student interface must have mastersDetails");
    assert.ok(content.includes("recoveryGmail1?: string"), "Student interface must have recoveryGmail1");
    assert.ok(content.includes("recoveryGmail2?: string"), "Student interface must have recoveryGmail2");
    assert.ok(content.includes("recoveryGmail3?: string"), "Student interface must have recoveryGmail3");

    const {
      ENGLISH_TESTS,
      isValidEmail,
      getStudentRecoveryGmails,
      scoresForEnglish,
      englishFromStudent,
    } = await import("../src/lib/types.ts");

    assert.deepEqual(ENGLISH_TESTS, [
      "IELTS",
      "TOEFL",
      "IELTS & TOEFL",
      "Duolingo",
      "PTE",
      "Other",
      "Not Taken",
    ]);

    // Test email validation
    assert.equal(isValidEmail("recovery1@gmail.com"), true);
    assert.equal(isValidEmail("student.valid@domain.org"), true);
    assert.equal(isValidEmail(""), false);
    assert.equal(isValidEmail("invalid-email"), false);
    assert.equal(isValidEmail("user@"), false);
    assert.equal(isValidEmail("@domain.com"), false);

    // Test recovery gmail helper
    assert.deepEqual(getStudentRecoveryGmails(null), {
      recoveryGmail1: "",
      recoveryGmail2: "",
      recoveryGmail3: "",
    });
    assert.deepEqual(
      getStudentRecoveryGmails({
        recoveryGmail1: "one@gmail.com",
        recoveryGmail2: "two@gmail.com",
        recoveryGmail3: "three@gmail.com",
      }),
      {
        recoveryGmail1: "one@gmail.com",
        recoveryGmail2: "two@gmail.com",
        recoveryGmail3: "three@gmail.com",
      },
    );

    // Test dual IELTS & TOEFL score preserving
    const dualScores = scoresForEnglish("IELTS & TOEFL", undefined, {
      ielts: 7.5,
      toefl: 104,
    });
    assert.equal(dualScores.englishTest, "IELTS & TOEFL");
    assert.equal(dualScores.ielts, 7.5);
    assert.equal(dualScores.toefl, 104);

    const dualExtracted = englishFromStudent({
      englishTest: "IELTS & TOEFL",
      ielts: 7.5,
      toefl: 104,
    });
    assert.equal(dualExtracted.englishTest, "IELTS & TOEFL");
    assert.equal(dualExtracted.ielts, 7.5);
    assert.equal(dualExtracted.toefl, 104);

    // Test Other test score
    const otherScores = scoresForEnglish("Other", undefined, {
      otherName: "Cambridge Advanced",
      otherScore: 190,
    });
    assert.equal(otherScores.englishTest, "Other");
    assert.equal(otherScores.otherEnglishTestName, "Cambridge Advanced");
    assert.equal(otherScores.otherEnglishTestScore, 190);

    // Test Not Taken
    const notTakenScores = scoresForEnglish("Not Taken");
    assert.equal(notTakenScores.englishTest, "Not Taken");
    assert.equal(notTakenScores.ielts, undefined);
    assert.equal(notTakenScores.toefl, undefined);
  });

  test("src/pages/student-form.tsx contains all required fields, inputs, and validation", () => {
    const formPath = path.join(root, "src/pages/student-form.tsx");
    assert.ok(fs.existsSync(formPath), "src/pages/student-form.tsx must exist");
    const content = fs.readFileSync(formPath, "utf-8");

    // Personal Section
    assert.ok(content.includes('label="Referred By"'), "Form must have Referred By field");
    assert.ok(content.includes('placeholder="Enter referrer\'s name"'), "Referred By placeholder");
    assert.ok(content.includes('data-testid="student-referred-by-input"'), "Referred by test id");
    assert.ok(content.includes('label="Master\'s"'), "Form must have Master's field");
    assert.ok(content.includes('placeholder="Enter Master\'s details (optional)"'), "Master's placeholder");
    assert.ok(content.includes('data-testid="student-masters-details-input"'), "Master's test id");

    // Academic Section
    assert.ok(content.includes('label="Bachelor\'s CGPA"'), "Form must have Bachelor's CGPA field");
    assert.ok(content.includes('data-testid="student-bachelors-cgpa-input"'), "Bachelor's CGPA test id");
    assert.ok(content.includes('label="Master\'s CGPA"'), "Form must have Master's CGPA field");
    assert.ok(content.includes('data-testid="student-masters-cgpa-input"'), "Master's CGPA test id");
    assert.ok(content.includes('data-testid="student-english-test-select"'), "English test select");
    assert.ok(content.includes('data-testid="student-dual-ielts-score-input"'), "Dual IELTS score input");
    assert.ok(content.includes('data-testid="student-dual-toefl-score-input"'), "Dual TOEFL score input");
    assert.ok(content.includes('data-testid="student-duolingo-score-input"'), "Duolingo score input");
    assert.ok(content.includes('data-testid="student-pte-score-input"'), "PTE score input");
    assert.ok(content.includes('data-testid="student-other-test-name-input"'), "Other test name input");
    assert.ok(content.includes('data-testid="student-other-test-score-input"'), "Other test score input");

    // Account Section
    assert.ok(content.includes('data-testid="recovery-gmail-section"'), "Recovery Gmail section");
    assert.ok(content.includes('label="Recovery Gmail 1"'), "Recovery Gmail 1 label");
    assert.ok(content.includes('data-testid="recovery-gmail-1-input"'), "Recovery Gmail 1 input");
    assert.ok(content.includes('label="Recovery Gmail 2"'), "Recovery Gmail 2 label");
    assert.ok(content.includes('data-testid="recovery-gmail-2-input"'), "Recovery Gmail 2 input");
    assert.ok(content.includes('label="Recovery Gmail 3"'), "Recovery Gmail 3 label");
    assert.ok(content.includes('data-testid="recovery-gmail-3-input"'), "Recovery Gmail 3 input");

    // Review Step
    assert.ok(content.includes('label="Bachelor\'s CGPA"'), "Review displays Bachelor's CGPA");
    assert.ok(content.includes('label="Master\'s CGPA"'), "Review displays Master's CGPA");
    assert.ok(content.includes('label="Recovery Gmail 1"'), "Review displays Recovery Gmail 1");
    assert.ok(content.includes('label="Referred By"'), "Review displays Referred By");
    assert.ok(content.includes('label="Master\'s"'), "Review displays Master's");
    assert.ok(content.includes('onEdit='), "Review sections provide onEdit navigation");
  });

  test("src/pages/student-detail.tsx renders all new fields in profile tabs", () => {
    const detailPath = path.join(root, "src/pages/student-detail.tsx");
    assert.ok(fs.existsSync(detailPath), "src/pages/student-detail.tsx must exist");
    const content = fs.readFileSync(detailPath, "utf-8");

    // Overview Tab
    assert.ok(content.includes('Field label="Bachelor\'s CGPA"'), "Detail displays Bachelor's CGPA");
    assert.ok(content.includes('Field label="Master\'s CGPA"'), "Detail displays Master's CGPA");
    assert.ok(content.includes('Field label="Master\'s"'), "Detail displays Master's");
    assert.ok(content.includes('Field label="Referred By"'), "Detail displays Referred By");
    assert.ok(content.includes('Field label="Recovery Gmail 1"'), "Detail displays Recovery Gmail 1");
    assert.ok(content.includes('Field label="Recovery Gmail 2"'), "Detail displays Recovery Gmail 2");
    assert.ok(content.includes('Field label="Recovery Gmail 3"'), "Detail displays Recovery Gmail 3");
    assert.ok(content.includes("formatStudentEnglishScore"), "Detail uses formatStudentEnglishScore");
  });

  test("src/lib/store.ts synchronizes bachelorsCgpa and persists all new fields", () => {
    const storePath = path.join(root, "src/lib/store.ts");
    assert.ok(fs.existsSync(storePath), "src/lib/store.ts must exist");
    const content = fs.readFileSync(storePath, "utf-8");

    assert.ok(content.includes("bachelorsCgpa: bCgpa"), "store synchronizes bachelorsCgpa");
    assert.ok(content.includes("recoveryGmail1: data.recoveryGmail1"), "store persists recoveryGmail1");
    assert.ok(content.includes("referredBy: data.referredBy"), "store persists referredBy");
    assert.ok(content.includes("mastersDetails: data.mastersDetails"), "store persists mastersDetails");
  });
});
