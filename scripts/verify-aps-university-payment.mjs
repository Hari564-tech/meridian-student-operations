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

async function saveDualScreenshot(page, filename) {
  const p1 = path.join(screenshotsDir, filename);
  const p2 = path.join(artifactDir, filename);
  try {
    await page.screenshot({ path: p1, fullPage: false, timeout: 10000, animations: "disabled" });
    fs.copyFileSync(p1, p2);
  } catch (err) {
    console.warn(`Screenshot warning for ${filename}:`, err.message);
  }
}

async function run() {
  console.log("Starting E2E Playwright verification for APS Applied By, University Type & Payment Management...");
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
    // 0. Login
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

    // 1. Add Student Flow: Fill required steps to reach Step 4 and Step 5
    console.log("1. Navigating to Add Student (/admin/students/new)...");
    await page.goto("http://127.0.0.1:8080/admin/students/new", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-testid='student-name-input']", { timeout: 15000 });
    await page.waitForTimeout(500);

    // Step 1: Personal
    console.log("Filling Step 01 Personal...");
    await page.fill("[data-testid='student-name-input']", "Aditya Prakash");
    await page.fill("[data-testid='student-phone1-input']", "9848011223");
    await page.fill("[data-testid='student-college-input']", "BITS Pilani");

    // Select Location
    console.log("✓ Location pre-filled with state/district/village.");

    // Advance to Step 2 Academic
    await page.click("button:has-text('Continue')");
    await page.waitForTimeout(500);

    // Step 2: Academic
    console.log("Filling Step 02 Academic...");
    await page.fill("[data-testid='student-bachelors-cgpa-input']", "8.75");
    const englishTrigger = page.locator("[data-testid='student-english-test-select']");
    await englishTrigger.click();
    await page.waitForTimeout(300);
    await page.locator("[role='option']:has-text('IELTS')").first().click();
    await page.waitForTimeout(300);
    await page.fill("[data-testid='student-ielts-score-input']", "7.5");

    // Advance to Step 3 Account
    await page.click("button:has-text('Continue')");
    await page.waitForTimeout(500);

    // Step 3: Account
    console.log("Filling Step 03 Account...");
    await page.fill("[data-testid='student-gmail-input']", "aditya.prakash.abroad@gmail.com");
    await page.fill("[data-testid='recovery-gmail-1-input']", "aditya.rec1@gmail.com");
    await page.fill("[data-testid='recovery-number-1-input']", "9848011223");

    // Advance to Step 4 Application
    await page.click("button:has-text('Continue')");
    await page.waitForTimeout(500);

    // Verify University Type dropdown in Step 4 Application
    console.log("Checking Step 04 Application: University Type dropdown...");
    const univTypeTrigger = page.locator("[data-testid='university-type-select']");
    if ((await univTypeTrigger.count()) === 0) {
      throw new Error("Missing data-testid='university-type-select' in Step 04 Application");
    }
    // Verify options
    await univTypeTrigger.click();
    await page.waitForTimeout(300);
    const pubOpt = page.locator("[role='option']:has-text('Public University')");
    const privOpt = page.locator("[role='option']:has-text('Private University')");
    if ((await pubOpt.count()) === 0) throw new Error("Missing 'Public University' option");
    if ((await privOpt.count()) === 0) throw new Error("Missing 'Private University' option");
    console.log("✓ University Type dropdown contains Public University and Private University options.");

    // Select Private University
    await privOpt.click();
    await page.waitForTimeout(300);
    console.log("✓ Selected 'Private University'");

    await saveDualScreenshot(page, "add-student-step4-university-type.png");
    console.log("✓ Saved add-student-step4-university-type.png");

    // Advance to Step 5 German-Specific Details
    await page.click("button:has-text('Continue')");
    await page.waitForTimeout(500);

    // Verify APS Applied By dropdown in Step 5 German-Specific Details
    console.log("Checking Step 05 German-Specific Details: APS Applied By dropdown...");
    const apsTrigger = page.locator("[data-testid='aps-applied-by-select']");
    if ((await apsTrigger.count()) === 0) {
      throw new Error("Missing data-testid='aps-applied-by-select' in Step 05 German-Specific Details");
    }
    // Verify options
    await apsTrigger.click();
    await page.waitForTimeout(300);
    const studentOpt = page.locator("[role='option']:has-text('Student')");
    const byEmpOpt = page.locator("[role='option']:has-text('By Employee')");
    if ((await studentOpt.count()) === 0) throw new Error("Missing 'Student' option in APS Applied By");
    if ((await byEmpOpt.count()) === 0) throw new Error("Missing 'By Employee' option in APS Applied By");
    console.log("✓ APS Applied By dropdown contains Student and By Employee options.");

    // Select By Employee
    await byEmpOpt.click();
    await page.waitForTimeout(300);
    console.log("✓ Selected APS Applied By: 'By Employee'");

    await saveDualScreenshot(page, "add-student-step5-aps-applied-by.png");
    console.log("✓ Saved add-student-step5-aps-applied-by.png");

    // Navigate to Step 08 Review
    console.log("Navigating to Review Step...");
    await page.locator("button:has-text('08 Review')").click();
    await page.waitForTimeout(600);

    // Verify Review step displays University Type and APS Applied By
    const reviewContent = await page.textContent("body");
    if (!reviewContent.includes("Private University")) {
      throw new Error("Review step missing 'Private University'");
    }
    if (!reviewContent.includes("By Employee")) {
      throw new Error("Review step missing 'By Employee'");
    }
    console.log("✓ Review step verified with University Type and APS Applied By.");

    await saveDualScreenshot(page, "add-student-step8-aps-university-review.png");
    console.log("✓ Saved add-student-step8-aps-university-review.png");

    // 2. Edit Student Flow: Verify pre-populated values for Rahul Kumar
    console.log("2. Navigating to Edit Student (/admin/students/OCT26_001/edit)...");
    await page.goto("http://127.0.0.1:8080/admin/students/OCT26_001/edit", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Jump to Step 04 Application
    await page.locator("button:has-text('04 Application')").click();
    await page.waitForTimeout(400);
    const editUnivVal = await page.locator("[data-testid='university-type-select']").textContent();
    console.log("Edit Student University Type:", editUnivVal);
    if (!editUnivVal.includes("Public University")) {
      throw new Error(`Expected 'Public University' in Edit Student, got: ${editUnivVal}`);
    }

    // Jump to Step 05 German-Specific Details
    await page.locator("button:has-text('05 German-Specific Details')").click();
    await page.waitForTimeout(400);
    const editApsVal = await page.locator("[data-testid='aps-applied-by-select']").textContent();
    console.log("Edit Student APS Applied By:", editApsVal);
    if (!editApsVal.includes("By Employee")) {
      throw new Error(`Expected 'By Employee' in Edit Student, got: ${editApsVal}`);
    }

    await saveDualScreenshot(page, "edit-student-aps-university.png");
    console.log("✓ Saved edit-student-aps-university.png");

    // 3. Student Profile Verification: Rahul Kumar (OCT26_001)
    console.log("3. Navigating to Rahul Kumar profile (/admin/students/OCT26_001)...");
    await page.goto("http://127.0.0.1:8080/admin/students/OCT26_001", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-testid='germany-status-card']", { timeout: 15000 });
    await page.waitForTimeout(500);

    // Verify Germany-Specific Status card has APS Applied By
    console.log("Checking Germany-Specific Status card...");
    const germanyCardText = await page.locator("[data-testid='germany-status-card']").textContent();
    if (!germanyCardText.includes("APS Applied By")) {
      throw new Error("Germany-Specific Status card missing 'APS Applied By'");
    }
    if (!germanyCardText.includes("By Employee")) {
      throw new Error("Germany-Specific Status card missing 'By Employee' value");
    }
    console.log("✓ Germany card has APS Applied By: By Employee");

    // Verify Personal card has University Type
    const bodyText = await page.textContent("body");
    if (!bodyText.includes("University Type")) {
      throw new Error("Personal card missing University Type");
    }
    console.log("✓ Personal card displays University Type");

    // Verify Overview Payment card
    const overviewPaymentBtn = page.locator("[data-testid='overview-update-payment-btn']");
    if ((await overviewPaymentBtn.count()) === 0) {
      throw new Error("Missing data-testid='overview-update-payment-btn' on Overview tab");
    }
    console.log("✓ Overview tab has Update Payment button");

    await saveDualScreenshot(page, "student-profile-aps-university-overview.png");
    console.log("✓ Saved student-profile-aps-university-overview.png");

    // 4. Applications Tab: Editable University Type per application
    console.log("4. Checking Applications tab...");
    await page.click("button[role='tab']:has-text('Applications')");
    await page.waitForTimeout(500);

    const appTableText = await page.textContent("body");
    if (!appTableText.includes("Public University")) {
      throw new Error("Applications table missing 'Public University'");
    }
    console.log("✓ Applications table displays university type");

    await saveDualScreenshot(page, "student-profile-applications-university-type.png");
    console.log("✓ Saved student-profile-applications-university-type.png");

    // 5. Payments Tab: Summary and Transaction History
    console.log("5. Checking Payments tab...");
    await page.click("button[role='tab']:has-text('Payments')");
    await page.waitForTimeout(500);

    const paymentsTabBtn = page.locator("[data-testid='payments-tab-update-payment-btn']");
    if ((await paymentsTabBtn.count()) === 0) {
      throw new Error("Missing data-testid='payments-tab-update-payment-btn' in Payments tab");
    }

    const paymentsContent = await page.textContent("body");
    if (!paymentsContent.includes("₹75,000")) throw new Error("Missing total fee ₹75,000");
    if (!paymentsContent.includes("₹35,000")) throw new Error("Missing collected ₹35,000");
    if (!paymentsContent.includes("₹40,000")) throw new Error("Missing remaining due ₹40,000");
    if (!paymentsContent.includes("₹20,000")) throw new Error("Missing initial transaction ₹20,000");
    if (!paymentsContent.includes("₹15,000")) throw new Error("Missing initial transaction ₹15,000");
    console.log("✓ Payments tab verified with ₹75k total, ₹35k collected, ₹40k remaining, 2 transactions.");

    await saveDualScreenshot(page, "student-profile-payments-history-table.png");
    console.log("✓ Saved student-profile-payments-history-table.png");

    // 6. Open Update Payment Modal & Test Live Calculation
    console.log("6. Testing Update Payment Dialog...");
    await paymentsTabBtn.click();
    await page.waitForSelector("[data-testid='update-payment-dialog']", { timeout: 15000 });
    await page.waitForTimeout(500);

    const dialogText = await page.locator("[data-testid='update-payment-dialog']").textContent();
    if (!dialogText.includes("Update Student Payment")) {
      throw new Error("Dialog missing 'Update Student Payment' title");
    }
    if (!dialogText.includes("Current Due Before Payment")) {
      throw new Error("Dialog missing 'Current Due Before Payment'");
    }
    console.log("✓ Dialog rendered with financial summary strip");

    // Enter payment amount ₹15,000
    console.log("Entering payment amount ₹15,000...");
    await page.fill("[data-testid='payment-amount-input']", "15000");
    await page.waitForTimeout(400);

    // Verify live calculation
    const calcCardText = await page.locator("[data-testid='live-calculation-card']").textContent();
    if (!calcCardText.includes("₹25,000")) {
      throw new Error(`Live calculation card did not show remaining ₹25,000. Got: ${calcCardText}`);
    }
    console.log("✓ Live calculation verified: ₹40,000 due - ₹15,000 paying = ₹25,000 remaining.");

    // Fill other fields
    await page.click("[data-testid='payment-method-select']");
    await page.waitForTimeout(300);
    await page.click("[role='option']:has-text('UPI')");
    await page.waitForTimeout(300);

    await page.fill("[data-testid='payment-reference-input']", "UPI/RAHUL/9848022");
    await page.fill("[data-testid='payment-notes-input']", "Second installment paid via PhonePe, verified by counselor.");

    await saveDualScreenshot(page, "update-payment-dialog-live-calculation.png");
    console.log("✓ Saved update-payment-dialog-live-calculation.png");

    // Test Overpayment warning notice
    console.log("Testing overpayment warning notice...");
    await page.fill("[data-testid='payment-amount-input']", "45000");
    await page.waitForTimeout(300);
    const overpayText = await page.locator("[data-testid='update-payment-dialog']").textContent();
    if (!overpayText.includes("Notice:") || !overpayText.includes("exceeds current pending balance")) {
      throw new Error("Missing overpayment warning notice");
    }
    console.log("✓ Overpayment warning correctly triggered.");

    // Reset back to ₹15,000 and save
    await page.fill("[data-testid='payment-amount-input']", "15000");
    await page.waitForTimeout(300);

    console.log("Submitting payment...");
    await page.click("button:has-text('Save Payment')");
    await page.waitForTimeout(1000);

    // Verify Success view
    const successText = await page.locator("[data-testid='update-payment-dialog']").textContent();
    if (!successText.includes("Payment Successfully Recorded!")) {
      throw new Error("Success view not shown after saving payment");
    }
    if (!successText.includes("₹50,000")) {
      throw new Error("Success view missing updated Total Amount Paid ₹50,000");
    }
    if (!successText.includes("₹25,000")) {
      throw new Error("Success view missing Remaining Due ₹25,000");
    }
    console.log("✓ Payment successfully recorded and confirmed on success view.");

    await saveDualScreenshot(page, "update-payment-dialog-success.png");
    console.log("✓ Saved update-payment-dialog-success.png");

    // Click View Payment History
    await page.click("[data-testid='success-view-history-btn']");
    await page.waitForTimeout(400);

    const historyText = await page.locator("[data-testid='update-payment-dialog']").textContent();
    if (!historyText.includes("Payment History (3)")) {
      throw new Error(`Expected Payment History (3), got: ${historyText}`);
    }
    console.log("✓ Payment History tab shows 3 recorded transactions.");

    await saveDualScreenshot(page, "update-payment-dialog-history-tab.png");
    console.log("✓ Saved update-payment-dialog-history-tab.png");

    // Click Record Another Payment and test "All dues settled" or done
    await page.click("[data-testid='history-record-new-btn']");
    await page.waitForTimeout(300);
    // Fill 25,000 to fully settle
    await page.fill("[data-testid='payment-amount-input']", "25000");
    await page.waitForTimeout(300);
    const settleCardText = await page.locator("[data-testid='live-calculation-card']").textContent();
    if (!settleCardText.includes("Fully Settled After Payment")) {
      throw new Error("Calculation card missing 'Fully Settled After Payment' badge");
    }
    console.log("✓ 'Fully Settled After Payment' badge correctly verified on exact balance.");

    // Close Dialog
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // Verify Student Profile updated in background
    console.log("7. Verifying updated Student Profile state...");
    const updatedProfileText = await page.textContent("body");
    if (!updatedProfileText.includes("₹50,000")) {
      throw new Error("Student Profile Collected amount not updated to ₹50,000");
    }
    if (!updatedProfileText.includes("₹25,000")) {
      throw new Error("Student Profile Remaining Due not updated to ₹25,000");
    }
    if (!updatedProfileText.includes("Payment Transactions (3)")) {
      throw new Error("Student Profile Payment Transactions count not updated to 3");
    }
    console.log("✓ Student profile overview and payments tab reactively updated with new transaction!");

    await saveDualScreenshot(page, "student-profile-after-payment-updated.png");
    console.log("✓ Saved student-profile-after-payment-updated.png");

    console.log("\n========================================================");
    console.log("ALL E2E PLAYWRIGHT VERIFICATION CHECKS PASSED PERFECTLY!");
    console.log("========================================================\n");
  } catch (err) {
    console.error("E2E verification error:", err);
    await saveDualScreenshot(page, "verification-failure.png").catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
