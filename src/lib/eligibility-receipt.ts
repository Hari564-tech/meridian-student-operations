import { matchAllUniversities } from "@/lib/eligibility";
import {
  RECEIPT_LOGO_HEIGHT,
  RECEIPT_LOGO_WIDTH,
  getReceiptLogoBytes,
} from "@/lib/receipt-logo-data";
import type { Student, University } from "@/lib/types";

export interface EligibleProgram {
  college: string;
  course: string;
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;

/** Colleges and courses the student is actually marked eligible for. */
export function eligiblePrograms(student: Student, universities: University[]): EligibleProgram[] {
  const byId = new Map(universities.map((u) => [u.id, u]));
  const seen = new Set<string>();
  const rows: EligibleProgram[] = [];
  for (const match of matchAllUniversities(student, universities)) {
    if (match.verdict !== "eligible") continue;
    const university = byId.get(match.universityId);
    if (!university || university.archived) continue;
    const college = university.name.trim();
    const course = university.course.trim();
    if (!college || !course) continue;
    const key = `${college.toLowerCase()}\0${course.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ college, course });
  }
  rows.sort((a, b) => a.college.localeCompare(b.college) || a.course.localeCompare(b.course));
  return rows;
}

export function eligibilityReceiptFilename(studentName: string) {
  const clean =
    studentName
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\s+/g, "")
      .replace(/[^\w.-]+/g, "")
      .trim() || "Student";
  return `${clean}_Eligibility_Receipt.pdf`;
}

export function downloadEligibilityReceipt(filename: string, bytes: Uint8Array) {
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([copy], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function displayText(input: string) {
  return input
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x09\x20-\xFF]/g, "?")
    .replace(/\s+/g, " ")
    .trim();
}

function pdfLiteral(input: string) {
  const text = displayText(input);
  let out = "";
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (ch === "\\" || ch === "(" || ch === ")") out += `\\${ch}`;
    else if (c >= 32 && c <= 126) out += ch;
    else if (c >= 160 && c <= 255) out += `\\${c.toString(8).padStart(3, "0")}`;
    else out += " ";
  }
  return `(${out})`;
}

function textWidth(text: string, size: number) {
  let units = 0;
  for (const ch of displayText(text)) {
    if (ch === " ") units += 0.28;
    else if ("iljtfI.,'`".includes(ch)) units += 0.28;
    else if ("mwMW@%".includes(ch)) units += 0.86;
    else if (ch >= "A" && ch <= "Z") units += 0.68;
    else units += 0.52;
  }
  return units * size;
}

function wrap(text: string, size: number, maxWidth: number) {
  const words = displayText(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  const pushWord = (word: string) => {
    if (textWidth(word, size) <= maxWidth) {
      line = word;
      return;
    }
    let chunk = "";
    for (const ch of word) {
      if (chunk && textWidth(chunk + ch, size) > maxWidth) {
        lines.push(chunk);
        chunk = ch;
      } else chunk += ch;
    }
    line = chunk;
  };
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (textWidth(next, size) <= maxWidth) line = next;
    else {
      if (line) lines.push(line);
      pushWord(word);
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function num(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function rgb(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  return `${num(((n >> 16) & 255) / 255)} ${num(((n >> 8) & 255) / 255)} ${num((n & 255) / 255)}`;
}

const KAPPA = 0.5522847498;

class Page {
  ops: string[] = [];

  fill(hex: string) {
    this.ops.push(`${rgb(hex)} rg`);
  }

  stroke(hex: string, width = 1) {
    this.ops.push(`${width.toFixed(2)} w`);
    this.ops.push(`${rgb(hex)} RG`);
  }

  rect(x: number, y: number, w: number, h: number) {
    this.ops.push(`${num(x)} ${num(y)} ${num(w)} ${num(h)} re f`);
  }

  roundRect(x: number, y: number, w: number, h: number, r: number) {
    const k = r * KAPPA;
    const x0 = x;
    const y0 = y;
    const x1 = x + w;
    const y1 = y + h;
    this.ops.push(
      [
        `${num(x0 + r)} ${num(y0)} m`,
        `${num(x1 - r)} ${num(y0)} l`,
        `${num(x1 - r + k)} ${num(y0)} ${num(x1)} ${num(y0 + r - k)} ${num(x1)} ${num(y0 + r)} c`,
        `${num(x1)} ${num(y1 - r)} l`,
        `${num(x1)} ${num(y1 - r + k)} ${num(x1 - r + k)} ${num(y1)} ${num(x1 - r)} ${num(y1)} c`,
        `${num(x0 + r)} ${num(y1)} l`,
        `${num(x0 + r - k)} ${num(y1)} ${num(x0)} ${num(y1 - r + k)} ${num(x0)} ${num(y1 - r)} c`,
        `${num(x0)} ${num(y0 + r)} l`,
        `${num(x0)} ${num(y0 + r - k)} ${num(x0 + r - k)} ${num(y0)} ${num(x0 + r)} ${num(y0)} c`,
        "h f",
      ].join("\n"),
    );
  }

  text(x: number, baseline: number, font: "F1" | "F2", size: number, hex: string, value: string) {
    this.ops.push(
      `BT /${font} ${num(size)} Tf ${rgb(hex)} rg 1 0 0 1 ${num(x)} ${num(baseline)} Tm ${pdfLiteral(value)} Tj ET`,
    );
  }

  line(x1: number, y1: number, x2: number, y2: number) {
    this.ops.push(`${num(x1)} ${num(y1)} m ${num(x2)} ${num(y2)} l S`);
  }

  image(name: string, x: number, y: number, w: number, h: number) {
    this.ops.push(`q ${num(w)} 0 0 ${num(h)} ${num(x)} ${num(y)} cm /${name} Do Q`);
  }
}

function groupPrograms(programs: EligibleProgram[]) {
  const groups: { college: string; courses: string[] }[] = [];
  for (const row of programs) {
    const last = groups[groups.length - 1];
    if (last && last.college === row.college) last.courses.push(row.course);
    else groups.push({ college: row.college, courses: [row.course] });
  }
  return groups;
}

export function buildEligibilityReceipt(input: {
  orgName: string;
  legalName: string;
  studentName: string;
  programs: EligibleProgram[];
  issuedAt?: Date;
}) {
  const orgName = displayText(input.orgName) || "Abroad Aspirants";
  const legalName = displayText(input.legalName) || orgName;
  const studentName = displayText(input.studentName) || "Student";
  const issued = input.issuedAt ?? new Date();
  const issuedLabel = issued.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const groups = groupPrograms(input.programs);
  const pages: Page[] = [];
  let page = new Page();
  pages.push(page);

  const margin = 46;
  const contentW = PAGE_W - margin * 2;
  const footerTop = 52;
  let cursor = 0;

  const paintFooter = (current: Page, index: number, totalHint: number) => {
    current.stroke("#E2E8F0", 0.8);
    current.line(margin, footerTop, PAGE_W - margin, footerTop);
    current.text(margin, 32, "F1", 8, "#64748B", `${orgName}  ·  Official eligibility receipt`);
    current.text(margin, 20, "F1", 8, "#94A3B8", `Issued ${issuedLabel}`);
    const pageLabel = `Page ${index + 1}${totalHint > 1 ? ` of ${totalHint}` : ""}`;
    current.text(PAGE_W - margin - textWidth(pageLabel, 8), 26, "F1", 8, "#94A3B8", pageLabel);
  };

  const newPage = () => {
    page = new Page();
    pages.push(page);
    page.fill("#0F2744");
    page.rect(0, PAGE_H - 46, PAGE_W, 46);
    page.fill("#1D4ED8");
    page.rect(0, PAGE_H - 48, PAGE_W, 2);

    // Compact Abroad Aspirants logo card
    const subCardW = 68;
    const subCardH = 30;
    const subLogoW = 60.8;
    const subLogoH = 25;
    const subX = margin;
    const subY = PAGE_H - 39;
    page.fill("#FFFFFF");
    page.roundRect(subX, subY, subCardW, subCardH, 4);
    page.image(
      "ImLogo",
      subX + (subCardW - subLogoW) / 2,
      subY + (subCardH - subLogoH) / 2,
      subLogoW,
      subLogoH,
    );

    page.text(subX + subCardW + 12, PAGE_H - 28, "F2", 11, "#FFFFFF", orgName);
    const cont = "Eligibility receipt  ·  continued";
    page.text(PAGE_W - margin - textWidth(cont, 8), PAGE_H - 27, "F1", 8, "#DBEAFE", cont);
    cursor = 68;
  };

  const ensure = (height: number) => {
    if (cursor + height > PAGE_H - footerTop - 18) newPage();
  };

  page.fill("#0F2744");
  page.rect(0, PAGE_H - 132, PAGE_W, 132);
  page.fill("#1D4ED8");
  page.rect(0, PAGE_H - 136, PAGE_W, 4);

  // Official Abroad Aspirants logo badge
  const logoCardW = 136;
  const logoCardH = 56;
  const logoW = 121.7;
  const logoH = 50;
  const logoX = margin;
  const logoY = PAGE_H - 118;
  page.fill("#FFFFFF");
  page.roundRect(logoX, logoY, logoCardW, logoCardH, 6);
  page.image(
    "ImLogo",
    logoX + (logoCardW - logoW) / 2,
    logoY + (logoCardH - logoH) / 2,
    logoW,
    logoH,
  );

  const textX = logoX + logoCardW + 16;
  page.text(textX, PAGE_H - 62, "F2", 18, "#FFFFFF", orgName);
  const legalLines = wrap(legalName, 9, contentW - logoCardW - 16 - 120);
  legalLines.slice(0, 2).forEach((line, i) => {
    page.text(textX, PAGE_H - 80 - i * 12, "F1", 9, "#DBEAFE", line);
  });
  page.text(textX, PAGE_H - 104, "F1", 8, "#93C5FD", "Official overseas education consultancy & admissions");

  const kicker = "ELIGIBILITY RECEIPT";
  page.text(PAGE_W - margin - textWidth(kicker, 9), PAGE_H - 54, "F2", 9, "#BFDBFE", kicker);
  page.text(PAGE_W - margin - textWidth("Official document", 8), PAGE_H - 68, "F1", 8, "#93C5FD", "Official document");
  const docDate = `Issued ${issuedLabel}`;
  page.text(PAGE_W - margin - textWidth(docDate, 8), PAGE_H - 82, "F1", 8, "#93C5FD", docDate);

  cursor = 164;
  page.text(margin, PAGE_H - cursor, "F2", 8, "#64748B", "STUDENT NAME");
  cursor += 22;
  for (const line of wrap(studentName, 22, contentW)) {
    page.text(margin, PAGE_H - cursor, "F2", 22, "#0F172A", line);
    cursor += 26;
  }
  cursor += 8;
  page.text(margin, PAGE_H - cursor, "F2", 8, "#64748B", "ELIGIBILITY STATUS");
  cursor += 18;
  const status = "Eligible";
  const pillW = textWidth(status, 11) + 22;
  page.fill("#ECFDF5");
  page.roundRect(margin, PAGE_H - cursor - 6, pillW, 22, 11);
  page.text(margin + 11, PAGE_H - cursor + 1, "F2", 11, "#047857", status);
  cursor += 36;

  page.stroke("#E2E8F0", 0.8);
  page.line(margin, PAGE_H - cursor, PAGE_W - margin, PAGE_H - cursor);
  cursor += 22;
  page.text(margin, PAGE_H - cursor, "F2", 8, "#64748B", "ELIGIBLE COLLEGES AND COURSES");
  cursor += 16;

  if (groups.length === 0) {
    page.text(margin, PAGE_H - cursor, "F1", 11, "#64748B", "No eligible colleges or courses are recorded.");
    cursor += 18;
  }

  groups.forEach((group, index) => {
    const collegeLines = wrap(group.college, 12, contentW - 8);
    const courseLines = group.courses.map((course) => wrap(course, 11, contentW - 28));
    const blockH = 16 + collegeLines.length * 16 + courseLines.reduce((n, lines) => n + lines.length * 15, 0) + 12;
    ensure(blockH);
    if (index > 0) {
      page.stroke("#F1F5F9", 0.6);
      page.line(margin, PAGE_H - cursor + 6, PAGE_W - margin, PAGE_H - cursor + 6);
    }
    page.fill("#1D4ED8");
    page.roundRect(margin, PAGE_H - cursor - 2, 4, 14, 1);
    collegeLines.forEach((line) => {
      page.text(margin + 12, PAGE_H - cursor, "F2", 12, "#0F172A", line);
      cursor += 16;
    });
    cursor += 2;
    group.courses.forEach((course, courseIndex) => {
      const lines = courseLines[courseIndex] ?? [course];
      lines.forEach((line, lineIndex) => {
        if (lineIndex === 0) {
          page.fill("#1D4ED8");
          page.roundRect(margin + 14, PAGE_H - cursor + 1.6, 3.2, 3.2, 1.6);
        }
        page.text(margin + 24, PAGE_H - cursor, "F1", 11, "#334155", line);
        cursor += 15;
      });
    });
    cursor += 10;
  });

  pages.forEach((current, index) => paintFooter(current, index, pages.length));

  const logoBytes = getReceiptLogoBytes();
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let currentOffset = 0;

  const pushString = (str: string) => {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    currentOffset += bytes.length;
  };

  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    currentOffset += bytes.length;
  };

  pushString("%PDF-1.4\n");

  const startObj = (id: number) => {
    offsets[id] = currentOffset;
    pushString(`${id} 0 obj\n`);
  };

  const endObj = () => {
    pushString("endobj\n");
  };

  // 1: Catalog
  startObj(1);
  pushString("<< /Type /Catalog /Pages 2 0 R >>\n");
  endObj();

  // 2: Pages
  const pageObjectIds = pages.map((_, i) => 6 + i * 2);
  startObj(2);
  pushString(
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>\n`,
  );
  endObj();

  // 3: Font F1
  startObj(3);
  pushString("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\n");
  endObj();

  // 4: Font F2
  startObj(4);
  pushString("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\n");
  endObj();

  // 5: Image XObject /ImLogo
  startObj(5);
  pushString(
    `<< /Type /XObject /Subtype /Image /Width ${RECEIPT_LOGO_WIDTH} /Height ${RECEIPT_LOGO_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoBytes.length} >>\nstream\n`,
  );
  pushBytes(logoBytes);
  pushString("\nendstream\n");
  endObj();

  // Pages & Content streams
  pages.forEach((p, index) => {
    const pageId = 6 + index * 2;
    const contentId = pageId + 1;
    const stream = encoder.encode(`${p.ops.join("\n")}\n`);

    // Page dict
    startObj(pageId);
    pushString(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(PAGE_W)} ${num(PAGE_H)}] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /ImLogo 5 0 R >> >> >>\n`,
    );
    endObj();

    // Content stream
    startObj(contentId);
    pushString(`<< /Length ${stream.length} >>\nstream\n`);
    pushBytes(stream);
    pushString("endstream\n");
    endObj();
  });

  // xref
  const xrefAt = currentOffset;
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pushString(xref);
  pushString(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`);

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const c of chunks) {
    result.set(c, pos);
    pos += c.length;
  }
  return result;
}
