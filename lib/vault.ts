import type { PlannerData } from "./planner";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ITERATIONS = 310000;

type EncryptedVault = {
  version: 1;
  algorithm: "AES-GCM";
  kdf: "PBKDF2-SHA-256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
};

const toBase64 = (bytes: Uint8Array) => {
  let value = "";
  bytes.forEach((byte) => { value += String.fromCharCode(byte); });
  return btoa(value);
};

const fromBase64 = (value: string) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptPlan(data: PlannerData, passphrase: string) {
  if (passphrase.length < 10) throw new Error("Use at least 10 characters for the vault passphrase.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, ITERATIONS);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(data)));
  const vault: EncryptedVault = {
    version: 1,
    algorithm: "AES-GCM",
    kdf: "PBKDF2-SHA-256",
    iterations: ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(encrypted)),
  };
  return JSON.stringify(vault);
}

export async function decryptPlan(payload: string, passphrase: string): Promise<PlannerData> {
  try {
    const vault = JSON.parse(payload) as EncryptedVault;
    if (vault.version !== 1 || vault.algorithm !== "AES-GCM") throw new Error("Unsupported vault format");
    const key = await deriveKey(passphrase, fromBase64(vault.salt), vault.iterations);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(vault.iv) },
      key,
      fromBase64(vault.ciphertext),
    );
    return JSON.parse(decoder.decode(decrypted)) as PlannerData;
  } catch {
    throw new Error("The passphrase is incorrect or the local vault is damaged.");
  }
}
