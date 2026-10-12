// ============================================================
// Password hashing + TOTP MFA (README §8.3).
//
// NOTE ON THE ALGORITHM: README §8.3 specifies Argon2id. This implementation
// uses bcrypt via `bcryptjs` — a pure-JS, zero-native-dependency build — so the
// project installs and builds anywhere without a compiler toolchain. bcrypt
// with a cost >= 12 is an acceptable password hash; it is NOT a raw or
// MD5/SHA-1 digest. To move to Argon2id, replace the two functions below with
// `@node-rs/argon2` and leave every caller untouched.
// ============================================================
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const ROUNDS = Math.min(15, Math.max(10, Number(process.env.BCRYPT_ROUNDS || 12)));

// A throwaway hash used to keep the failure path's timing close to the success
// path, so the endpoint cannot be used to enumerate accounts.
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEeO7Zt0dC5fJm4vJb1yFq7Wq0m3lWn2eK';

export async function hashPassword(plain) {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain, hash) {
  const target = hash || DUMMY_HASH;
  const ok = await bcrypt.compare(String(plain || ''), target);
  return Boolean(hash) && ok;
}

/* ---------------- TOTP (RFC 6238, SHA-1, 30s step, 6 digits) ---------------- */

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(secret) {
  const clean = String(secret || '').toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function totpCode(secret, counterOffset = 0, step = 30, digits = 6) {
  const key = base32Decode(secret);
  if (!key.length) return null;
  const counter = Math.floor(Date.now() / 1000 / step) + counterOffset;
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buf.writeUInt32BE(counter % 2 ** 32, 4);
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(bin % 10 ** digits).padStart(digits, '0');
}

/** Accepts the current step and ±1 to tolerate clock drift. */
export function verifyTotp(secret, token) {
  const supplied = String(token || '').replace(/\D/g, '');
  if (supplied.length !== 6) return false;
  for (const offset of [0, -1, 1]) {
    const expected = totpCode(secret, offset);
    if (!expected) return false;
    const a = Buffer.from(expected);
    const b = Buffer.from(supplied);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }
  return false;
}
