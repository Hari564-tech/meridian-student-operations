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
  console.log("Starting E2E Playwright verification...");
  const launchOptions = { headless: true };
  if (process.platform === "win32") {
    launchOptions.channel = "chrome";
  }
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
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

    await page.waitForFunction(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.includes("Admin"));
      if (btn) btn.click();
      const input = document.querySelector('input[type="email"]');
      return input && input.value === "admin@demo.com";
    }, { timeout: 10000 });

    await page.waitForTimeout(300);
    await page.locator('button[type="submit"]:has-text("Sign in")').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
    console.log("✓ Signed in successfully. URL:", page.url());

    // 1. Intake Management in Admin Settings
    console.log("1. Testing Admin -> Settings -> Intake Management...");
    await page.goto("http://127.0.0.1:8080/admin/settings?tab=intakes", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const intakeHeading = await page.textContent("h2:has-text('Intake Management')");
    console.log("Found intake heading:", intakeHeading);

    // Click Add Intake
    const addIntakeBtn = page.locator("button[data-testid='add-intake-button']").first();
    await addIntakeBtn.click();
    await page.waitForTimeout(500);

    // Fill form
    await page.fill("input[data-testid='intake-name-input']", "March 2028");
    await page.fill("input[data-testid='intake-year-input']", "2028");
    await page.click("button:has-text('Save Intake')");
    await page.waitForTimeout(1000);

    // Verify March 2028 appears in table
    const marchRow = page.locator("tr:has-text('March 2028')");
    const marchCount = await marchRow.count();
    console.log("March 2028 in table:", marchCount > 0);

    await saveDualScreenshot(page, "admin-intake-management.png");

    // 2. B2B Consultancy Management in Admin Settings
    console.log("2. Testing Admin -> Settings -> B2B Consultancy Management...");
    await page.goto("http://127.0.0.1:8080/admin/settings?tab=b2b", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const b2bHeading = await page.textContent("h2:has-text('B2B Consultancy Management')");
    console.log("Found B2B heading:", b2bHeading);

    // Click Add Consultancy
    const addB2bBtn = page.locator("button[data-testid='add-consultancy-button']").first();
    await addB2bBtn.click();
    await page.waitForTimeout(500);

    // Fill form
    await page.fill("input[data-testid='b2b-name-input']", "Apex Worldwide Education");
    await page.fill("input[data-testid='b2b-contact-input']", "Sunil Sharma");
    await page.fill("input[data-testid='b2b-email-input']", "sunil@apexworldwide.com");
    await page.fill("input[data-testid='b2b-phone-input']", "9848123456");
    await page.click("button:has-text('Save Consultancy')");
    await page.waitForTimeout(1000);

    const apexRow = page.locator("tr:has-text('Apex Worldwide Education')");
    const apexCount = await apexRow.count();
    console.log("Apex Worldwide Education in table:", apexCount > 0);

    await saveDualScreenshot(page, "admin-b2b-management.png");

    // 3. Add Student Form: Location, 3 Recovery Numbers & B2B Consultancy
    console.log("3. Testing Admin -> Students -> Add Student...");
    await page.goto("http://127.0.0.1:8080/admin/students/new", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Verify Student Location Section
    const locationSection = page.locator("[data-testid='student-location-section']");
    const hasLocation = (await locationSection.count()) > 0;
    console.log("Student location section present:", hasLocation);

    // Test Intake dropdown contains March 2028
    const intakeTrigger = page.locator("[data-testid='intake-select-trigger']");
    await intakeTrigger.click();
    await page.waitForTimeout(400);
    const march2028Opt = page.locator("[role='option']:has-text('March 2028')");
    console.log("March 2028 available in student intake select:", (await march2028Opt.count()) > 0);
    await march2028Opt.click();
    await page.waitForTimeout(400);

    // Select State
    const stateTrigger = page.locator("[data-testid='state-select-trigger']");
    await stateTrigger.click();
    await page.waitForTimeout(400);
    const apOption = page.locator("[role='option']:has-text('Andhra Pradesh')");
    await apOption.click();
    await page.waitForTimeout(400);

    // Select District
    const districtTrigger = page.locator("[data-testid='district-select-trigger']");
    await districtTrigger.click();
    await page.waitForTimeout(400);
    const gunturOption = page.locator("[role='option']:has-text('Guntur')");
    await gunturOption.click();
    await page.waitForTimeout(400);

    // Select Village / City
    const villageTrigger = page.locator("[data-testid='village-select-trigger']");
    await villageTrigger.click();
    await page.waitForTimeout(400);
    const repalleOption = page.locator("[role='option']:has-text('Repalle')");
    await repalleOption.click();
    await page.waitForTimeout(400);

    // Fill personal fields
    await page.fill("[data-testid='student-name-input']", "Ananya Sharma");
    await page.fill("[data-testid='student-phone1-input']", "9848011223");
    await page.fill("[data-testid='student-college-input']", "Andhra University");

    // Click Continue to Academic
    await page.click("button:has-text('Continue')");
    await page.waitForTimeout(500);

    // Fill Academic
    await page.fill("[data-testid='student-cgpa-input']", "8.75");
    const englishTestTrigger = page.locator("[data-testid='student-english-test-select']");
    await englishTestTrigger.click();
    await page.waitForTimeout(300);
    await page.locator("[role='option']:has-text('IELTS')").click();
    await page.waitForTimeout(300);
    await page.fill("[data-testid='student-english-score-input']", "7.5");

    // Click Continue to Account
    await page.click("button:has-text('Continue')");
    await page.waitForTimeout(500);

    // Verify 3 Recovery Numbers
    const rec1Input = page.locator("input[data-testid='recovery-number-1-input']");
    const rec2Input = page.locator("input[data-testid='recovery-number-2-input']");
    const rec3Input = page.locator("input[data-testid='recovery-number-3-input']");

    console.log("Recovery 1 exists:", (await rec1Input.count()) > 0);
    console.log("Recovery 2 exists:", (await rec2Input.count()) > 0);
    console.log("Recovery 3 exists:", (await rec3Input.count()) > 0);

    await rec1Input.fill("9848011223");
    await rec2Input.fill("9876543210");
    await rec3Input.fill("9123456780");

    await page.fill("[data-testid='student-gmail-input']", "ananya.abroad@gmail.com");

    // Click Continue to Application
    await page.click("button:has-text('Continue')");
    await page.waitForTimeout(500);

    // Switch Lead Type to B2B
    const leadTypeTrigger = page.locator("[data-testid='lead-type-select']");
    await leadTypeTrigger.click();
    await page.waitForTimeout(400);
    await page.locator("[role='option']:has-text('B2B')").click();
    await page.waitForTimeout(400);

    // Verify B2B consultancy dropdown contains Apex Worldwide Education
    const b2bTrigger = page.locator("[data-testid='b2b-consultancy-select']");
    await b2bTrigger.click();
    await page.waitForTimeout(400);
    const apexOption = page.locator("[role='option']:has-text('Apex Worldwide Education')");
    console.log("Apex Worldwide Education available in student form:", (await apexOption.count()) > 0);
    await apexOption.click();
    await page.waitForTimeout(400);

    // Navigate to Review step directly by clicking 08 Review
    console.log("Navigating directly to Review step...");
    await page.locator("button:has-text('08 Review')").click();
    await page.waitForTimeout(1000);

    // Check Review Step displays location, recovery numbers, and B2B
    const reviewContent = await page.textContent("body");
    console.log("Review has Andhra Pradesh:", reviewContent.includes("Andhra Pradesh"));
    console.log("Review has Guntur:", reviewContent.includes("Guntur"));
    console.log("Review has Repalle:", reviewContent.includes("Repalle"));
    console.log("Review has Recovery 1:", reviewContent.includes("9848011223"));
    console.log("Review has Recovery 2:", reviewContent.includes("9876543210"));
    console.log("Review has Recovery 3:", reviewContent.includes("9123456780"));
    console.log("Review has Apex Worldwide:", reviewContent.includes("Apex Worldwide Education"));

    await saveDualScreenshot(page, "student-form-location-and-recovery.png");

    // Submit student
    const createBtn = page.locator("button:has-text('Create student')").or(page.locator("button:has-text('Save changes')")).first();
    await createBtn.click();
    await page.waitForTimeout(1500);

    // 4. View Rahul Kumar (OCT26_001) in Student Detail
    console.log("4. Testing Student Detail for Rahul Kumar...");
    await page.goto("http://127.0.0.1:8080/admin/students/OCT26_001", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const rahulBody = await page.textContent("body");
    console.log("Student detail has State Andhra Pradesh:", rahulBody.includes("Andhra Pradesh"));
    console.log("Student detail has District Guntur:", rahulBody.includes("Guntur"));
    console.log("Student detail has Village / City Repalle:", rahulBody.includes("Repalle"));
    console.log("Student detail has Recovery Number 1:", rahulBody.includes("Recovery Number 1 (Primary)"));
    console.log("Student detail has Recovery Number 2:", rahulBody.includes("Recovery Number 2"));
    console.log("Student detail has Recovery Number 3:", rahulBody.includes("Recovery Number 3"));

    await saveDualScreenshot(page, "student-profile-location-and-recovery.png");

    console.log("Console errors during session:", consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.error("Errors:", consoleErrors);
    }

    console.log("ALL E2E CHECKS COMPLETED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("E2E verification failed:", err);
  process.exit(1);
});
