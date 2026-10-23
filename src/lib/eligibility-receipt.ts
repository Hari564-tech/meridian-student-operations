import { matchAllUniversities } from "@/lib/eligibility";
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
}

function drawLogo(page: Page, x: number, y: number, size: number) {
  page.fill("#FFFFFF");
  page.roundRect(x, y, size, size, size * 0.22);
  page.fill("#1D4ED8");
  const inset = size * 0.08;
  page.roundRect(x + inset, y + inset, size - inset * 2, size - inset * 2, size * 0.16);
  const sx = (vx: number) => x + (vx / 32) * size;
  const sy = (vy: number) => y + size - (vy / 32) * size;
  page.stroke("#FFFFFF", Math.max(1.1, size * 0.045));
  const seg = (ax: number, ay: number, bx: number, by: number) => {
    page.line(sx(ax), sy(ay), sx(bx), sy(by));
  };
  seg(16, 6.5, 16, 25.5);
  seg(16, 6.5, 19.2, 11.2);
  seg(16, 6.5, 12.8, 11.2);
  seg(8.5, 16, 23.5, 16);
  seg(8.5, 16, 12.2, 13.2);
  seg(8.5, 16, 12.2, 18.8);
  seg(23.5, 16, 19.8, 13.2);
  seg(23.5, 16, 19.8, 18.8);
  page.fill("#FFFFFF");
  const r = (2.2 / 32) * size;
  page.roundRect(sx(16) - r, sy(16) - r, r * 2, r * 2, r);
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
  const orgName = displayText(input.orgName) || "Meridian";
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
    drawLogo(page, margin, PAGE_H - 38, 26);
    page.text(margin + 34, PAGE_H - 28, "F2", 11, "#FFFFFF", orgName);
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
  drawLogo(page, margin, PAGE_H - 108, 56);
  page.text(margin + 72, PAGE_H - 62, "F2", 20, "#FFFFFF", orgName);
  const legalLines = wrap(legalName, 9, contentW - 72);
  legalLines.slice(0, 2).forEach((line, i) => {
    page.text(margin + 72, PAGE_H - 82 - i * 12, "F1", 9, "#DBEAFE", line);
  });
  const kicker = "ELIGIBILITY RECEIPT";
  page.text(PAGE_W - margin - textWidth(kicker, 9), PAGE_H - 54, "F2", 9, "#BFDBFE", kicker);
  page.text(PAGE_W - margin - textWidth("Official document", 8), PAGE_H - 68, "F1", 8, "#93C5FD", "Official document");

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

  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [] /Count 0 >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  pages.forEach((current) => {
    const stream = `${current.ops.join("\n")}\n`;
    const contentId = objects.length + 2;
    const pageId = objects.length + 1;
    pageObjectIds.push(pageId);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(PAGE_W)} ${num(PAGE_H)}] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`,
    );
    objects.push(`<< /Length ${byteLength(stream)} >>\nstream\n${stream}endstream`);
  });
  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefAt = byteLength(body);
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += xref;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return new TextEncoder().encode(body);
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}
