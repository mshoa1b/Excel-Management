// lib/secretbox.js
const crypto = require("crypto");
const KEY_SRC = process.env.CRED_ENC_KEY; // REQUIRED, any strong random string
if (!KEY_SRC) throw new Error("CRED_ENC_KEY is not set");
const KEY = crypto.createHash("sha256").update(KEY_SRC).digest(); // 32 bytes

function seal(plaintext) {
  if (plaintext == null) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // store as base64(iv|tag|enc)
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function open(b64) {
  if (!b64) return null;
  const buf = Buffer.from(b64, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28); // 16 bytes
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

module.exports = { seal, open };
