import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";

async function run() {
  console.log("=== Abroad Aspirants: Germany-Specific Status Controls Verification ===");
  console.log("1. Launching Chromium...");
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

  // 2. Navigate to Germany student (OCT26_001)
  console.log("3. Navigating to Germany student detail page (OCT26_001)...");
  await page.goto("http://127.0.0.1:8080/employee/students/OCT26_001", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('text="Current status"', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // 3. Verify Germany-Specific Status Card visibility & placement
  console.log("4. Verifying Germany-Specific Status Card on Overview...");
  const docStatusCard = page.locator('div:has(> div > div > p:text-is("Document Submission Status"))').first();
  assert.ok(await docStatusCard.isVisible(), "Document Submission Status card must be visible");

  const germanyCard = page.locator('[data-testid="germany-status-card"]');
  assert.ok(await germanyCard.isVisible(), "Germany-Specific Status card must be prominently visible on Overview");

  // Verify header button for Germany Status
  console.log("5. Verifying Header Quick Access [Germany Status] button...");
  const headerGermanyBtn = page.locator('button:has-text("Germany Status")').first();
  assert.ok(await headerGermanyBtn.isVisible(), "[Germany Status] header button must be visible for Germany student");

  // 4. Verify 3 Status Controls exist and are interactive comboboxes
  console.log("6. Verifying 3 interactive status controls on the card...");
  const blockedTrigger = germanyCard.locator('[data-testid="status-field-blocked-account-trigger"]');
  const enrollTrigger = germanyCard.locator('[data-testid="status-field-enrollment-status-trigger"]');
  const dormTrigger = germanyCard.locator('[data-testid="status-field-student-dorm-status-trigger"]');

  assert.ok(await blockedTrigger.isVisible() && await blockedTrigger.isEnabled(), "Blocked Account must be an enabled interactive combobox");
  assert.ok(await enrollTrigger.isVisible() && await enrollTrigger.isEnabled(), "Enrollment Status must be an enabled interactive combobox");
  assert.ok(await dormTrigger.isVisible() && await dormTrigger.isEnabled(), "Student Dorm Status must be an enabled interactive combobox");

  const initialBlocked = (await blockedTrigger.textContent()).trim();
  const initialEnroll = (await enrollTrigger.textContent()).trim();
  const initialDorm = (await dormTrigger.textContent()).trim();
  console.log(`Initial values -> Blocked Account: "${initialBlocked}", Enrollment: "${initialEnroll}", Dorm: "${initialDorm}"`);

  // 5. Test Blocked Account Update & Instant Feedback
  console.log("7. Testing Blocked Account update to 'Funds Deposited'...");
  await blockedTrigger.click();
  await page.waitForTimeout(300);
  const fundsDepOption = page.locator('[role="option"]:has-text("Funds Deposited")');
  assert.ok(await fundsDepOption.isVisible(), "Option 'Funds Deposited' must be present in dropdown");
  await fundsDepOption.click();

  // Verify toast appears
  await page.getByText(/Blocked Account status updated successfully/).first().waitFor({ timeout: 5000 });
  console.log("✓ Success toast received for Blocked Account.");

  // Check updated text
  await page.waitForTimeout(400);
  const newBlockedVal = (await blockedTrigger.textContent()).trim();
  console.log(`Updated Blocked Account: "${newBlockedVal}"`);
  assert.ok(newBlockedVal.includes("Funds Deposited"), "Blocked Account trigger must reflect 'Funds Deposited'");

  // Verify field independence: Enrollment and Dorm have not changed
  assert.equal((await enrollTrigger.textContent()).trim(), initialEnroll, "Changing Blocked Account must NOT change Enrollment Status");
  assert.equal((await dormTrigger.textContent()).trim(), initialDorm, "Changing Blocked Account must NOT change Student Dorm Status");

  // 6. Test Enrollment Status Update & Instant Feedback
  console.log("8. Testing Enrollment Status update to 'Awaiting Confirmation'...");
  await enrollTrigger.click();
  await page.waitForTimeout(300);
  const awaitingConfOption = page.locator('[role="option"]:has-text("Awaiting Confirmation")');
  assert.ok(await awaitingConfOption.isVisible(), "Option 'Awaiting Confirmation' must be present");
  await awaitingConfOption.click();

  await page.getByText(/Enrollment Status status updated successfully/).first().waitFor({ timeout: 5000 });
  console.log("✓ Success toast received for Enrollment Status.");

  await page.waitForTimeout(400);
  const newEnrollVal = (await enrollTrigger.textContent()).trim();
  console.log(`Updated Enrollment Status: "${newEnrollVal}"`);
  assert.ok(newEnrollVal.includes("Awaiting Confirmation"), "Enrollment Status trigger must reflect 'Awaiting Confirmation'");

  // Verify field independence
  assert.ok((await blockedTrigger.textContent()).trim().includes("Funds Deposited"), "Blocked Account must remain 'Funds Deposited'");
  assert.equal((await dormTrigger.textContent()).trim(), initialDorm, "Dorm status must remain initial value");

  // 7. Test Student Dorm Status Update & Instant Feedback
  console.log("9. Testing Student Dorm Status update to 'Waiting List'...");
  await dormTrigger.click();
  await page.waitForTimeout(300);
  const waitingListOption = page.locator('[role="option"]:has-text("Waiting List")');
  assert.ok(await waitingListOption.isVisible(), "Option 'Waiting List' must be present");
  await waitingListOption.click();

  await page.getByText(/Student Dorm Status status updated successfully/).first().waitFor({ timeout: 5000 });
  console.log("✓ Success toast received for Student Dorm Status.");

  await page.waitForTimeout(400);
  const newDormVal = (await dormTrigger.textContent()).trim();
  console.log(`Updated Student Dorm Status: "${newDormVal}"`);
  assert.ok(newDormVal.includes("Waiting List"), "Student Dorm Status trigger must reflect 'Waiting List'");

  // 8. Capture screenshot of the overview card with updated statuses
  console.log("10. Capturing screenshot of Overview with updated Germany-Specific Status...");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: "screenshots/germany-status-card-overview.png" });

  // 9. Test Persistence across Browser Reload
  console.log("11. Testing persistence across browser reload (page.reload)...");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('text="Current status"', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const reloadedGermanyCard = page.locator('[data-testid="germany-status-card"]');
  const reloadedBlocked = (await reloadedGermanyCard.locator('[data-testid="status-field-blocked-account-trigger"]').textContent()).trim();
  const reloadedEnroll = (await reloadedGermanyCard.locator('[data-testid="status-field-enrollment-status-trigger"]').textContent()).trim();
  const reloadedDorm = (await reloadedGermanyCard.locator('[data-testid="status-field-student-dorm-status-trigger"]').textContent()).trim();

  console.log(`Reloaded values -> Blocked: "${reloadedBlocked}", Enroll: "${reloadedEnroll}", Dorm: "${reloadedDorm}"`);
  assert.ok(reloadedBlocked.includes("Funds Deposited"), "Blocked Account must persist after reload");
  assert.ok(reloadedEnroll.includes("Awaiting Confirmation"), "Enrollment Status must persist after reload");
  assert.ok(reloadedDorm.includes("Waiting List"), "Student Dorm Status must persist after reload");
  console.log("✓ Persistence verified 100% across page reload!");

  // 10. Test Quick Germany Status Dialog from Header Button
  console.log("12. Testing Quick Germany Status modal dialog via [Germany Status] header button...");
  await page.locator('button:has-text("Germany Status")').first().click();
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

  const dialog = page.locator('[role="dialog"]');
  assert.ok(await dialog.isVisible(), "Quick Germany Status dialog must open");
  console.log("Dialog Title:", await dialog.locator('h2').textContent());

  // Capture screenshot of the Quick Germany Status Dialog
  await page.waitForTimeout(300);
  await page.screenshot({ path: "screenshots/germany-status-quick-dialog.png" });

  // Change Blocked Account in Dialog to "Yes"
  console.log("13. Updating Blocked Account to 'Yes' inside modal dialog...");
  const modalBlockedTrigger = dialog.locator('[data-testid="status-field-blocked-account-trigger"]');
  await modalBlockedTrigger.click();
  await page.waitForTimeout(300);

  const yesOption = page.locator('[role="option"]:has-text("Yes")').first();
  assert.ok(await yesOption.isVisible(), "Option 'Yes' must be available");
  await yesOption.click();

  await page.getByText(/Blocked Account status updated successfully/).first().waitFor({ timeout: 5000 });
  console.log("✓ Status updated from modal dialog.");

  // Close dialog
  await dialog.locator('button:has-text("Close")').first().click();
  await page.waitForTimeout(500);

  // Verify Overview card now reflects "Yes"
  const overviewBlockedAfterDialog = (await page.locator('[data-testid="germany-status-card"] [data-testid="status-field-blocked-account-trigger"]').textContent()).trim();
  console.log(`Overview Blocked Account after dialog change: "${overviewBlockedAfterDialog}"`);
  assert.ok(overviewBlockedAfterDialog.includes("Yes"), "Overview card must immediately reflect change made in modal dialog");

  // 11. Test Activity Tab to verify Audit Log entries
  console.log("14. Verifying Activity Tab records the status changes in audit history...");
  await page.locator('button[role="tab"]:has-text("Activity")').click();
  await page.waitForTimeout(600);

  const activityPanel = page.locator('div[role="tabpanel"][data-state="active"]');
  const activityText = await activityPanel.textContent();
  console.log("Activity snippet:", activityText.slice(0, 300));
  assert.ok(activityText.includes("Blocked Account"), "Audit history must record Blocked Account updates");
  assert.ok(activityText.includes("Enrollment Status"), "Audit history must record Enrollment Status updates");
  assert.ok(activityText.includes("Student Dorm Status"), "Audit history must record Student Dorm Status updates");
  assert.ok(activityText.includes("Nagaraju") || activityText.includes("Staff") || activityText.includes("Employee"), "Audit history must record acting staff member");
  console.log("✓ Audit history verified with actor, fields, and values.");

  await page.screenshot({ path: "screenshots/germany-status-activity-audit.png" });

  // 12. Test Non-Germany Student Handling
  console.log("15. Testing non-Germany student handling (navigating to students list)...");
  await page.goto("http://127.0.0.1:8080/employee/students", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('table', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Find a student whose destination is NOT Germany (e.g. Canada, UK, Australia, USA)
  const nonGermanyRow = page.locator('tbody tr:has-text("Canada"), tbody tr:has-text("UK"), tbody tr:has-text("USA"), tbody tr:has-text("Australia")').first();
  assert.ok(await nonGermanyRow.isVisible(), "Must find a non-Germany student in list");
  await nonGermanyRow.click();
  await page.waitForSelector('text="Current status"', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Verify that the [Germany Status] header button is NOT visible
  const nonGermanyHeaderBtn = page.locator('button:has-text("Germany Status")');
  assert.equal(await nonGermanyHeaderBtn.count(), 0, "Non-Germany student must NOT have [Germany Status] header button");

  // Verify that Overview has clean "Not applicable" notice
  const nonGermanyCard = page.getByText(/Not applicable \(Destination country:/);
  assert.ok(await nonGermanyCard.isVisible(), "Non-Germany student must show clean 'Not applicable' card");
  console.log("✓ Non-Germany student gracefully handled with clean 'Not applicable' indicator:", await nonGermanyCard.textContent());

  await page.screenshot({ path: "screenshots/germany-status-non-germany.png" });

  assert.equal(consoleErrors.length, 0, `Unexpected console errors: ${consoleErrors.join(", ")}`);
  console.log("======================================================================");
  console.log("ALL GERMANY STATUS CONTROLS TESTS PASSED WITH 100% SUCCESS!");
  console.log("======================================================================");

  await browser.close();
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
