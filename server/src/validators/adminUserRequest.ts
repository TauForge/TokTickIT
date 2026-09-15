import { FieldError } from "../middleware/errorEnvelope";
import { validatePasswordPolicy } from "../services/password";

export const ROLES = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];

export interface CreateUserInput {
  displayName: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive: boolean;
  password: string;
}
export type CreateUserValidationResult = { ok: true; value: CreateUserInput } | { ok: false; errors: FieldError[] };

export function validateCreateUserRequest(body: unknown): CreateUserValidationResult {
  const b = (body ?? {}) as Record<string, unknown>;
  const errors: FieldError[] = [];

  const displayName = typeof b.displayName === "string" ? b.displayName.trim() : "";
  if (!displayName) errors.push({ field: "displayName", message: "Full name is required." });

  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) errors.push({ field: "email", message: "A valid email address is required." });

  const role = typeof b.role === "string" ? b.role : "";
  if (!ROLES.includes(role)) errors.push({ field: "role", message: "A valid role is required." });

  const isActive = typeof b.isActive === "boolean" ? b.isActive : true;

  const password = typeof b.password === "string" ? b.password : "";
  errors.push(...validatePasswordPolicy(password, "password"));

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { displayName, email, role: role as CreateUserInput["role"], isActive, password } };
}

export interface EditUserInput {
  displayName: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive: boolean;
}
export type EditUserValidationResult = { ok: true; value: EditUserInput } | { ok: false; errors: FieldError[] };

export function validateEditUserRequest(body: unknown): EditUserValidationResult {
  const b = (body ?? {}) as Record<string, unknown>;
  const errors: FieldError[] = [];

  const displayName = typeof b.displayName === "string" ? b.displayName.trim() : "";
  if (!displayName) errors.push({ field: "displayName", message: "Full name is required." });

  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) errors.push({ field: "email", message: "A valid email address is required." });

  const role = typeof b.role === "string" ? b.role : "";
  if (!ROLES.includes(role)) errors.push({ field: "role", message: "A valid role is required." });

  const isActive = typeof b.isActive === "boolean" ? b.isActive : true;

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { displayName, email, role: role as EditUserInput["role"], isActive } };
}

export interface SetPasswordInput {
  password: string;
}
export type SetPasswordValidationResult = { ok: true; value: SetPasswordInput } | { ok: false; errors: FieldError[] };

export function validateSetPasswordRequest(body: unknown): SetPasswordValidationResult {
  const b = (body ?? {}) as Record<string, unknown>;
  const password = typeof b.password === "string" ? b.password : "";
  const errors = validatePasswordPolicy(password, "password");
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { password } };
}
