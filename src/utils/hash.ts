import bcrypt from "bcrypt";

// Cost 12 ≈ 250ms per hash on current hardware. Raising it strengthens stored
// hashes but slows signup/signin linearly; existing hashes keep their own cost,
// so a change here only affects passwords set after it.
const SALT_ROUNDS = 12;

export function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

export function verifyPassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
