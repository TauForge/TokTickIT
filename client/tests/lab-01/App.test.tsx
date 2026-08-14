import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/App";

describe("TokTickIT foundation", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders the TokTickIT heading and Bootstrap marker", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.endsWith("/api/health")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ status: "ok", service: "TokTickIT API" }),
          });
        }

        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }),
    );

    render(<App />);

    expect(screen.getByRole("heading", { name: "TokTickIT" })).toBeInTheDocument();
    expect(screen.getByText("Bootstrap ready")).toBeInTheDocument();
    expect(await screen.findByRole("status")).toBeInTheDocument();
  });

  it("displays backend status from the health API response", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith("/api/health")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: "ok", service: "TokTickIT API" }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "API status: ok (TokTickIT API)",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/health",
      expect.objectContaining({ signal: expect.any(Object) }),
    );
  });

  it("shows a useful message when the backend is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.endsWith("/api/health")) {
          return Promise.reject(new Error("Network error"));
        }

        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }),
    );

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to reach the TokTickIT API",
    );
  });

  it("shows a timeout message when the backend does not respond", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, options: RequestInit) => {
        if (!url.endsWith("/api/health")) {
          return Promise.resolve({
            ok: true,
            json: async () => [],
          });
        }

        return new Promise((_, reject) => {
          options.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        });
      }),
    );

    render(<App />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(
      screen.getByText("The TokTickIT API did not respond within 5 seconds."),
    ).toBeInTheDocument();
  });
});

describe("Category list", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders categories returned by the API", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith("/api/health")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: "ok", service: "TokTickIT API" }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => [
          { id: 1, name: "Account and Access" },
          { id: 2, name: "Hardware" },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(
      await screen.findByRole("list", { name: "IT request categories" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Account and Access")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/categories",
      expect.objectContaining({ signal: expect.any(Object) }),
    );
  });

  it("shows an error when the category API is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.endsWith("/api/health")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ status: "ok", service: "TokTickIT API" }),
          });
        }

        return Promise.reject(new Error("Network error"));
      }),
    );

    render(<App />);

    expect(
      await screen.findByText(
        "Unable to load IT request categories. Start the backend and try again.",
      ),
    ).toBeInTheDocument();
  });
});
