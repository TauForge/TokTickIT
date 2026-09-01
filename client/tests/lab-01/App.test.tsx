import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/App";

describe("App shell (Lab 2 entry point)", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("renders the Development Requester Selection screen when nothing is selected yet", async () => {
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@toktickit.dev" },
        ],
      }),
    );

    render(<App />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /select development requester/i }),
      ).toBeInTheDocument(),
    );
  });
});
