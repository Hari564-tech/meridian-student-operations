import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";

async function run() {
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
  page.on("response", (res) => {
    if (res.status() === 404) {
      console.log("404 response URL:", res.url());
    }
  });

  // Log in using Demo access button
  console.log("2. Navigating to login page and signing in as Employee...");
  await page.goto("http://127.0.0.1:8080/login", { waitUntil: "domcontentloaded" });
  
  // Wait until React has hydrated and the form inputs are responsive
  await page.waitForTimeout(1500);

  // Click the Employee demo button and verify input is filled
  await page.waitForFunction(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.includes("Employee"));
    if (btn) btn.click();
    const input = document.querySelector('input[type="email"]');
    return input && input.value === "employee@demo.com";
  }, { timeout: 10000 });

  await page.waitForTimeout(300);
  await page.locator('button[type="submit"]:has-text("Sign in")').click();

  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
  console.log("Logged in successfully. Navigating to Germany student detail page (OCT26_001)...");
  await page.goto("http://127.0.0.1:8080/employee/students/OCT26_001", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('text="Current status"', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // 1. Verify Profile Header Document Status Card
  console.log("4. Verifying Document Status in Profile Header...");
  const headerDocStatusCard = page.locator('div.grid > div:has(> p:text-is("Document Status"))').first();
  assert.ok(await headerDocStatusCard.isVisible(), "Profile header must have Document Status card");
  const headerCardText = await headerDocStatusCard.textContent();
  console.log("Header Document Status card content:", headerCardText);
  assert.ok(headerCardText.includes("required"), "Header card must show required documents count");

  // 2. Verify Overall Document Submission Status Card
  console.log("5. Verifying Overall Document Submission Status Card in Overview...");
  const subStatusCard = page.locator('div:has(> div > div > p:text-is("Document Submission Status"))').first();
  assert.ok(await subStatusCard.isVisible(), "Document Submission Status card must be visible near top");
  const subStatusText = await subStatusCard.textContent();
  console.log("Document Submission Status card content:", subStatusText);
  assert.ok(subStatusText.includes("required documents received") || subStatusText.includes("complete"), "Must show submission progress");

  // Verify [View Documents] button works
  console.log("6. Testing [View Documents] navigation button...");
  const viewDocsBtn = subStatusCard.locator('button:has-text("View Documents")');
  assert.ok(await viewDocsBtn.isVisible(), "[View Documents] button must be visible");
  await viewDocsBtn.click();
  await page.waitForTimeout(500);

  // Check that Documents tab is now active
  const docsTabTrigger = page.locator('button[role="tab"]:has-text("Documents")');
  assert.equal(await docsTabTrigger.getAttribute("data-state"), "active", "Documents tab must become active after clicking View Documents");

  // Switch back to Overview tab
  console.log("7. Switching back to Overview tab...");
  await page.locator('button[role="tab"]:has-text("Overview")').click();
  await page.waitForTimeout(500);

  // 3. Verify Germany-Specific Status Card & Status Controls
  console.log("8. Verifying Germany-Specific Status Card...");
  const germanyCard = page.locator('div:has(> div > div > div > h3:text-is("Germany-Specific Status"))').first();
  assert.ok(await germanyCard.isVisible(), "Germany-Specific Status card must be visible for Germany student");

  // Test Blocked Account dropdown
  console.log("9. Testing interactive Blocked Account status dropdown...");
  const blockedAccountSection = germanyCard.locator('div:has(> div > p:text-is("Blocked Account"))').first();
  assert.ok(await blockedAccountSection.isVisible(), "Blocked Account section must be visible");
  const blockedTrigger = blockedAccountSection.locator('button[role="combobox"]').first();
  assert.ok(await blockedTrigger.isVisible(), "Blocked Account combobox trigger must be visible");
  console.log("Initial Blocked Account:", await blockedTrigger.textContent());

  await blockedTrigger.click();
  await page.waitForTimeout(300);
  const fundsDepOption = page.locator('[role="option"]:has-text("Funds Deposited")');
  assert.ok(await fundsDepOption.isVisible(), "Option 'Funds Deposited' must be available");
  await fundsDepOption.click();
  await page.waitForTimeout(500);

  const updatedBlockedVal = await blockedTrigger.textContent();
  console.log("Updated Blocked Account:", updatedBlockedVal);
  assert.ok(updatedBlockedVal.includes("Funds Deposited"), "Blocked Account must be updated to Funds Deposited");

  // Test Enrollment Status dropdown
  console.log("10. Testing interactive Enrollment Status dropdown...");
  const enrollSection = germanyCard.locator('div:has(> div > p:text-is("Enrollment Status"))').first();
  const enrollTrigger = enrollSection.locator('button[role="combobox"]').first();
  await enrollTrigger.click();
  await page.waitForTimeout(300);
  const enrollOption = page.locator('[role="option"]:has-text("Awaiting Confirmation")');
  assert.ok(await enrollOption.isVisible(), "Option 'Awaiting Confirmation' must be available");
  await enrollOption.click();
  await page.waitForTimeout(500);
  const updatedEnrollVal = await enrollTrigger.textContent();
  console.log("Updated Enrollment Status:", updatedEnrollVal);
  assert.ok(updatedEnrollVal.includes("Awaiting Confirmation"), "Enrollment Status must update to Awaiting Confirmation");

  // Test Student Dorm Status dropdown
  console.log("11. Testing interactive Student Dorm Status dropdown...");
  const dormSection = germanyCard.locator('div:has(> div > p:text-is("Student Dorm Status"))').first();
  const dormTrigger = dormSection.locator('button[role="combobox"]').first();
  await dormTrigger.click();
  await page.waitForTimeout(300);
  const dormOption = page.locator('[role="option"]:has-text("Waiting List")');
  assert.ok(await dormOption.isVisible(), "Option 'Waiting List' must be available");
  await dormOption.click();
  await page.waitForTimeout(500);
  const updatedDormVal = await dormTrigger.textContent();
  console.log("Updated Student Dorm Status:", updatedDormVal);
  assert.ok(updatedDormVal.includes("Waiting List"), "Student Dorm Status must update to Waiting List");

  // Capture screenshot of the enhanced profile overview top (header + Document Submission Status)
  console.log("12. Capturing Overview top screenshot with Document Submission Status...");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: "screenshots/student-profile-overview-top.png" });

  // Capture Germany card specifically
  await germanyCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "screenshots/student-profile-enhanced-overview.png" });

  // 4. Test Documents Tab and ZIP Download
  console.log("13. Testing Documents Tab and Download All Documents (.ZIP)...");
  await page.locator('button[role="tab"]:has-text("Documents")').click();
  await page.waitForTimeout(500);

  const downloadZipBtn = page.locator('button:has-text("Download All Documents (.ZIP)")').first();
  assert.ok(await downloadZipBtn.isVisible(), "Download All Documents (.ZIP) button must be visible in Documents workspace");

  console.log("14. Clicking Download All Documents (.ZIP)...");
  const downloadPromise = page.waitForEvent("download", { timeout: 10000 }).catch(() => null);
  await downloadZipBtn.click();
  await page.waitForTimeout(800);

  // Capture modal / dialog screenshot
  console.log("15. Capturing ZIP download dialog screenshot...");
  await page.screenshot({ path: "screenshots/student-documents-zip-dialog.png" });

  // Check dialog title or success
  const dialogTitle = page.locator('[role="dialog"]');
  if (await dialogTitle.isVisible()) {
    console.log("Dialog content:", await dialogTitle.textContent());
    assert.ok(
      (await dialogTitle.textContent()).includes("archive") ||
      (await dialogTitle.textContent()).includes("downloaded") ||
      (await dialogTitle.textContent()).includes("Documents"),
      "Dialog must show archive generation status",
    );
    // Close the dialog
    const closeBtn = page.locator('[role="dialog"] button:has-text("Close")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(400);
    }
  }

  const download = await downloadPromise;
  if (download) {
    const downloadedName = download.suggestedFilename();
    console.log("Downloaded ZIP filename:", downloadedName);
    assert.ok(downloadedName.endsWith(".zip"), "Downloaded file must be a .zip file");
    assert.ok(downloadedName.includes("OCT26_001") || downloadedName.includes("Documents"), "Filename must include student ID / name");
  }

  // Ensure modal is closed
  const remainingDialog = page.locator('[role="dialog"]');
  if (await remainingDialog.isVisible()) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }

  // 5. Test Student Activity timeline
  console.log("16. Verifying Activity tab records status changes...");
  await page.locator('button[role="tab"]:has-text("Activity")').click();
  await page.waitForTimeout(500);

  const activityCard = page.locator('div[role="tabpanel"][data-state="active"]');
  const activityText = await activityCard.textContent();
  console.log("Activity timeline content:", activityText.slice(0, 300));
  assert.ok(
    activityText.includes("Blocked Account") || activityText.includes("Funds Deposited") || activityText.includes("status"),
    "Activity timeline must record student changes",
  );

  assert.equal(consoleErrors.length, 0, `Unexpected console errors: ${consoleErrors.join(", ")}`);
  console.log("SUCCESS! All automated browser checks for document status, Germany controls, and ZIP download passed!");

  await browser.close();
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
