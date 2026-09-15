import bcrypt from "bcryptjs";
import { FieldError } from "../middleware/errorEnvelope";

const BCRYPT_COST_FACTOR = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST_FACTOR);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// BR-08: minimum 8 characters, at least one uppercase, one lowercase, one digit, one
// special character. Login itself is exempt — it only verifies an existing hash.
export function validatePasswordPolicy(password: string, field = "password"): FieldError[] {
  const errors: FieldError[] = [];
  if (password.length < 8) {
    errors.push({ field, message: "Password must be at least 8 characters." });
  }
  if (!/[A-Z]/.test(password)) {
    errors.push({ field, message: "Password must include an uppercase letter." });
  }
  if (!/[a-z]/.test(password)) {
    errors.push({ field, message: "Password must include a lowercase letter." });
  }
  if (!/[0-9]/.test(password)) {
    errors.push({ field, message: "Password must include a digit." });
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push({ field, message: "Password must include a special character." });
  }
  return errors;
}
