import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { AuthProvider } from "../../src/api/authContext";
import { Login } from "../../src/screens/Login";
import { mockFetchByUrl, loggedOutMeResponse, meResponse } from "./testHelpers";

function renderLogin() {
  return render(
    <AuthProvider>
      <Login />
    </AuthProvider>,
  );
}

describe("Login", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a generic invalid-credentials message on 401, and never shows a busy Sign In button forever", async () => {
    mockFetchByUrl({
      "/api/v1/me": loggedOutMeResponse(),
      "/api/v1/auth/login": {
        ok: false,
        status: 401,
        json: async () => ({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password.", fieldErrors: [] } }),
      },
    });
    const user = userEvent.setup();

    renderLogin();
    await user.type(screen.getByLabelText(/email/i), "nobody@toktickit.dev");
    await user.type(screen.getByLabelText(/password/i), "WrongPass123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).not.toBeDisabled();
  });

  it("logs in successfully and lets AuthProvider pick up the returned user", async () => {
    mockFetchByUrl({
      "/api/v1/me": loggedOutMeResponse(),
      "/api/v1/auth/login": {
        ok: true,
        json: async () => ({ user: { id: 1, email: "jennifer.anderson@toktickit.dev", displayName: "Jennifer Anderson", role: "REQUESTER", mustChangePassword: false } }),
      },
    });
    const user = userEvent.setup();

    renderLogin();
    await user.type(screen.getByLabelText(/email/i), "jennifer.anderson@toktickit.dev");
    await user.type(screen.getByLabelText(/password/i), "DevPass123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(screen.queryByText(/invalid email or password/i)).not.toBeInTheDocument());
  });
});
