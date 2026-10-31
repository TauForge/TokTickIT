const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

export interface FieldError {
  field: string;
  message: string;
}

interface ApiErrorPayload {
  error?: { code?: string; message?: string; fieldErrors?: FieldError[]; currentVersion?: number };
}

export class ApiRequestError extends Error {
  fieldErrors: FieldError[];
  code: string | null;
  status: number;
  currentVersion: number | null;
  constructor(
    message: string,
    fieldErrors: FieldError[] = [],
    meta: { code?: string | null; status?: number; currentVersion?: number | null } = {},
  ) {
    super(message);
    this.fieldErrors = fieldErrors;
    this.code = meta.code ?? null;
    this.status = meta.status ?? 0;
    this.currentVersion = meta.currentVersion ?? null;
  }
}

async function throwFromErrorResponse(response: Response): Promise<never> {
  const body = (await response.json().catch(() => null)) as ApiErrorPayload | null;
  throw new ApiRequestError(
    body?.error?.message ?? `Request failed with ${response.status}`,
    body?.error?.fieldErrors ?? [],
    { code: body?.error?.code, status: response.status, currentVersion: body?.error?.currentVersion },
  );
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { credentials: "include" });
  if (!response.ok) return throwFromErrorResponse(response);
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  });
  if (!response.ok) return throwFromErrorResponse(response);
  return response.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) return throwFromErrorResponse(response);
  return response.json() as Promise<T>;
}

export { apiBaseUrl };
