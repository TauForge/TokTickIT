const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

interface ApiErrorPayload {
  error?: {
    message?: string;
    fieldErrors?: unknown[];
  };
}

export async function apiGet<T>(path: string, requesterId?: number): Promise<T> {
  const headers: Record<string, string> = {};
  if (requesterId !== undefined) headers["x-dev-requester-id"] = String(requesterId);

  const response = await fetch(`${apiBaseUrl}${path}`, { headers });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    throw new Error(body?.error?.message ?? `Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  requesterId?: number,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (requesterId !== undefined) headers["x-dev-requester-id"] = String(requesterId);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as (ApiErrorPayload & T) | null;
  if (!response.ok) {
    throw Object.assign(new Error(payload?.error?.message ?? "Request failed"), {
      fieldErrors: payload?.error?.fieldErrors ?? [],
    });
  }
  return payload as T;
}
