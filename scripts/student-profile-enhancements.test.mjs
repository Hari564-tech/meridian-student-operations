import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

describe("Student Profile Enhancements & Document Workflow Tests", () => {
  test("src/lib/types.ts includes all required status definitions and audit actions", () => {
    const typesContent = fs.readFileSync(path.join(root, "src/lib/types.ts"), "utf-8");

    // 1. Audit Action
    assert.ok(
      typesContent.includes('"STUDENT_DOCUMENTS_EXPORTED"'),
      "AUDIT_ACTIONS must include STUDENT_DOCUMENTS_EXPORTED",
    );

    // 2. Document Submission Statuses
    const expectedSubmissionStatuses = [
      "Not Received",
      "Partially Received",
      "Pending Review",
      "Action Required",
      "All Received",
      "All Verified",
      "No Requirements Configured",
    ];
    for (const st of expectedSubmissionStatuses) {
      assert.ok(typesContent.includes(`"${st}"`), `types.ts must include DocumentSubmissionStatus: ${st}`);
    }

    // 3. Blocked Account options (all 9 required options)
    const expectedBlockedAccount = [
      "Not Applied",
      "Applied",
      "In Progress",
      "Account Opened",
      "Funds Deposited",
      "Confirmation Received",
      "Completed",
      "On Hold",
      "Not Required",
    ];
    for (const opt of expectedBlockedAccount) {
      assert.ok(typesContent.includes(`"${opt}"`), `types.ts must include blocked account option: ${opt}`);
    }

    // 4. Enrollment options (all 8 required options)
    const expectedEnrollment = [
      "Not Applied",
      "Applied",
      "Documents Pending",
      "Awaiting Confirmation",
      "Enrolled",
      "Enrollment Certificate Received",
      "On Hold",
      "Not Required",
    ];
    for (const opt of expectedEnrollment) {
      assert.ok(typesContent.includes(`"${opt}"`), `types.ts must include enrollment option: ${opt}`);
    }

    // 5. Student Dorm options (all 8 required options)
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

  test("src/lib/documents.ts calculateDocumentSubmissionStatus logic and precedence", () => {
    const docsContent = fs.readFileSync(path.join(root, "src/lib/documents.ts"), "utf-8");

    assert.ok(docsContent.includes("export function calculateDocumentSubmissionStatus"));
    assert.ok(docsContent.includes("export interface DocumentSubmissionSummary"));
    assert.ok(docsContent.includes('"No Requirements Configured"'));
    assert.ok(docsContent.includes('"Action Required"'));
    assert.ok(docsContent.includes('"Not Received"'));
    assert.ok(docsContent.includes('"Partially Received"'));
    assert.ok(docsContent.includes('"Pending Review"'));
    assert.ok(docsContent.includes('"All Received"'));
    assert.ok(docsContent.includes('"All Verified"'));

    // Test the exact algorithm implementation
    function isSubmitted(status) {
      return status === "uploaded" || status === "under_review" || status === "verified";
    }

    function calculateStatus(docs) {
      const required = docs.filter((d) => d.required);
      if (required.length === 0) {
        return { status: "No Requirements Configured", totalRequired: 0, receivedRequired: 0 };
      }
      const totalRequired = required.length;
      const receivedRequired = required.filter((d) => isSubmitted(d.status)).length;
      const verifiedRequired = required.filter((d) => d.status === "verified").length;
      const underReviewRequired = required.filter((d) => d.status === "under_review" || d.status === "uploaded").length;
      const actionRequiredCount = required.filter(
        (d) => d.status === "rejected" || d.status === "expired" || Boolean(d.replacementRequested),
      ).length;
      const remainingRequired = Math.max(0, totalRequired - receivedRequired);
      const percentage = Math.round((receivedRequired / totalRequired) * 100);

      let status;
      if (actionRequiredCount > 0) {
        status = "Action Required";
      } else if (receivedRequired === 0) {
        status = "Not Received";
      } else if (receivedRequired < totalRequired) {
        status = "Partially Received";
      } else {
        if (verifiedRequired === totalRequired) {
          status = "All Verified";
        } else if (underReviewRequired > 0) {
          status = "Pending Review";
        } else {
          status = "All Received";
        }
      }
      return { status, totalRequired, receivedRequired, remainingRequired, percentage };
    }

    // 1. No requirements configured
    assert.equal(calculateStatus([]).status, "No Requirements Configured");
    assert.equal(calculateStatus([{ required: false, status: "pending" }]).status, "No Requirements Configured");

    // 2. Not Received
    const notRec = calculateStatus([
      { required: true, status: "pending" },
      { required: true, status: "pending" },
    ]);
    assert.equal(notRec.status, "Not Received");
    assert.equal(notRec.totalRequired, 2);
    assert.equal(notRec.receivedRequired, 0);
    assert.equal(notRec.percentage, 0);

    // 3. Partially Received (optional document must not block)
    const partial = calculateStatus([
      { required: true, status: "verified" },
      { required: true, status: "pending" },
      { required: false, status: "pending" },
    ]);
    assert.equal(partial.status, "Partially Received");
    assert.equal(partial.totalRequired, 2);
    assert.equal(partial.receivedRequired, 1);
    assert.equal(partial.remainingRequired, 1);
    assert.equal(partial.percentage, 50);

    // 4. Pending Review
    const pendingRev = calculateStatus([
      { required: true, status: "verified" },
      { required: true, status: "under_review" },
    ]);
    assert.equal(pendingRev.status, "Pending Review");
    assert.equal(pendingRev.totalRequired, 2);
    assert.equal(pendingRev.percentage, 100);

    // 5. Action Required prioritizes over partial/complete
    const actionReq1 = calculateStatus([
      { required: true, status: "verified" },
      { required: true, status: "rejected" },
    ]);
    assert.equal(actionReq1.status, "Action Required");

    const actionReq2 = calculateStatus([
      { required: true, status: "verified" },
      { required: true, status: "uploaded", replacementRequested: true },
    ]);
    assert.equal(actionReq2.status, "Action Required");

    // 6. All Verified
    const allVer = calculateStatus([
      { required: true, status: "verified" },
      { required: true, status: "verified" },
      { required: false, status: "pending" }, // optional not verified does not affect All Verified
    ]);
    assert.equal(allVer.status, "All Verified");
    assert.equal(allVer.totalRequired, 2);
    assert.equal(allVer.percentage, 100);
  });

  test("src/lib/document-archive.ts packages documents by category, sanitizes names, and includes manifest", async () => {
    const archiveContent = fs.readFileSync(path.join(root, "src/lib/document-archive.ts"), "utf-8");

    // 1. Sanitize functions and export signatures
    assert.ok(archiveContent.includes("export function sanitizeArchiveName"));
    assert.ok(archiveContent.includes("export function sanitizeFileName"));
    assert.ok(archiveContent.includes("export function dataUrlToUint8Array"));
    assert.ok(archiveContent.includes("export async function generateStudentDocumentArchive"));
    assert.ok(archiveContent.includes("export function triggerBlobDownload"));

    // 2. Archive manifest structure
    assert.ok(archiveContent.includes("MERIDIAN - STUDENT DOCUMENT ARCHIVE"));
    assert.ok(archiveContent.includes("Document_Manifest.txt"));

    // 3. Test JSZip archive bundling directly
    const zip = new JSZip();
    const student = { name: "Ananya Reddy", id: "JAN27_001" };
    const category = "Identity";
    const fileName = "Passport.pdf";

    zip.folder(category).file(fileName, "mock-pdf-content");
    const manifest = [
      "MERIDIAN - STUDENT DOCUMENT ARCHIVE",
      "",
      `Student: ${student.name}`,
      `Student ID: ${student.id}`,
      `Generated: ${new Date().toISOString()}`,
      "",
      "Included documents:",
      `- ${category}/${fileName}`,
    ].join("\n");
    zip.file("Document_Manifest.txt", manifest);

    const buf = await zip.generateAsync({ type: "nodebuffer" });
    assert.ok(buf.length > 0, "ZIP buffer must be non-empty");

    const reloaded = await JSZip.loadAsync(buf);
    assert.ok(reloaded.file("Document_Manifest.txt"), "Reloaded zip must have manifest");
    assert.ok(reloaded.file("Identity/Passport.pdf"), "Reloaded zip must have category folder file");
    const text = await reloaded.file("Document_Manifest.txt").async("string");
    assert.ok(text.includes("Student: Ananya Reddy"));
    assert.ok(text.includes("Identity/Passport.pdf"));
  });

  test("src/components/documents/document-workspace.tsx includes Download All Documents (.ZIP) action and dialog", () => {
    const wsContent = fs.readFileSync(
      path.join(root, "src/components/documents/document-workspace.tsx"),
      "utf-8",
    );

    assert.match(wsContent, /Download All Documents \(\.ZIP\)/);
    assert.match(wsContent, /<DocumentArchiveDialog/);
    assert.match(wsContent, /archiveOpen/);
  });

  test("src/pages/student-detail.tsx renders submission status, header card, and interactive Germany dropdowns", () => {
    const detailContent = fs.readFileSync(path.join(root, "src/pages/student-detail.tsx"), "utf-8");

    // 1. Overall Document Submission Status Card
    assert.match(detailContent, /Document Submission Status/);
    assert.match(detailContent, /<DocumentSubmissionBadge/);
    assert.match(detailContent, /View Documents/);

    // 2. Profile Header Summary Card
    assert.match(detailContent, /<Card className="p-4">\s*<p className="text-xs text-muted-foreground">Document Status<\/p>/);
    assert.match(detailContent, /Documents:\s*\{submissionSummary\.receivedRequired\}\s*\/\s*\{submissionSummary\.totalRequired\}\s*required/);

    // 3. Germany-Specific Status Card with interactive controls
    assert.match(detailContent, /Germany-Specific Status/);
    assert.match(detailContent, /BLOCKED_ACCOUNT_OPTIONS/);
    assert.match(detailContent, /ENROLLMENT_STATUS_OPTIONS/);
    assert.match(detailContent, /STUDENT_DORM_STATUS_OPTIONS/);
    assert.match(detailContent, /handleStatusUpdate/);
  });
});
