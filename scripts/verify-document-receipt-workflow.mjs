import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const artifactDir = "C:\\Users\\deept\\.gemini\\antigravity\\brain\\acc09169-be98-44b2-9a20-9220aeec8ba0";

async function run() {
  console.log("=== Abroad Aspirants: Overall Document Receipt Status & Students List Verification ===");
  console.log("1. Launching Chromium browser...");
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

  // Ensure screenshot directories exist
  const screenshotsDir = path.join(root, "screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // 1. Sign in as employee
  console.log("2. Signing in as Employee (Nagaraju / Admissions)...");
  await page.goto("http://127.0.0.1:8080/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  await page.waitForFunction(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.includes("Employee"));
    if (btn) btn.click();
    const input = document.querySelector('input[type="email"]');
    return input && input.value === "employee@demo.com";
  }, { timeout: 10000 });

  await page.waitForTimeout(300);
  await page.locator('button[type="submit"]:has-text("Sign in")').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
  console.log("✓ Signed in successfully.");

  // 2. Navigate to Student Detail (OCT26_001) Documents tab
  console.log("3. Navigating to student OCT26_001 with tab=documents...");
  await page.goto("http://127.0.0.1:8080/employee/students/OCT26_001?tab=documents", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="overall-document-receipt-card"]', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // 3. Verify Document Receipt Status Card placement & components
  console.log("4. Verifying Overall Document Receipt Status Card in Documents tab...");
  const receiptCard = page.locator('[data-testid="overall-document-receipt-card"]');
  assert.ok(await receiptCard.isVisible(), "Overall Document Receipt Status card must be prominently visible");

  const title = receiptCard.locator('h3:has-text("Overall Document Receipt Status")');
  assert.ok(await title.isVisible(), "Card title 'Overall Document Receipt Status' must be visible");

  const statusTrigger = receiptCard.locator('[data-testid="document-receipt-status-trigger"]');
  const saveBtn = receiptCard.locator('[data-testid="save-document-receipt-status-button"]');

  assert.ok(await statusTrigger.isVisible() && await statusTrigger.isEnabled(), "Status trigger must be interactive");
  assert.ok(await saveBtn.isVisible(), "Save Status button must be visible");
  assert.ok(await saveBtn.isDisabled(), "Save Status button must be initially disabled when no change has been made");

  const initialStatusText = (await statusTrigger.textContent()).trim();
  console.log(`Initial status dropdown value: "${initialStatusText}"`);

  // Target a new status
  const targetStatus = initialStatusText === "Completely Received" ? "Partially Received" : "Completely Received";
  console.log(`5. Selecting new status: "${targetStatus}"...`);

  await statusTrigger.click();
  await page.waitForTimeout(300);

  const option = page.locator(`[role="option"]:has-text("${targetStatus}")`);
  assert.ok(await option.isVisible(), `Option '${targetStatus}' must be present in dropdown`);
  await option.click();
  await page.waitForTimeout(300);

  // Check Save button is now enabled
  assert.ok(await saveBtn.isEnabled(), "Save Status button must be enabled when a different status is selected");

  // 4. Click Save Status and verify toast and persistence
  console.log("6. Clicking [Save Status]...");
  await saveBtn.click();

  await page.getByText(/Document receipt status updated successfully/).first().waitFor({ timeout: 6000 });
  console.log("✓ Success toast received: 'Document receipt status updated successfully.'");

  // Wait a moment for store persistence
  await page.waitForTimeout(600);
  assert.ok(await saveBtn.isDisabled(), "Save button should return to disabled state after successful save");

  // Screenshot 1: Documents Tab with Document Receipt Status Card
  console.log("7. Capturing screenshot of Documents Tab with Document Receipt Status Card...");
  const docTabScreenshot = path.join(screenshotsDir, "document-receipt-card-documents-tab.png");
  await page.screenshot({ path: docTabScreenshot });

  // 5. Verify Persistence on Refresh
  console.log("8. Verifying persistence across page refresh...");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="overall-document-receipt-card"]', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const refreshedTriggerText = (await page.locator('[data-testid="document-receipt-status-trigger"]').textContent()).trim();
  console.log(`Refreshed status dropdown value: "${refreshedTriggerText}"`);
  assert.ok(
    refreshedTriggerText.includes(targetStatus),
    `Status must persist across page reload (expected: "${targetStatus}", got: "${refreshedTriggerText}")`,
  );
  console.log("✓ Status persisted across reload.");

  // 6. Check Activity log for Audit trail
  console.log("9. Verifying audit log entry on Activity tab...");
  const activityTabTrigger = page.locator('button[role="tab"]:has-text("Activity")');
  if (await activityTabTrigger.isVisible()) {
    await activityTabTrigger.click();
    await page.waitForTimeout(600);
    const auditText = await page.locator("body").textContent();
    assert.ok(
      auditText.includes("Overall Document Receipt Status"),
      "Audit trail must log Overall Document Receipt Status change",
    );
    console.log("✓ Audit trail verified on Activity tab.");
  }

  // 7. Navigate to Students list
  console.log("10. Navigating to Students list (/employee/students)...");
  await page.goto("http://127.0.0.1:8080/employee/students", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('th:has-text("Document Status")', { timeout: 10000 });
  await page.waitForTimeout(1000);

  console.log("✓ 'Document Status' column header is present in table.");

  // Verify cell content for OCT26_001
  const studentCell = page.locator('[data-testid="document-status-cell-OCT26_001"]');
  assert.ok(await studentCell.isVisible(), "Student cell for OCT26_001 must be visible in table");
  const cellText = await studentCell.textContent();
  console.log(`OCT26_001 Document Status cell text: "${cellText.trim()}"`);
  assert.ok(cellText.includes(targetStatus), `Cell must display saved status '${targetStatus}'`);
  assert.ok(cellText.includes("documents"), "Cell must display document count");

  // Screenshot 2: Students Table with Document Status Column
  console.log("11. Capturing screenshot of Students table with Document Status column...");
  const tableScreenshot = path.join(screenshotsDir, "students-table-document-status-column.png");
  await page.screenshot({ path: tableScreenshot });

  // 8. Test Clicking Document Status Cell to Navigate
  console.log("12. Testing click on Document Status cell navigates directly to Documents tab...");
  await studentCell.click();
  await page.waitForURL((url) => url.pathname.includes("/students/OCT26_001"), { timeout: 10000 });
  await page.waitForTimeout(800);

  // Assert documents tab is active
  const documentsTabActive = await page.locator('[data-testid="overall-document-receipt-card"]').isVisible();
  assert.ok(documentsTabActive, "Clicking Document Status cell must navigate directly into Documents tab");
  console.log("✓ Direct navigation to Documents tab confirmed.");

  // 9. Return to Students list and test Document Status Filter
  console.log("13. Testing Document Status dropdown filter on Students list...");
  await page.goto("http://127.0.0.1:8080/employee/students", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('th:has-text("Document Status")', { timeout: 10000 });
  await page.waitForTimeout(800);

  // Initial row count
  const initialRowCount = await page.locator("tbody tr").count();
  console.log(`Total students before filtering: ${initialRowCount}`);

  // Find filter select with placeholder "Document Status"
  const filterTrigger = page.locator('button:has-text("Document Status"), button:has-text("All Document Statuses")').first();
  await filterTrigger.click();
  await page.waitForTimeout(300);

  // Filter by targetStatus
  const filterOption = page.locator(`[role="option"]:has-text("${targetStatus}")`);
  assert.ok(await filterOption.isVisible(), `Filter option '${targetStatus}' must exist`);
  await filterOption.click();
  await page.waitForTimeout(500);

  const filteredRowCount = await page.locator("tbody tr").count();
  console.log(`Filtered student count for '${targetStatus}': ${filteredRowCount}`);
  assert.ok(filteredRowCount > 0, "Filtered list should contain matching students");

  // Screenshot 3: Filtered Students Table
  console.log("14. Capturing screenshot of Filtered Students Table...");
  const filterScreenshot = path.join(screenshotsDir, "students-table-document-status-filter.png");
  await page.screenshot({ path: filterScreenshot });

  // 10. Copy screenshots to artifact directory
  console.log("15. Copying screenshots to artifacts directory...");
  if (fs.existsSync(artifactDir)) {
    fs.copyFileSync(docTabScreenshot, path.join(artifactDir, "document-receipt-card-documents-tab.png"));
    fs.copyFileSync(tableScreenshot, path.join(artifactDir, "students-table-document-status-column.png"));
    fs.copyFileSync(filterScreenshot, path.join(artifactDir, "students-table-document-status-filter.png"));
    console.log("✓ Screenshots copied to artifacts directory.");
  }

  // 11. Assert console errors
  assert.equal(consoleErrors.length, 0, `Browser console had unexpected errors: ${JSON.stringify(consoleErrors)}`);

  await browser.close();
  console.log("=== All Overall Document Receipt Status & Students List verifications passed successfully! ===");
  process.exit(0);
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
