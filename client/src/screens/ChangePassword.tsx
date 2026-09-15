import { useMemo, useState, type FormEvent } from "react";
import { useAuth, type AuthUser } from "../api/authContext";
import { apiPost, ApiRequestError } from "../api/apiClient";

interface PolicyCheck {
  label: string;
  test: (value: string) => boolean;
}

const POLICY_CHECKS: PolicyCheck[] = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "Upper and lower case letters", test: (v) => /[A-Z]/.test(v) && /[a-z]/.test(v) },
  { label: "A digit and a special character", test: (v) => /[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v) },
];

export function ChangePassword() {
  const { setUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const checklist = useMemo(
    () => POLICY_CHECKS.map((check) => ({ ...check, satisfied: check.test(newPassword) })),
    [newPassword],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (newPassword !== confirmPassword) {
      setFormError("New password and confirmation do not match.");
      return;
    }
    if (!checklist.every((c) => c.satisfied)) {
      setFormError("New password does not meet the policy requirements.");
      return;
    }

    setSubmitting(true);
    try {
      const me = await apiPost<AuthUser>("/api/v1/auth/change-password", { currentPassword, newPassword });
      setUser(me);
    } catch (error) {
      if (error instanceof ApiRequestError && error.fieldErrors.some((f) => f.field === "currentPassword")) {
        setFormError("Current password is incorrect.");
      } else {
        setFormError(error instanceof Error ? error.message : "Unable to change your password right now.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container py-5">
      <section className="card border-0 shadow-sm mx-auto" style={{ maxWidth: 420 }}>
        <div className="card-body p-4">
          <h1 className="h4 mb-3">Change Password</h1>
          <p className="text-muted">You must set a new password before continuing.</p>
          {formError && (
            <p role="alert" className="zg-error-callout text-danger">
              {formError}
            </p>
          )}
          <form className="zg-card" onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="change-password-current" className="form-label">
                Current Password *
              </label>
              <input
                id="change-password-current"
                type="password"
                className="form-control"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label htmlFor="change-password-new" className="form-label">
                New Password *
              </label>
              <input
                id="change-password-new"
                type="password"
                className="form-control"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <ul className="list-unstyled mt-2">
                {checklist.map((c) => (
                  <li key={c.label} data-testid={`policy-check-${c.satisfied ? "met" : "unmet"}`}>
                    {c.satisfied ? "✓" : "○"} {c.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mb-3">
              <label htmlFor="change-password-confirm" className="form-label">
                Confirm New Password *
              </label>
              <input
                id="change-password-confirm"
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : "Continue"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
