import { useEffect, useState, type FormEvent } from "react";
import { apiGet, apiPatch, apiPost, ApiRequestError } from "../api/apiClient";
import { useAuth } from "../api/authContext";
import { RoleBadge } from "../components/badges";

interface UserAdminDto {
  id: number;
  email: string;
  displayName: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

const ROLES = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const;

interface DrawerState {
  mode: "create" | "edit";
  target: UserAdminDto | null;
  displayName: string;
  email: string;
  role: (typeof ROLES)[number];
  isActive: boolean;
  password: string;
  newPassword: string;
  error: string | null;
}

function blankDrawer(): DrawerState {
  return { mode: "create", target: null, displayName: "", email: "", role: "REQUESTER", isActive: true, password: "", newPassword: "", error: null };
}

export function UserManagement() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<UserAdminDto[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function loadUsers() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    const query = params.toString();
    apiGet<UserAdminDto[]>(`/api/v1/admin/users${query ? `?${query}` : ""}`)
      .then((response) => {
        setUsers(response);
        setForbidden(false);
      })
      .catch((err) => {
        if (err instanceof ApiRequestError && err.message.toLowerCase().includes("forbidden")) setForbidden(true);
      });
  }

  useEffect(loadUsers, [search, roleFilter]);

  function openCreate() {
    setDrawer(blankDrawer());
  }
  function openEdit(target: UserAdminDto) {
    setDrawer({ mode: "edit", target, displayName: target.displayName, email: target.email, role: target.role, isActive: target.isActive, password: "", newPassword: "", error: null });
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!drawer) return;
    setSubmitting(true);
    try {
      if (drawer.mode === "create") {
        await apiPost("/api/v1/admin/users", { displayName: drawer.displayName, email: drawer.email, role: drawer.role, isActive: drawer.isActive, password: drawer.password });
      } else {
        await apiPatch(`/api/v1/admin/users/${drawer.target!.id}`, { displayName: drawer.displayName, email: drawer.email, role: drawer.role, isActive: drawer.isActive });
      }
      setDrawer(null);
      loadUsers();
    } catch (err) {
      setDrawer({ ...drawer, error: err instanceof ApiRequestError ? err.message : "Unable to save this user right now." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetPassword() {
    if (!drawer?.target || !drawer.newPassword) return;
    try {
      await apiPatch(`/api/v1/admin/users/${drawer.target.id}/password`, { password: drawer.newPassword });
      setDrawer({ ...drawer, newPassword: "", error: null });
    } catch (err) {
      setDrawer({ ...drawer, error: err instanceof ApiRequestError ? err.message : "Unable to set a new password right now." });
    }
  }

  async function handleToggleActive() {
    if (!drawer?.target) return;
    try {
      const updated = await apiPatch<UserAdminDto>(`/api/v1/admin/users/${drawer.target.id}`, {
        displayName: drawer.target.displayName,
        email: drawer.target.email,
        role: drawer.target.role,
        isActive: !drawer.target.isActive,
      });
      setDrawer(null);
      setUsers((prev) => prev?.map((u) => (u.id === updated.id ? updated : u)) ?? null);
    } catch (err) {
      setDrawer({ ...drawer, error: err instanceof ApiRequestError ? err.message : "Unable to change this account's status right now." });
    }
  }

  if (forbidden) {
    return (
      <main className="container py-5">
        <p role="alert">You don't have access to this page.</p>
      </main>
    );
  }
  if (!users) {
    return (
      <main className="container py-5">
        <p>Loading users…</p>
      </main>
    );
  }

  const isSelf = drawer?.target?.id === me!.id;
  const deactivateTooltip = isSelf
    ? "Cannot deactivate your own account"
    : "Cannot deactivate the last active Administrator";
  // The client mirrors BR-29 exactly (self is always knowable client-side); BR-30's
  // last-admin count is not fetched here to keep this screen to one list call, so that
  // guard is enforced authoritatively server-side — this button stays enabled for a
  // non-self Administrator and a 409 LAST_ADMIN_PROTECTED surfaces as the drawer's
  // inline conflict error instead, per ui-spec.md's "conflict... inline error, drawer
  // stays open" state.
  const deactivateDisabled = Boolean(drawer?.target?.isActive && isSelf);

  return (
    <main className="container py-5">
      <h1 className="h4 mb-3">User Management</h1>

      <div className="row g-2 align-items-end mb-3">
        <div className="col-auto">
          <label htmlFor="admin-users-search" className="form-label">
            Search users…
          </label>
          <input id="admin-users-search" className="form-control" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="col-auto">
          <label htmlFor="admin-users-role" className="form-label">
            Filters
          </label>
          <select id="admin-users-role" className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="col-auto ms-auto">
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Create User
          </button>
        </div>
      </div>

      {users.length === 0 ? (
        <div data-testid="admin-users-no-results" className="zg-no-results-state">
          <p>No users match your current search.</p>
        </div>
      ) : (
        <table className="table zg-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Edit</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.displayName}</td>
                <td>{u.email}</td>
                <td>
                  <RoleBadge value={u.role} />
                </td>
                <td>
                  <span className={`badge zg-badge ${u.isActive ? "zg-status-badge-open" : "zg-status-badge-closed"}`}>{u.isActive ? "Active" : "Inactive"}</span>
                </td>
                <td>
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => openEdit(u)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {drawer && (
        <div className="zg-card" role="dialog" aria-label={drawer.mode === "create" ? "Create User" : "Edit User"}>
          <h2 className="h5">{drawer.mode === "create" ? "Create User" : "Edit User"}</h2>
          {drawer.error && (
            <p role="alert" className="zg-error-callout text-danger">
              {drawer.error}
            </p>
          )}
          <form onSubmit={handleSave}>
            <label htmlFor="admin-user-name" className="form-label">
              Full Name
            </label>
            <input id="admin-user-name" className="form-control" value={drawer.displayName} onChange={(e) => setDrawer({ ...drawer, displayName: e.target.value })} />

            <label htmlFor="admin-user-email" className="form-label">
              Email Address
            </label>
            <input id="admin-user-email" className="form-control" value={drawer.email} onChange={(e) => setDrawer({ ...drawer, email: e.target.value })} />

            <label htmlFor="admin-user-role" className="form-label">
              Role
            </label>
            <select id="admin-user-role" className="form-select" value={drawer.role} onChange={(e) => setDrawer({ ...drawer, role: e.target.value as DrawerState["role"] })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <div className="form-check mt-2">
              <input
                id="admin-user-active"
                type="checkbox"
                className="form-check-input"
                checked={drawer.isActive}
                onChange={(e) => setDrawer({ ...drawer, isActive: e.target.checked })}
              />
              <label htmlFor="admin-user-active" className="form-check-label">
                Active
              </label>
            </div>

            {drawer.mode === "create" && (
              <>
                <label htmlFor="admin-user-password" className="form-label">
                  Initial Password
                </label>
                <input
                  id="admin-user-password"
                  type="password"
                  className="form-control"
                  value={drawer.password}
                  onChange={(e) => setDrawer({ ...drawer, password: e.target.value })}
                />
              </>
            )}

            <button type="submit" className="btn btn-primary mt-3" disabled={submitting}>
              Save User
            </button>
          </form>

          {drawer.mode === "edit" && (
            <>
              <hr />
              <label htmlFor="admin-user-new-password" className="form-label">
                Set New Password
              </label>
              <div className="d-flex gap-2">
                <input
                  id="admin-user-new-password"
                  type="password"
                  className="form-control"
                  value={drawer.newPassword}
                  onChange={(e) => setDrawer({ ...drawer, newPassword: e.target.value })}
                />
                <button type="button" className="btn btn-outline-secondary" onClick={handleSetPassword}>
                  Set New Password
                </button>
              </div>

              <button
                type="button"
                className={`btn mt-3 ${drawer.target!.isActive ? "btn-outline-danger" : "btn-outline-success"}`}
                disabled={drawer.target!.isActive ? deactivateDisabled : false}
                title={drawer.target!.isActive && deactivateDisabled ? deactivateTooltip : undefined}
                onClick={handleToggleActive}
              >
                {drawer.target!.isActive ? "Deactivate User" : "Activate User"}
              </button>
            </>
          )}

          <button type="button" className="btn btn-outline-secondary mt-3 ms-2" onClick={() => setDrawer(null)}>
            Cancel
          </button>
        </div>
      )}
    </main>
  );
}
