import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../src/api/authContext";
import { UserManagement } from "../../src/screens/UserManagement";
import { mockFetchByUrl, meResponse } from "./testHelpers";

const admin = { id: 1, email: "admin@toktickit.dev", displayName: "System Administrator", role: "ADMINISTRATOR" as const, mustChangePassword: false };

const users = [
  { id: 1, email: "admin@toktickit.dev", displayName: "System Administrator", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: 2, email: "amy.tran@toktickit.dev", displayName: "Amy Tran", role: "IT_STAFF", isActive: true, mustChangePassword: false, createdAt: "2026-01-01T00:00:00.000Z" },
];

function renderScreen() {
  return render(
    <AuthProvider>
      <UserManagement />
    </AuthProvider>,
  );
}

describe("UserManagement", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists users and disables self-deactivation with a tooltip", async () => {
    mockFetchByUrl({ "/api/v1/me": meResponse(admin), "/api/v1/admin/users": { ok: true, json: async () => users } });

    renderScreen();
    await screen.findByText("Amy Tran");
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: /edit/i })[0]);

    const deactivateButton = screen.getByRole("button", { name: /deactivate user/i });
    expect(deactivateButton).toBeDisabled();
    expect(deactivateButton).toHaveAttribute("title", expect.stringMatching(/cannot deactivate your own account/i));
  });

  it("creates a user via the Create User drawer", async () => {
    let created = false;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/api/v1/me")) return Promise.resolve(meResponse(admin));
        if (url.endsWith("/admin/users") && init?.method === "POST") {
          created = true;
          return Promise.resolve({ ok: true, json: async () => ({ id: 3, email: "new.user@toktickit.dev", displayName: "New User", role: "IT_STAFF", isActive: true, mustChangePassword: true, createdAt: "2026-01-05T00:00:00.000Z" }) });
        }
        if (url.endsWith("/admin/users")) return Promise.resolve({ ok: true, json: async () => (created ? [...users, { id: 3, email: "new.user@toktickit.dev", displayName: "New User", role: "IT_STAFF", isActive: true, mustChangePassword: true, createdAt: "2026-01-05T00:00:00.000Z" }] : users) });
        return Promise.resolve({ ok: true, json: async () => [] });
      }),
    );
    const user = userEvent.setup();

    renderScreen();
    await screen.findByText("Amy Tran");
    await user.click(screen.getByRole("button", { name: /^create user$/i }));
    await user.type(screen.getByLabelText(/full name/i), "New User");
    await user.type(screen.getByLabelText(/email address/i), "new.user@toktickit.dev");
    await user.selectOptions(screen.getByLabelText(/^role/i), "IT_STAFF");
    await user.type(screen.getByLabelText(/initial password/i), "Initial123!");
    await user.click(screen.getByRole("button", { name: /save user/i }));

    await waitFor(() => expect(screen.getByText("New User")).toBeInTheDocument());
  });

  it("shows an inline conflict error and keeps the drawer open on a duplicate email", async () => {
    mockFetchByUrl({
      "/api/v1/me": meResponse(admin),
      "/api/v1/admin/users": { ok: true, json: async () => users },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/api/v1/me")) return Promise.resolve(meResponse(admin));
        if (url.endsWith("/admin/users") && init?.method === "POST") {
          return Promise.resolve({ ok: false, status: 409, json: async () => ({ error: { code: "EMAIL_ALREADY_EXISTS", message: "A user with this email already exists" } }) });
        }
        if (url.endsWith("/admin/users")) return Promise.resolve({ ok: true, json: async () => users });
        return Promise.resolve({ ok: true, json: async () => [] });
      }),
    );
    const user = userEvent.setup();

    renderScreen();
    await screen.findByText("Amy Tran");
    await user.click(screen.getByRole("button", { name: /^create user$/i }));
    await user.type(screen.getByLabelText(/full name/i), "Dup");
    await user.type(screen.getByLabelText(/email address/i), "amy.tran@toktickit.dev");
    await user.selectOptions(screen.getByLabelText(/^role/i), "IT_STAFF");
    await user.type(screen.getByLabelText(/initial password/i), "Initial123!");
    await user.click(screen.getByRole("button", { name: /save user/i }));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });
});
