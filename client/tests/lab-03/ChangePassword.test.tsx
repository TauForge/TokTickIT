import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../src/api/authContext";
import { ChangePassword } from "../../src/screens/ChangePassword";
import { mockFetchByUrl, meResponse } from "./testHelpers";

const onboarding = { id: 9, email: "onboarding@toktickit.local", displayName: "New IT Staff Onboarding", role: "IT_STAFF" as const, mustChangePassword: true };

function renderChangePassword() {
  return render(
    <AuthProvider>
      <ChangePassword />
    </AuthProvider>,
  );
}

describe("ChangePassword", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("the policy checklist ticks live as the new password is typed", async () => {
    mockFetchByUrl({ "/api/v1/me": meResponse(onboarding) });
    const user = userEvent.setup();

    renderChangePassword();
    await user.type(screen.getByLabelText(/^new password/i), "Nn1!aaaa");

    expect(screen.queryAllByTestId("policy-check-unmet")).toHaveLength(0);
  });

  it("blocks submission when the confirmation does not match", async () => {
    mockFetchByUrl({ "/api/v1/me": meResponse(onboarding) });
    const user = userEvent.setup();

    renderChangePassword();
    await user.type(screen.getByLabelText(/current password/i), "DevPass123!");
    await user.type(screen.getByLabelText(/^new password/i), "NewOnboard456!");
    await user.type(screen.getByLabelText(/confirm new password/i), "Mismatch789!");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
  });

  it("submits successfully and the field-level 422 on a wrong current password is shown", async () => {
    mockFetchByUrl({
      "/api/v1/me": meResponse(onboarding),
      "/api/v1/auth/change-password": {
        ok: false,
        status: 422,
        json: async () => ({ error: { code: "VALIDATION_FAILED", message: "Current password is incorrect", fieldErrors: [{ field: "currentPassword", message: "INVALID_CURRENT_PASSWORD" }] } }),
      },
    });
    const user = userEvent.setup();

    renderChangePassword();
    await user.type(screen.getByLabelText(/current password/i), "WrongOne123!");
    await user.type(screen.getByLabelText(/^new password/i), "NewOnboard456!");
    await user.type(screen.getByLabelText(/confirm new password/i), "NewOnboard456!");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => expect(screen.getByText(/current password is incorrect/i)).toBeInTheDocument());
  });
});
