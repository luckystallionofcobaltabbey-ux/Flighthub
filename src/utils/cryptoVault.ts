// Pure-TypeScript SHA-256 (for synchronous email/identifier hashing)
// and Web Crypto AES-256-GCM encryption for sensitive localStorage payloads.

const K: readonly number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

export function sha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const buf = new Uint8Array(paddedLen);
  buf.set(bytes);
  buf[bytes.length] = 0x80;

  const view = new DataView(buf.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((n) => n.toString(16).padStart(8, '0'))
    .join('');
}

const IDB_NAME = 'flighthub_keystore_v1';
const IDB_STORE = 'keys';
const IDB_KEY_ID = 'aes_local_v1';

interface EncryptedEnvelope {
  v: 1;
  iv: string;
  ct: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function openKeyStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let cachedKeyPromise: Promise<CryptoKey | null> | null = null;

async function getOrCreateDeviceKey(): Promise<CryptoKey | null> {
  if (
    typeof window === 'undefined' ||
    !window.crypto?.subtle ||
    typeof indexedDB === 'undefined'
  ) {
    return null;
  }
  if (cachedKeyPromise) return cachedKeyPromise;

  cachedKeyPromise = (async () => {
    try {
      const idb = await openKeyStore();
      const existing = await new Promise<CryptoKey | undefined>(
        (resolve, reject) => {
          const tx = idb.transaction(IDB_STORE, 'readonly');
          const getReq = tx.objectStore(IDB_STORE).get(IDB_KEY_ID);
          getReq.onsuccess = () =>
            resolve(getReq.result as CryptoKey | undefined);
          getReq.onerror = () => reject(getReq.error);
        }
      );
      if (existing) {
        idb.close();
        return existing;
      }

      const generated = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      await new Promise<void>((resolve, reject) => {
        const tx = idb.transaction(IDB_STORE, 'readwrite');
        const putReq = tx.objectStore(IDB_STORE).put(generated, IDB_KEY_ID);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      });
      idb.close();
      return generated;
    } catch {
      return null;
    }
  })();

  return cachedKeyPromise;
}

function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    (value as EncryptedEnvelope).v === 1 &&
    typeof (value as EncryptedEnvelope).iv === 'string' &&
    typeof (value as EncryptedEnvelope).ct === 'string'
  );
}

export async function saveEncryptedLocalJson(
  storageKey: string,
  value: unknown
): Promise<void> {
  try {
    const json = JSON.stringify(value);
    const key = await getOrCreateDeviceKey();
    if (!key) {
      localStorage.setItem(storageKey, json);
      return;
    }
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(json);
    const cipherBuf = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );
    const envelope: EncryptedEnvelope = {
      v: 1,
      iv: bytesToBase64(iv),
      ct: bytesToBase64(new Uint8Array(cipherBuf)),
    };
    localStorage.setItem(storageKey, JSON.stringify(envelope));
  } catch {
    // Storage quota or privacy mode fallback
  }
}

export async function loadEncryptedLocalJson<T>(
  storageKey: string
): Promise<T | null> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);

    if (!isEncryptedEnvelope(parsed)) {
      return parsed as T;
    }

    const key = await getOrCreateDeviceKey();
    if (!key) return null;

    const iv = base64ToBytes(parsed.iv);
    const ct = base64ToBytes(parsed.ct);
    const plainBuf = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as Uint8Array<ArrayBuffer> },
      key,
      ct as Uint8Array<ArrayBuffer>
    );
    const plainText = new TextDecoder().decode(plainBuf);
    return JSON.parse(plainText) as T;
  } catch {
    return null;
  }
}
