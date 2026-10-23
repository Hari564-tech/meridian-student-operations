import { openSecret, seal } from "@/lib/credential-crypto";

const DB = "meridian-vault";
const STORE = "files";

function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function request<T>(tx: IDBTransaction, done: () => T) {
  return new Promise<T>((resolve, reject) => {
    tx.oncomplete = () => resolve(done());
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Store a document encrypted at rest. Only a reference id belongs on the student record. */
export async function saveVaultFile(id: string, dataUrl: string) {
  const sealed = await seal(dataUrl);
  const db = await database();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(sealed, id);
  await request(tx, () => undefined);
  db.close();
}

export async function readVaultFile(id: string) {
  const db = await database();
  const tx = db.transaction(STORE, "readonly");
  const req = tx.objectStore(STORE).get(id);
  const sealed = await new Promise<string | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as string | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  if (!sealed) return null;
  const plain = await openSecret(sealed);
  return plain || null;
}

export async function removeVaultFile(id: string) {
  if (typeof indexedDB === "undefined") return;
  const db = await database();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await request(tx, () => undefined);
  db.close();
}

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
