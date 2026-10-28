import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const screenshotsDir = path.join(root, "screenshots");
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  console.log("1. Signing in as Employee (Senior Counselor Nagaraju)...");
  await page.goto("http://127.0.0.1:8080/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  await page.waitForFunction(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.includes("Employee"));
    if (btn) btn.click();
    const input = document.querySelector('input[type="email"]');
    return input && input.value === "employee@demo.com";
  }, { timeout: 10000 });

  await page.waitForTimeout(300);
  await page.locator('button[type="submit"]:has-text("Sign in")').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
  console.log("✓ Signed in as employee successfully.");

  console.log("2. Navigating to employee student detail (OCT26_001)...");
  await page.goto("http://127.0.0.1:8080/employee/students/OCT26_001", {
    waitUntil: "networkidle",
  });

  // Verify header update payment button is visible for employee
  const headerBtn = page.locator('[data-testid="header-update-payment-btn"]');
  await headerBtn.waitFor({ state: "visible", timeout: 8000 });
  console.log("✓ Header Update Payment button is visible for employee");

  // Verify Overview Payment Card
  const overviewCard = page.locator('[data-testid="overview-payment-card"]');
  await overviewCard.waitFor({ state: "visible", timeout: 5000 });
  console.log("✓ Overview Payment Card is visible for employee");

  const overviewBtn = page.locator('[data-testid="overview-update-payment-btn"]');
  await overviewBtn.waitFor({ state: "visible", timeout: 5000 });
  console.log("✓ Overview Update Payment button is visible");

  // Take screenshot of employee student detail with overview payment card
  await page.screenshot({ path: path.join(screenshotsDir, "employee-student-profile-overview.png") });
  console.log("✓ Saved employee-student-profile-overview.png");

  // Click Update Payment button to open modal
  await headerBtn.click();

  const dialog = page.locator('[data-testid="update-payment-dialog"]');
  await dialog.waitFor({ state: "visible", timeout: 5000 });
  console.log("✓ Update Payment Dialog opened");

  // Verify top metric strip contains Net Payable
  const topStripText = await dialog.innerText();
  if (!topStripText.includes("Net Payable")) {
    throw new Error("Expected dialog top metric strip to contain 'Net Payable'");
  }
  console.log("✓ Dialog contains Net Payable metric");

  // Enter payment amount: 15000
  const amountInput = page.locator('[data-testid="payment-amount-input"]');
  await amountInput.fill("15000");

  // Verify live calculation card
  const liveCalcCard = page.locator('[data-testid="live-calculation-card"]');
  await liveCalcCard.waitFor({ state: "visible", timeout: 5000 });

  const formulaBox = page.locator('[data-testid="payment-math-formula-box"]');
  await formulaBox.waitFor({ state: "visible", timeout: 5000 });
  console.log("✓ Live calculation card and formula box rendered");

  const calcText = await liveCalcCard.innerText();
  console.log("Live Calculation Card text:\n" + calcText);

  if (!calcText.includes("50,000") || !calcText.includes("25,000")) {
    throw new Error("Expected live calculation to compute ₹50,000 total paid and ₹25,000 remaining due!");
  }
  console.log("✓ Live mathematical formulas verified (Total Paid: ₹50,000, Remaining: ₹25,000)");

  // Take screenshot of live calculation card
  await page.screenshot({ path: path.join(screenshotsDir, "employee-payment-live-calculation.png") });
  console.log("✓ Saved employee-payment-live-calculation.png");

  // Submit payment
  const saveBtn = dialog.locator('button:has-text("Save Payment")');
  await saveBtn.click();

  // Verify success screen
  const doneBtn = page.locator('[data-testid="success-done-btn"]');
  await doneBtn.waitFor({ state: "visible", timeout: 8000 });
  console.log("✓ Payment successfully saved, success screen rendered");

  // Take screenshot of success screen
  await page.screenshot({ path: path.join(screenshotsDir, "employee-payment-success-screen.png") });
  console.log("✓ Saved employee-payment-success-screen.png");

  // Click Done to close modal
  await doneBtn.click();
  await dialog.waitFor({ state: "hidden", timeout: 5000 });
  console.log("✓ Dialog closed");

  // Verify updated student profile numbers
  const overviewCardUpdatedText = await overviewCard.innerText();
  console.log("Updated Overview Payment Card text:\n" + overviewCardUpdatedText);
  if (!overviewCardUpdatedText.includes("50,000") || !overviewCardUpdatedText.includes("25,000")) {
    throw new Error("Expected overview card to display updated Collected: ₹50,000 and Remaining: ₹25,000!");
  }
  console.log("✓ Profile overview card updated with accurate math figures!");

  // Switch to Payments tab
  const paymentsTabTrigger = page.locator('button[role="tab"]:has-text("Payments")');
  await paymentsTabTrigger.click();

  const formulaBanner = page.locator('[data-testid="payments-tab-formula-banner"]');
  await formulaBanner.waitFor({ state: "visible", timeout: 5000 });
  console.log("✓ Payments tab formula banner is visible");

  // Take screenshot of payments tab with formula banner and history
  await page.screenshot({ path: path.join(screenshotsDir, "employee-student-payments-tab.png") });
  console.log("✓ Saved employee-student-payments-tab.png");

  // Navigate to /employee/payments
  console.log("2. Navigating to /employee/payments...");
  await page.goto("http://127.0.0.1:8080/employee/payments", {
    waitUntil: "networkidle",
  });

  const paymentsHeader = page.locator('h1:has-text("Payments")');
  await paymentsHeader.waitFor({ state: "visible", timeout: 8000 });
  console.log("✓ /employee/payments loaded for employee without restrictions");

  // Take screenshot of employee payments page
  await page.screenshot({ path: path.join(screenshotsDir, "employee-payments-list-page.png") });
  console.log("✓ Saved employee-payments-list-page.png");

  await browser.close();
  console.log("🎉 All Employee Payment & Maths Formula verifications PASSED!");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
