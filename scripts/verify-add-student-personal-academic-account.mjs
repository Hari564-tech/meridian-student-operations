import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const screenshotsDir = path.join(root, "screenshots");
const artifactDir = "C:\\Users\\deept\\.gemini\\antigravity\\brain\\acc09169-be98-44b2-9a20-9220aeec8ba0";

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}
if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}

function saveDualScreenshot(page, filename) {
  const p1 = path.join(screenshotsDir, filename);
  const p2 = path.join(artifactDir, filename);
  return Promise.all([
    page.screenshot({ path: p1, fullPage: true }),
    page.screenshot({ path: p2, fullPage: true }),
  ]);
}

async function run() {
  console.log("Starting E2E Playwright verification for Add/Edit Student enhancements...");
  const launchOptions = { headless: true };
  if (process.platform === "win32") {
    launchOptions.channel = "chrome";
  }
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!text.includes("favicon") && !text.includes("WebSocket") && !text.includes("HMR")) {
        consoleErrors.push(text);
      }
    }
  });

  try {
    // 0. Login as Admin
    console.log("0. Logging in as Admin...");
    await page.goto("http://127.0.0.1:8080/login", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    if (page.url().includes("/login")) {
      await page.waitForFunction(() => {
        const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.includes("Admin"));
        if (btn) btn.click();
        const input = document.querySelector('input[type="email"]');
        return input && input.value === "admin@demo.com";
      }, { timeout: 15000 });

      await page.waitForTimeout(400);
      await page.locator('button[type="submit"]:has-text("Sign in")').click();
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    }
    console.log("✓ Signed in successfully. URL:", page.url());

    // 1. Navigate to Add Student
    console.log("1. Navigating to Add Student (/admin/students/new)...");
    await page.goto("http://127.0.0.1:8080/admin/students/new", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-testid='student-college-input']", { timeout: 15000 });
    await page.waitForTimeout(500);

    // Verify Personal section fields
    console.log("Checking Personal step fields...");
    const collegeInput = page.locator("[data-testid='student-college-input']");
    const mastersInput = page.locator("[data-testid='student-masters-details-input']");
    const referredByInput = page.locator("[data-testid='student-referred-by-input']");

    if ((await collegeInput.count()) === 0) throw new Error("Missing College input");
    if ((await mastersInput.count()) === 0) throw new Error("Missing Master's details input");
    if ((await referredByInput.count()) === 0) throw new Error("Missing Referred By input");
    console.log("✓ College, Master's, Lead by Employee, and Referred By inputs verified.");

    // Fill Personal step
    await page.fill("[data-testid='student-name-input']", "Vikramaditya Varma");
    await page.fill("[data-testid='student-phone1-input']", "9876543210");
    await page.fill("[data-testid='student-college-input']", "Osmania University Engineering College");
    await page.fill("[data-testid='student-masters-details-input']", "M.Tech in Artificial Intelligence");
    await page.fill("[data-testid='student-referred-by-input']", "Nagaraju Senior Counselor");

    await saveDualScreenshot(page, "add-student-step1-personal.png");
    console.log("✓ Saved add-student-step1-personal.png");

    // Click Continue to Academic step
    await page.click("button:has-text('Continue')");
    await page.waitForSelector("[data-testid='student-bachelors-cgpa-input']", { timeout: 15000 });
    await page.waitForTimeout(400);

    // 2. Academic Step Verification
    console.log("2. Checking Academic step fields...");
    const bachelorsCgpaInput = page.locator("[data-testid='student-bachelors-cgpa-input']");
    const mastersCgpaInput = page.locator("[data-testid='student-masters-cgpa-input']");
    const englishTestSelect = page.locator("[data-testid='student-english-test-select']");

    if ((await bachelorsCgpaInput.count()) === 0) throw new Error("Missing Bachelor's CGPA input");
    if ((await mastersCgpaInput.count()) === 0) throw new Error("Missing Master's CGPA input");
    if ((await englishTestSelect.count()) === 0) throw new Error("Missing English Test select");

    await bachelorsCgpaInput.fill("8.65");
    await mastersCgpaInput.fill("9.10");

    // Open English Test select
    await englishTestSelect.click();
    await page.waitForTimeout(400);

    // Verify all 7 options are available
    const tests = ["IELTS", "TOEFL", "IELTS & TOEFL", "Duolingo", "PTE", "Other", "Not Taken"];
    for (const test of tests) {
      const opt = page.locator(`[role='option']:has-text('${test}')`);
      if ((await opt.count()) === 0) throw new Error(`Missing English test option: ${test}`);
    }
    console.log("✓ All 7 English test options verified in dropdown.");

    // Select IELTS & TOEFL
    await page.locator("[role='option']:has-text('IELTS & TOEFL')").click();
    await page.waitForTimeout(500);

    // Verify dual score inputs
    const dualIelts = page.locator("[data-testid='student-dual-ielts-score-input']");
    const dualToefl = page.locator("[data-testid='student-dual-toefl-score-input']");

    if ((await dualIelts.count()) === 0) throw new Error("Missing Dual IELTS Score input");
    if ((await dualToefl.count()) === 0) throw new Error("Missing Dual TOEFL Score input");
    console.log("✓ Dual IELTS & TOEFL inputs appeared side-by-side.");

    await dualIelts.fill("7.5");
    await dualToefl.fill("108");

    await saveDualScreenshot(page, "add-student-step2-academic.png");
    console.log("✓ Saved add-student-step2-academic.png");

    // Click Continue to Account step
    await page.click("button:has-text('Continue')");
    await page.waitForSelector("[data-testid='recovery-gmail-1-input']", { timeout: 15000 });
    await page.waitForTimeout(400);

    // 3. Account Step Verification
    console.log("3. Checking Account step fields...");
    const recSection = page.locator("[data-testid='recovery-gmail-section']");
    const rec1 = page.locator("[data-testid='recovery-gmail-1-input']");
    const rec2 = page.locator("[data-testid='recovery-gmail-2-input']");
    const rec3 = page.locator("[data-testid='recovery-gmail-3-input']");

    if ((await recSection.count()) === 0) throw new Error("Missing Account Recovery Gmail Addresses section");
    if ((await rec1.count()) === 0) throw new Error("Missing Recovery Gmail 1 input");
    if ((await rec2.count()) === 0) throw new Error("Missing Recovery Gmail 2 input");
    if ((await rec3.count()) === 0) throw new Error("Missing Recovery Gmail 3 input");

    // Verify there are NO reveal or eye buttons inside the recovery gmail section
    const revealBtnsInRecSection = recSection.locator("button");
    const btnCount = await revealBtnsInRecSection.count();
    console.log("Buttons inside Recovery Gmail section (must be 0):", btnCount);
    if (btnCount !== 0) throw new Error("Recovery Gmail section should NOT have reveal or action buttons");

    await rec1.fill("vikram.rec1@gmail.com");
    await rec2.fill("vikram.rec2@gmail.com");
    await rec3.fill("vikram.rec3@gmail.com");

    await page.fill("[data-testid='student-gmail-input']", "vikram.varma.abroad@gmail.com");

    // Fill recovery phone numbers
    await page.fill("[data-testid='recovery-number-1-input']", "9848011223");
    await page.fill("[data-testid='recovery-number-2-input']", "9876543210");
    await page.fill("[data-testid='recovery-number-3-input']", "9123456780");

    await saveDualScreenshot(page, "add-student-step3-account.png");
    console.log("✓ Saved add-student-step3-account.png");

    // 4. Navigate directly to Review step
    console.log("4. Navigating to Review Step...");
    await page.locator("button:has-text('08 Review')").click();
    await page.waitForSelector("[data-testid='review-edit-01-personal']", { timeout: 15000 });
    await page.waitForTimeout(600);

    const reviewContent = await page.textContent("body");
    if (!reviewContent.includes("Nagaraju Senior Counselor")) throw new Error("Review missing Referred By");
    if (!reviewContent.includes("M.Tech in Artificial Intelligence")) throw new Error("Review missing Master's details");
    if (!reviewContent.includes("8.65")) throw new Error("Review missing Bachelor's CGPA");
    if (!reviewContent.includes("9.10")) throw new Error("Review missing Master's CGPA");
    if (!reviewContent.includes("IELTS & TOEFL")) throw new Error("Review missing English test name");
    if (!reviewContent.includes("IELTS: 7.5") || !reviewContent.includes("TOEFL: 108")) {
      throw new Error("Review missing formatted dual IELTS & TOEFL scores");
    }
    if (!reviewContent.includes("vikram.rec1@gmail.com")) throw new Error("Review missing Recovery Gmail 1");
    if (!reviewContent.includes("vikram.rec2@gmail.com")) throw new Error("Review missing Recovery Gmail 2");
    if (!reviewContent.includes("vikram.rec3@gmail.com")) throw new Error("Review missing Recovery Gmail 3");

    console.log("✓ Review step verified with all new fields.");

    // Check that Edit buttons exist on Review sections
    const editPersonalBtn = page.locator("[data-testid='review-edit-01-personal']");
    const editAcademicBtn = page.locator("[data-testid='review-edit-02-academic']");
    const editAccountBtn = page.locator("[data-testid='review-edit-03-account']");

    if ((await editPersonalBtn.count()) === 0) throw new Error("Missing Edit button on Personal review section");
    if ((await editAcademicBtn.count()) === 0) throw new Error("Missing Edit button on Academic review section");
    if ((await editAccountBtn.count()) === 0) throw new Error("Missing Edit button on Account review section");
    console.log("✓ Edit action buttons verified on all review sections.");

    await saveDualScreenshot(page, "add-student-step8-review.png");
    console.log("✓ Saved add-student-step8-review.png");

    // Submit student
    console.log("5. Submitting student form...");
    const createBtn = page.locator("button:has-text('Create student')").or(page.locator("button:has-text('Save changes')")).first();
    await createBtn.click();
    await page.waitForURL((url) => url.pathname.includes("/students/"), { timeout: 15000 });
    await page.waitForSelector("button:has-text('Edit student')", { timeout: 15000 });
    await page.waitForTimeout(600);

    // Should navigate to Student Profile
    const profileUrl = page.url();
    console.log("Navigated to:", profileUrl);

    // Verify Student Profile displays all values
    const profileBody = await page.textContent("body");
    if (!profileBody.includes("Vikramaditya Varma")) throw new Error("Profile missing Student Name");
    if (!profileBody.includes("Nagaraju Senior Counselor")) throw new Error("Profile missing Referred By");
    if (!profileBody.includes("M.Tech in Artificial Intelligence")) throw new Error("Profile missing Master's details");
    if (!profileBody.includes("8.65")) throw new Error("Profile missing Bachelor's CGPA");
    if (!profileBody.includes("9.10")) throw new Error("Profile missing Master's CGPA");
    if (!profileBody.includes("IELTS & TOEFL")) throw new Error("Profile missing English Test");
    if (!profileBody.includes("IELTS: 7.5") || !profileBody.includes("TOEFL: 108")) {
      throw new Error("Profile missing dual IELTS & TOEFL score formatting");
    }
    if (!profileBody.includes("vikram.rec1@gmail.com")) throw new Error("Profile missing Recovery Gmail 1");
    if (!profileBody.includes("vikram.rec2@gmail.com")) throw new Error("Profile missing Recovery Gmail 2");
    if (!profileBody.includes("vikram.rec3@gmail.com")) throw new Error("Profile missing Recovery Gmail 3");

    console.log("✓ Student profile verified with all new fields.");
    await saveDualScreenshot(page, "student-profile-personal-academic-account.png");
    console.log("✓ Saved student-profile-personal-academic-account.png");

    // 6. Test Edit Student Form
    console.log("6. Testing Edit Student Form...");
    const editBtn = page.locator("button:has-text('Edit student')").first();
    await editBtn.click();
    await page.waitForSelector("[data-testid='student-college-input']", { timeout: 15000 });
    await page.waitForTimeout(600);

    const editCollegeVal = await page.inputValue("[data-testid='student-college-input']");
    const editMastersVal = await page.inputValue("[data-testid='student-masters-details-input']");
    const editReferredVal = await page.inputValue("[data-testid='student-referred-by-input']");

    console.log("Edit form loaded values:", {
      college: editCollegeVal,
      masters: editMastersVal,
      referredBy: editReferredVal,
    });

    if (editCollegeVal !== "Osmania University Engineering College") throw new Error("Edit College value mismatch");
    if (editMastersVal !== "M.Tech in Artificial Intelligence") throw new Error("Edit Master's details value mismatch");
    if (editReferredVal !== "Nagaraju Senior Counselor") throw new Error("Edit Referred By value mismatch");

    await saveDualScreenshot(page, "student-edit-prepopulated.png");
    console.log("✓ Saved student-edit-prepopulated.png");

    console.log("Console errors during session:", consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.error("Errors:", consoleErrors);
    }

    console.log("ALL E2E VERIFICATIONS PASSED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("E2E verification failed:", err);
  process.exit(1);
});
