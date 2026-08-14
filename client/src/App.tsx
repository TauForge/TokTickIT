import "bootstrap/dist/css/bootstrap.min.css";

import { useEffect, useState } from "react";

const healthTimeoutMs = 5000;
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
const healthEndpoint = `${apiBaseUrl}/api/health`;
const categoriesEndpoint = `${apiBaseUrl}/api/categories`;

type HealthResponse = {
  service: string;
  status: string;
};

type Category = {
  id: number;
  name: string;
};

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), healthTimeoutMs);

    const loadHealth = async () => {
      try {
        const response = await fetch(healthEndpoint, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Backend responded with HTTP ${response.status}.`);
        }

        const payload = (await response.json()) as HealthResponse;

        if (payload.status !== "ok" || payload.service !== "TokTickIT API") {
          throw new Error("Backend returned an unexpected health response.");
        }

        if (isMounted) {
          setHealth(payload);
        }
      } catch (error) {
        if (isMounted) {
          const isTimeout =
            typeof error === "object" &&
            error !== null &&
            "name" in error &&
            error.name === "AbortError";
          setHealthError(
            isTimeout
              ? "The TokTickIT API did not respond within 5 seconds."
              : "Unable to reach the TokTickIT API. Start the backend on the configured API URL and try again.",
          );
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    void loadHealth();

    return () => {
      isMounted = false;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), healthTimeoutMs);

    const loadCategories = async () => {
      try {
        const response = await fetch(categoriesEndpoint, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Categories API responded with HTTP ${response.status}.`);
        }

        const payload = (await response.json()) as unknown;

        if (
          !Array.isArray(payload) ||
          payload.some(
            (category) =>
              typeof category !== "object" ||
              category === null ||
              typeof category.id !== "number" ||
              typeof category.name !== "string",
          )
        ) {
          throw new Error("Categories API returned an unexpected response.");
        }

        if (isMounted) {
          setCategories(payload);
        }
      } catch (_error) {
        if (isMounted) {
          setCategoriesError(
            "Unable to load IT request categories. Start the backend and try again.",
          );
        }
      } finally {
        if (isMounted) {
          setCategoriesLoading(false);
        }
        window.clearTimeout(timeoutId);
      }
    };

    void loadCategories();

    return () => {
      isMounted = false;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <main className="container py-5">
      <section className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <h1 className="display-6 mb-3">TokTickIT</h1>
          <p className="lead mb-3">IT Service Desk API health check</p>
          <span className="badge text-bg-success">Bootstrap ready</span>
          <div className="mt-4" aria-live="polite">
            <h2 className="h5">Backend status</h2>
            {!health && !healthError && <p>Checking the TokTickIT API…</p>}
            {health && (
              <p role="status" className="text-success">
                API status: {health.status} ({health.service})
              </p>
            )}
            {healthError && (
              <p role="alert" className="text-danger">
                {healthError}
              </p>
            )}
          </div>
          <div className="mt-4" aria-live="polite">
            <h2 className="h5">IT request categories</h2>
            {categoriesLoading && <p>Loading categories…</p>}
            {categoriesError && (
              <p role="alert" className="text-danger">
                {categoriesError}
              </p>
            )}
            {!categoriesLoading && !categoriesError && (
              <ul aria-label="IT request categories" className="list-group">
                {categories.map((category) => (
                  <li key={category.id} className="list-group-item">
                    {category.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
