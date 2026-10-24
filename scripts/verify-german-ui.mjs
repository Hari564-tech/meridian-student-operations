import { chromium } from "playwright";
import assert from "node:assert/strict";

async function run() {
  const launchOptions = {
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  };
  if (process.platform === "win32") {
    launchOptions.channel = "chrome";
  }

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  console.log("1. Seeding login session in localStorage...");
  await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    const raw = localStorage.getItem("abroad-aspirants-docs-v1");
    let parsed = {};
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {}
    }
    const state = parsed.state || {};
    const emp = (state.employees || []).find((e) => e.role === "employee") || {
      id: "EMP-002",
      name: "Priya Sharma",
      email: "employee@demo.com",
      role: "employee",
      status: "Active",
      phone: "+91 98765 43210",
      avatarHue: 200,
    };
    localStorage.setItem(
      "abroad-aspirants-docs-v1",
      JSON.stringify({
        ...parsed,
        state: {
          ...state,
          currentUser: emp,
          hydrated: true,
        },
      })
    );
  });

  console.log("2. Navigating to Add Student page...");
  await page.goto("http://127.0.0.1:8080/employee/students/new", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  // Step 1: Personal
  console.log("3. Filling Step 1 Personal fields...");
  // Country: Germany
  const countryTrigger = page.locator('div:has(> label:has-text("Country")) button').first();
  await countryTrigger.click();
  await page.locator('[role="option"]:has-text("Germany")').click();

  // Name
  await page.locator('div:has(> label:has-text("Name")) input').fill("Lukas Mueller");
  // Phone 1
  await page.locator('div:has(> label:has-text("Phone 1")) input').fill("9876543210");
  // College
  await page.locator('div:has(> label:has-text("College / University")) input').fill("TU Munich");

  // Continue to Step 2 Academic
  console.log("4. Moving to Step 2 Academic...");
  await page.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(600);

  // Fill Step 2 Academic
  await page.locator('div:has(> label:has-text("CGPA")) input').fill("8.8");
  const engTrigger = page.locator('div:has(> label:has-text("English test")) button').first();
  await engTrigger.click();
  await page.locator('[role="option"]:has-text("IELTS")').click();
  await page.locator('div:has(> label:has-text("Score")) input').fill("7.5");

  // Continue to Step 3 Account
  console.log("5. Moving to Step 3 Account...");
  await page.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(500);

  // Continue to Step 4 Application
  console.log("6. Moving to Step 4 Application...");
  await page.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(500);

  // Continue to Step 5 German-Specific Details
  console.log("7. Moving to Step 5 German-Specific Details...");
  await page.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(600);

  // Verify German-Specific Details step content
  console.log("8. Verifying German-Specific Details step layout...");
  const stepHeading = await page.locator('h2:has-text("German-Specific Details")').isVisible();
  assert.ok(stepHeading, "German-Specific Details heading must be visible");

  // Verify Uni-Assist Documents upload is NOT present
  const uploadArea = await page.locator('text="Upload documents"').isVisible();
  assert.ok(!uploadArea, "Upload documents area must NOT be present in German-Specific Details");
  const uniAssistDocsLabel = await page.locator('label:has-text("Uni-Assist Documents")').isVisible();
  assert.ok(!uniAssistDocsLabel, "Uni-Assist Documents label must NOT be present");

  // Verify APS and Uni-Assist inputs are present
  const apsUser = page.locator('div:has(> label:has-text("APS Username")) input');
  assert.ok(await apsUser.isVisible(), "APS Username input must be visible");
  await apsUser.fill("aps.lukas2026");

  const apsPass = page.locator('div:has(> div > span:has-text("APS Password")) input');
  assert.ok(await apsPass.isVisible(), "APS Password input must be visible");
  await apsPass.fill("ApsPass123");

  const uniAssistId = page.locator('div:has(> label:has-text("Uni-Assist ID")) input');
  assert.ok(await uniAssistId.isVisible(), "Uni-Assist ID input must be visible");
  await uniAssistId.fill("UA123456");

  const uniAssistPass = page.locator('div:has(> div > span:has-text("Uni-Assist Password")) input');
  assert.ok(await uniAssistPass.isVisible(), "Uni-Assist Password input must be visible");
  await uniAssistPass.fill("UaPass123");

  // Verify Blocked Account dropdown
  console.log("9. Testing Blocked Account dropdown...");
  const blockedAccountTrigger = page.locator('div:has(> label:has-text("Blocked Account")) button').first();
  assert.ok(await blockedAccountTrigger.isVisible(), "Blocked Account dropdown trigger must be visible");
  let blockedAccVal = await blockedAccountTrigger.textContent();
  assert.ok(blockedAccVal?.includes("Not Applied"), `Default Blocked Account must be Not Applied, got: ${blockedAccVal}`);

  // Select "Yes"
  await blockedAccountTrigger.click();
  await page.locator('[role="option"]:has-text("Yes")').click();
  blockedAccVal = await blockedAccountTrigger.textContent();
  assert.ok(blockedAccVal?.includes("Yes"), `Selected Blocked Account must be Yes, got: ${blockedAccVal}`);

  // Verify Enrollment Status dropdown
  console.log("10. Testing Enrollment Status dropdown...");
  const enrollmentTrigger = page.locator('div:has(> label:has-text("Enrollment Status")) button').first();
  assert.ok(await enrollmentTrigger.isVisible(), "Enrollment Status dropdown trigger must be visible");
  let enrollmentVal = await enrollmentTrigger.textContent();
  assert.ok(enrollmentVal?.includes("Not Applied"), `Default Enrollment Status must be Not Applied, got: ${enrollmentVal}`);

  // Select "Enrolled"
  await enrollmentTrigger.click();
  await page.locator('[role="option"]:has-text("Enrolled")').click();
  enrollmentVal = await enrollmentTrigger.textContent();
  assert.ok(enrollmentVal?.includes("Enrolled"), `Selected Enrollment Status must be Enrolled, got: ${enrollmentVal}`);

  // Verify Student Dorm Status dropdown
  console.log("11. Testing Student Dorm Status dropdown...");
  const dormTrigger = page.locator('div:has(> label:has-text("Student Dorm Status")) button').first();
  assert.ok(await dormTrigger.isVisible(), "Student Dorm Status dropdown trigger must be visible");
  let dormVal = await dormTrigger.textContent();
  assert.ok(dormVal?.includes("Not Applied"), `Default Student Dorm Status must be Not Applied, got: ${dormVal}`);

  // Select "Accommodation Confirmed"
  await dormTrigger.click();
  await page.locator('[role="option"]:has-text("Accommodation Confirmed")').click();
  dormVal = await dormTrigger.textContent();
  assert.ok(dormVal?.includes("Accommodation Confirmed"), `Selected Student Dorm Status must be Accommodation Confirmed, got: ${dormVal}`);

  // Take screenshot of the German details form
  console.log("12. Capturing screenshot of German-Specific Details form...");
  await page.screenshot({ path: "screenshots/german-details-form.png" });

  // Move forward through Payment (Step 6) and Documents (Step 7) to Review (Step 8)
  console.log("13. Continuing to Payment...");
  await page.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(500);

  console.log("14. Continuing to Documents...");
  await page.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(500);

  console.log("15. Continuing to Review...");
  await page.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(600);

  // In Review step, verify values
  console.log("16. Verifying Review step German section...");
  const reviewBlocked = await page.locator('div:has(> p:has-text("Blocked Account")) p:nth-child(2)').textContent();
  assert.ok(reviewBlocked?.includes("Yes"), `Review Blocked Account must be Yes, got: ${reviewBlocked}`);

  const reviewEnrollment = await page.locator('div:has(> p:has-text("Enrollment Status")) p:nth-child(2)').textContent();
  assert.ok(reviewEnrollment?.includes("Enrolled"), `Review Enrollment Status must be Enrolled, got: ${reviewEnrollment}`);

  const reviewDorm = await page.locator('div:has(> p:has-text("Student Dorm Status")) p:nth-child(2)').textContent();
  assert.ok(reviewDorm?.includes("Accommodation Confirmed"), `Review Student Dorm Status must be Accommodation Confirmed, got: ${reviewDorm}`);

  // Take screenshot of Review step
  await page.screenshot({ path: "screenshots/german-details-review.png" });

  // Test Student Detail page for existing Germany student
  console.log("17. Finding a Germany student to test detail view...");
  const germanStudent = await page.evaluate(() => {
    const raw = localStorage.getItem("abroad-aspirants-docs-v1");
    if (!raw) return null;
    const s = JSON.parse(raw)?.state?.students || [];
    return s.find((st) => st.country === "Germany");
  });

  if (germanStudent) {
    console.log("18. Opening German student detail page for ID:", germanStudent.id);
    await page.goto(`http://127.0.0.1:8080/employee/students/${germanStudent.id}`, { waitUntil: "domcontentloaded" });
    await page.locator('text="German-Specific Details"').first().waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(600);

    const blockedBadge = page.locator('div:has(> p:has-text("Blocked Account")) span').first();
    if (await blockedBadge.isVisible()) {
      console.log("Blocked Account badge text:", await blockedBadge.textContent());
    }
    const enrollBadge = page.locator('div:has(> p:has-text("Enrollment Status")) span').first();
    if (await enrollBadge.isVisible()) {
      console.log("Enrollment Status badge text:", await enrollBadge.textContent());
    }
    const dormBadge = page.locator('div:has(> p:has-text("Student Dorm Status")) span').first();
    if (await dormBadge.isVisible()) {
      console.log("Student Dorm Status badge text:", await dormBadge.textContent());
    }

    // Verify Uni-Assist documents is NOT in student detail card
    const detailUniAssistDocs = await page.locator('p:has-text("Uni-Assist Documents")').isVisible();
    assert.ok(!detailUniAssistDocs, "Uni-Assist Documents must not be shown in student detail");

    const germanCard = page.locator('div.rounded-xl:has(h3:has-text("German-Specific Details"))').first();
    await germanCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await germanCard.screenshot({ path: "screenshots/german-details-card.png" });
    await page.screenshot({ path: "screenshots/german-details-detail.png" });
  }

  assert.equal(consoleErrors.length, 0, `Console errors occurred: ${consoleErrors.join(", ")}`);
  console.log("SUCCESS! All German-Specific Details UI and interaction checks passed perfectly with 0 console errors.");

  await browser.close();
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
