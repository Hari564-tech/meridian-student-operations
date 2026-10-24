import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

test("receipt logo asset exists and has valid dimensions and bytes", () => {
  const logoPath = "public/brand/receipt-logo.jpg";
  assert.ok(fs.existsSync(logoPath), "receipt-logo.jpg should exist");
  const bytes = fs.readFileSync(logoPath);
  assert.ok(bytes.length > 5000, "receipt-logo.jpg should be a non-trivial JPEG file");
  // Check JPEG SOI marker (0xFF, 0xD8)
  assert.equal(bytes[0], 0xff);
  assert.equal(bytes[1], 0xd8);
});

test("receipt-logo-data.ts provides base64 image data matching the logo asset", () => {
  const dataPath = "src/lib/receipt-logo-data.ts";
  assert.ok(fs.existsSync(dataPath), "receipt-logo-data.ts should exist");
  const dataContent = fs.readFileSync(dataPath, "utf8");
  assert.ok(dataContent.includes("RECEIPT_LOGO_WIDTH = 438"));
  assert.ok(dataContent.includes("RECEIPT_LOGO_HEIGHT = 180"));
  assert.ok(dataContent.includes("RECEIPT_LOGO_BASE64"));
  assert.ok(dataContent.includes("getReceiptLogoBytes"));

  const logoBytes = fs.readFileSync("public/brand/receipt-logo.jpg");
  const expectedBase64 = logoBytes.toString("base64");
  assert.ok(dataContent.includes(expectedBase64), "receipt-logo-data.ts should contain the exact logo base64");
});

test("eligibility-receipt.ts embeds company logo Image XObject into PDF", () => {
  const receiptSrc = fs.readFileSync("src/lib/eligibility-receipt.ts", "utf8");
  assert.ok(receiptSrc.includes("RECEIPT_LOGO_WIDTH"), "Should use RECEIPT_LOGO_WIDTH");
  assert.ok(receiptSrc.includes("RECEIPT_LOGO_HEIGHT"), "Should use RECEIPT_LOGO_HEIGHT");
  assert.ok(receiptSrc.includes("getReceiptLogoBytes"), "Should use getReceiptLogoBytes");
  assert.ok(receiptSrc.includes("/Type /XObject /Subtype /Image"), "Should define Image XObject");
  assert.ok(receiptSrc.includes("/Filter /DCTDecode"), "Should use DCTDecode filter");
  assert.ok(receiptSrc.includes("/ImLogo"), "Should name image XObject ImLogo");
  assert.ok(receiptSrc.includes("Abroad Aspirants"), "Should default to Abroad Aspirants");
});
