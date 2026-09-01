import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DevRequesterSelect } from "../../src/screens/DevRequesterSelect";
import { DevRequesterProvider } from "../../src/api/devRequesterContext";

describe("DevRequesterSelect", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a loading state, then the dropdown of active requesters", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: 1, name: "Jennifer Anderson", email: "j@x.com" }],
      }),
    );

    render(
      <DevRequesterProvider>
        <DevRequesterSelect onContinue={() => {}} />
      </DevRequesterProvider>,
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument());
  });

  it("shows a safe API-failure state with retry when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    render(
      <DevRequesterProvider>
        <DevRequesterSelect onContinue={() => {}} />
      </DevRequesterProvider>,
    );

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("Continue is disabled until a requester is chosen, then calls onContinue", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: 1, name: "Jennifer Anderson", email: "j@x.com" }],
      }),
    );
    const onContinue = vi.fn();
    const user = userEvent.setup();

    render(
      <DevRequesterProvider>
        <DevRequesterSelect onContinue={onContinue} />
      </DevRequesterProvider>,
    );

    const continueButton = await screen.findByRole("button", { name: /continue/i });
    expect(continueButton).toBeDisabled();

    await user.selectOptions(screen.getByLabelText(/development requester/i), "1");
    expect(continueButton).toBeEnabled();
    await user.click(continueButton);
    expect(onContinue).toHaveBeenCalledWith(1);
  });
});
