import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

describe("Overall Document Receipt Status & Students List Column Tests", () => {
  test("src/lib/types.ts defines DOCUMENT_RECEIPT_STATUSES and student.documentReceiptStatus", () => {
    const typesPath = path.join(root, "src/lib/types.ts");
    assert.ok(fs.existsSync(typesPath), "src/lib/types.ts must exist");
    const content = fs.readFileSync(typesPath, "utf-8");

    assert.ok(
      content.includes("DOCUMENT_RECEIPT_STATUSES"),
      "types.ts must export DOCUMENT_RECEIPT_STATUSES",
    );
    assert.ok(
      content.includes('"Not Received"') &&
        content.includes('"Partially Received"') &&
        content.includes('"Completely Received"'),
      "DOCUMENT_RECEIPT_STATUSES must include Not Received, Partially Received, Completely Received",
    );
    assert.ok(
      content.includes("documentReceiptStatus?: DocumentReceiptStatus"),
      "Student interface must have optional documentReceiptStatus field",
    );
  });

  test("src/lib/documents.ts implements getStudentDocumentReceiptStatus correctly", async () => {
    const docsPath = path.join(root, "src/lib/documents.ts");
    assert.ok(fs.existsSync(docsPath), "src/lib/documents.ts must exist");
    const content = fs.readFileSync(docsPath, "utf-8");

    assert.ok(
      content.includes("export function getStudentDocumentReceiptStatus"),
      "documents.ts must export getStudentDocumentReceiptStatus",
    );

    // Dynamic import to test calculation logic
    const { getStudentDocumentReceiptStatus } = await import("../src/lib/documents.ts");

    const baseStudent = {
      id: "STU-9999",
      name: "Test Student",
      country: "Germany",
      intake: "Winter 2025",
      status: "applied",
      employeeId: "emp-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Case 1: Manual override takes precedence
    const overrideStudent = {
      ...baseStudent,
      documentReceiptStatus: "Partially Received",
    };
    const res1 = getStudentDocumentReceiptStatus(overrideStudent, []);
    assert.equal(res1.status, "Partially Received");
    assert.equal(res1.isManualOverride, true);

    // Case 2: No manual override, 0 required documents
    const res2 = getStudentDocumentReceiptStatus(baseStudent, []);
    assert.equal(res2.status, "No Requirements Configured");
    assert.equal(res2.isManualOverride, false);
    assert.equal(res2.totalRequired, 0);

    // Case 3: No manual override, 3 required documents, 0 received
    const docs3 = [
      { id: "d1", studentId: "STU-9999", type: "PASSPORT", required: true, status: "pending" },
      { id: "d2", studentId: "STU-9999", type: "TRANSCRIPT", required: true, status: "pending" },
      { id: "d3", studentId: "STU-9999", type: "APS_CERTIFICATE", required: true, status: "pending" },
    ];
    const res3 = getStudentDocumentReceiptStatus(baseStudent, docs3);
    assert.equal(res3.status, "Not Received");
    assert.equal(res3.isManualOverride, false);
    assert.equal(res3.totalRequired, 3);
    assert.equal(res3.receivedRequired, 0);

    // Case 4: No manual override, 3 required documents, 1 received (uploaded)
    const docs4 = [
      { id: "d1", studentId: "STU-9999", type: "PASSPORT", required: true, status: "uploaded" },
      { id: "d2", studentId: "STU-9999", type: "TRANSCRIPT", required: true, status: "pending" },
      { id: "d3", studentId: "STU-9999", type: "APS_CERTIFICATE", required: true, status: "pending" },
    ];
    const res4 = getStudentDocumentReceiptStatus(baseStudent, docs4);
    assert.equal(res4.status, "Partially Received");
    assert.equal(res4.receivedRequired, 1);

    // Case 5: No manual override, 3 required documents, all received (uploaded/verified)
    const docs5 = [
      { id: "d1", studentId: "STU-9999", type: "PASSPORT", required: true, status: "uploaded" },
      { id: "d2", studentId: "STU-9999", type: "TRANSCRIPT", required: true, status: "verified" },
      { id: "d3", studentId: "STU-9999", type: "APS_CERTIFICATE", required: true, status: "under_review" },
    ];
    const res5 = getStudentDocumentReceiptStatus(baseStudent, docs5);
    assert.equal(res5.status, "Completely Received");
    assert.equal(res5.receivedRequired, 3);
  });

  test("src/components/documents/document-receipt-card.tsx implements editable dropdown and save workflow", () => {
    const cardPath = path.join(root, "src/components/documents/document-receipt-card.tsx");
    assert.ok(fs.existsSync(cardPath), "document-receipt-card.tsx must exist");
    const content = fs.readFileSync(cardPath, "utf-8");

    assert.ok(
      content.includes("Overall Document Receipt Status"),
      "Must have title 'Overall Document Receipt Status'",
    );
    assert.ok(content.includes("Save Status"), "Must have 'Save Status' button");
    assert.ok(
      content.includes("Document receipt status updated successfully."),
      "Must show success toast message",
    );
    assert.ok(
      content.includes("DOCUMENT_RECEIPT_STATUSES"),
      "Must use DOCUMENT_RECEIPT_STATUSES options",
    );
  });

  test("src/components/documents/document-receipt-badge.tsx provides distinct semantic styles", () => {
    const badgePath = path.join(root, "src/components/documents/document-receipt-badge.tsx");
    assert.ok(fs.existsSync(badgePath), "document-receipt-badge.tsx must exist");
    const content = fs.readFileSync(badgePath, "utf-8");

    assert.ok(content.includes("Completely Received"), "Must handle Completely Received");
    assert.ok(content.includes("Partially Received"), "Must handle Partially Received");
    assert.ok(content.includes("Not Received"), "Must handle Not Received");
    assert.ok(
      content.includes("emerald") || content.includes("green"),
      "Completely Received should use green/emerald styling",
    );
    assert.ok(
      content.includes("amber") || content.includes("orange"),
      "Partially Received should use amber/orange styling",
    );
  });

  test("src/components/documents/document-workspace.tsx mounts DocumentReceiptStatusCard above completion summary", () => {
    const wsPath = path.join(root, "src/components/documents/document-workspace.tsx");
    assert.ok(fs.existsSync(wsPath), "document-workspace.tsx must exist");
    const content = fs.readFileSync(wsPath, "utf-8");

    assert.ok(
      content.includes("<DocumentReceiptStatusCard"),
      "document-workspace.tsx must mount DocumentReceiptStatusCard",
    );
  });

  test("src/pages/students-page.tsx includes Document Status column, filter, CSV export, and navigation", () => {
    const pagePath = path.join(root, "src/pages/students-page.tsx");
    assert.ok(fs.existsSync(pagePath), "students-page.tsx must exist");
    const content = fs.readFileSync(pagePath, "utf-8");

    // Column header
    assert.ok(
      content.includes('header: "Document Status"'),
      "students-page.tsx must include 'Document Status' column header",
    );

    // Direct tab=documents navigation
    assert.ok(
      content.includes('search: { tab: "documents" }') || content.includes("tab=documents"),
      "Document status cell must navigate to ?tab=documents",
    );

    // FilterSelect
    assert.ok(
      content.includes('placeholder="Document Status"') &&
        content.includes('allLabel="All Document Statuses"'),
      "students-page.tsx must include FilterSelect for Document Status",
    );

    // CSV export fields
    assert.ok(
      content.includes("documentStatus:") && content.includes("documentCount:"),
      "students-page.tsx CSV export must include documentStatus and documentCount",
    );

    // Mobile view
    assert.ok(
      content.includes("<DocumentReceiptBadge"),
      "renderMobileCard must display DocumentReceiptBadge",
    );
  });

  test("src/pages/student-detail.tsx handles ?tab=documents parameter and displays DocumentReceiptBadge", () => {
    const detailPath = path.join(root, "src/pages/student-detail.tsx");
    assert.ok(fs.existsSync(detailPath), "student-detail.tsx must exist");
    const content = fs.readFileSync(detailPath, "utf-8");

    assert.ok(
      content.includes("DocumentReceiptBadge"),
      "student-detail.tsx must import and use DocumentReceiptBadge",
    );
    assert.ok(
      content.includes('tabParam === "documents"') || content.includes('setTab("documents")'),
      "student-detail.tsx must support activating the documents tab",
    );
  });
});
