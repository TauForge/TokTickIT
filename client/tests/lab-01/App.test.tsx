import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/App";

describe("TokTickIT foundation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the TokTickIT heading and Bootstrap marker", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "ok", service: "TokTickIT API" }),
      }),
    );

    render(<App />);

    expect(screen.getByRole("heading", { name: "TokTickIT" })).toBeInTheDocument();
    expect(screen.getByText("Bootstrap ready")).toBeInTheDocument();
    expect(await screen.findByRole("status")).toBeInTheDocument();
  });

  it("displays backend status from the health API response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok", service: "TokTickIT API" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "API status: ok (TokTickIT API)",
    );
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/health");
  });

  it("shows a useful message when the backend is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to reach the TokTickIT API",
    );
  });
});
