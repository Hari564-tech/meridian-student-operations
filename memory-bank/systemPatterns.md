# System Architecture & Design Patterns

## Technology Stack
- **Framework**: TanStack Start / React 19 / TanStack Router.
- **Styling**: Tailwind CSS v4, Radix UI primitives, Lucide React icons.
- **State Management**: Zustand store with persistence adapter in `src/lib/store.ts`.
- **Security & Cryptography**: PBKDF2 + AES-256-GCM encrypted persistence adapter (`src/lib/credential-crypto.ts`) ensuring sensitive portal passwords and tokens are never stored plaintext in `localStorage`.
- **Archive Generation**: Client-side JSZip packaging (`src/lib/document-archive.ts`) with category folders and safe manifest generation.
- **Testing**: Node.js built-in test runner (`node --test`), Playwright browser verification scripts, and TypeScript strict checks (`tsc --noEmit`).

## Key System Invariants
1. **Document Status Hierarchy & Precedence**:
   - `No Requirements Configured`: When a student has 0 required document rules.
   - `Action Required`: Takes top priority if any required document is rejected, expired, or requires replacement.
   - `Not Received`: 0 required documents received.
   - `Partially Received`: Some required documents received, others missing.
   - `Pending Review`: All required uploaded, but 1+ awaiting review.
   - `All Received`: All required uploaded, none awaiting review.
   - `All Verified`: All required documents marked verified.
   - Optional documents do not impede completion.
2. **Germany Status Controls**:
   - `Blocked Account`: 9 standardized lifecycle states + legacy Yes/No support.
   - `Enrollment Status`: 8 standardized lifecycle states.
   - `Student Dorm Status`: 8 standardized lifecycle states.
   - Updates directly trigger `updateStudent()`, toast notifications, and `appendAudit()` activity logs.
3. **Document Archive Specification**:
   - Filename format: `${Student_Name}_${Student_ID}_Documents.zip`.
   - Folders: `Identity/`, `Academic/`, `Language/`, `Financial/`, `Application/`, `University/`, `Visa/`, `Other/`.
   - Manifest: `Document_Manifest.txt` containing metadata inventory without passwords or access secrets.
