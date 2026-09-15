import { FieldError } from "../middleware/errorEnvelope";
import { validatePasswordPolicy } from "../services/password";

export interface LoginInput {
  email: string;
  password: string;
}
export type LoginValidationResult = { ok: true; value: LoginInput } | { ok: false; errors: FieldError[] };

export function validateLoginRequest(body: unknown): LoginValidationResult {
  const b = (body ?? {}) as Record<string, unknown>;
  const errors: FieldError[] = [];
  const email = typeof b.email === "string" ? b.email.trim() : "";
  if (!email) errors.push({ field: "email", message: "Email is required." });
  const password = typeof b.password === "string" ? b.password : "";
  if (!password) errors.push({ field: "password", message: "Password is required." });
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { email, password } };
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
export type ChangePasswordValidationResult =
  | { ok: true; value: ChangePasswordInput }
  | { ok: false; errors: FieldError[] };

export function validateChangePasswordRequest(body: unknown): ChangePasswordValidationResult {
  const b = (body ?? {}) as Record<string, unknown>;
  const errors: FieldError[] = [];
  const currentPassword = typeof b.currentPassword === "string" ? b.currentPassword : "";
  if (!currentPassword) errors.push({ field: "currentPassword", message: "Current password is required." });
  const newPassword = typeof b.newPassword === "string" ? b.newPassword : "";
  errors.push(...validatePasswordPolicy(newPassword, "newPassword"));
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { currentPassword, newPassword } };
}
