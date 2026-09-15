const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

export interface FieldError {
  field: string;
  message: string;
}

interface ApiErrorPayload {
  error?: { message?: string; fieldErrors?: FieldError[] };
}

export class ApiRequestError extends Error {
  fieldErrors: FieldError[];
  constructor(message: string, fieldErrors: FieldError[] = []) {
    super(message);
    this.fieldErrors = fieldErrors;
  }
}

async function throwFromErrorResponse(response: Response): Promise<never> {
  const body = (await response.json().catch(() => null)) as ApiErrorPayload | null;
  throw new ApiRequestError(
    body?.error?.message ?? `Request failed with ${response.status}`,
    body?.error?.fieldErrors ?? [],
  );
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { credentials: "include" });
  if (!response.ok) return throwFromErrorResponse(response);
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
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
