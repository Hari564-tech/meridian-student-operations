const PREFIX = "enc1:";
const SECRET_STUDENT = ["gmailPassword", "apsPassword", "uniAssistPassword"] as const;
const SECRET_USER = ["password"] as const;

let keyPromise: Promise<CryptoKey> | null = null;

function key(): Promise<CryptoKey> {
  keyPromise ??= (async () => {
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode("meridian-student-ops-credential-key-v1"),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: new TextEncoder().encode("meridian-cred-salt-v1"),
        iterations: 120_000,
        hash: "SHA-256",
      },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  })();
  return keyPromise;
}

function toB64(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(value: string) {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function isSealed(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PREFIX);
}

/** Encrypt a credential. Empty values and already-sealed values pass through. */
export async function seal(plain: string | undefined | null): Promise<string> {
  if (!plain) return plain ?? "";
  if (plain.startsWith(PREFIX)) return plain;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), new TextEncoder().encode(plain)),
  );
  const packed = new Uint8Array(iv.length + cipher.length);
  packed.set(iv, 0);
  packed.set(cipher, iv.length);
  return PREFIX + toB64(packed);
}

/** Decrypt a credential. Plaintext (legacy rows) is returned unchanged. */
export async function openSecret(value: string | undefined | null): Promise<string> {
  if (!value) return value ?? "";
  if (!value.startsWith(PREFIX)) return value;
  try {
    const packed = fromB64(value.slice(PREFIX.length));
    const iv = packed.slice(0, 12);
    const cipher = packed.slice(12);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await key(), cipher);
    return new TextDecoder().decode(plain);
  } catch {
    return "";
  }
}

async function sealRecord<T extends Record<string, unknown>>(row: T, fields: readonly string[]) {
  for (const field of fields) {
    const value = row[field];
    if (typeof value === "string" && value && !value.startsWith(PREFIX)) {
      (row as Record<string, unknown>)[field] = await seal(value);
    }
  }
}

async function openRecord<T extends Record<string, unknown>>(row: T, fields: readonly string[]) {
  for (const field of fields) {
    const value = row[field];
    if (typeof value === "string" && value.startsWith(PREFIX)) {
      (row as Record<string, unknown>)[field] = await openSecret(value);
    }
  }
}

async function walk(state: { students?: Record<string, unknown>[]; employees?: Record<string, unknown>[] }, mode: "seal" | "open") {
  const fn = mode === "seal" ? sealRecord : openRecord;
  if (Array.isArray(state.students)) {
    for (const row of state.students) await fn(row, SECRET_STUDENT);
  }
  if (Array.isArray(state.employees)) {
    for (const row of state.employees) await fn(row, SECRET_USER);
  }
}

/** Zustand persist adapter. Credentials are AES-GCM sealed before they touch localStorage. */
export function credentialStorage() {
  if (typeof window === "undefined") {
    return {
      getItem: async () => null,
      setItem: async () => undefined,
      removeItem: async () => undefined,
    };
  }
  return {
    async getItem(name: string) {
      const raw = localStorage.getItem(name);
      if (!raw) return null;
      try {
        const data = JSON.parse(raw) as { state?: { students?: Record<string, unknown>[]; employees?: Record<string, unknown>[] } };
        if (data.state) await walk(data.state, "open");
        return JSON.stringify(data);
      } catch {
        return raw;
      }
    },
    async setItem(name: string, value: string) {
      try {
        const data = JSON.parse(value) as { state?: { students?: Record<string, unknown>[]; employees?: Record<string, unknown>[] } };
        if (data.state) await walk(data.state, "seal");
        localStorage.setItem(name, JSON.stringify(data));
      } catch {
        localStorage.setItem(name, value);
      }
    },
    async removeItem(name: string) {
      localStorage.removeItem(name);
    },
  };
}
