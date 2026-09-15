import { useState, type FormEvent } from "react";
import { useAuth } from "../api/authContext";

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!email.trim() || !password) {
      setFormError("Invalid email or password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      // BR-06: identical wording for unknown-email vs. wrong-password; ACCOUNT_DEACTIVATED
      // (403) is the one case that gets its own distinct, non-enumerating message.
      setFormError(
        message === "This account cannot sign in right now."
          ? message
          : "Invalid email or password.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container py-5">
      <section className="card border-0 shadow-sm mx-auto" style={{ maxWidth: 420 }}>
        <div className="card-body p-4">
          <h1 className="h4 mb-3">Sign In</h1>
          {formError && (
            <p role="alert" className="zg-error-callout text-danger">
              {formError}
            </p>
          )}
          <form className="zg-card" onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="login-email" className="form-label">
                Email *
              </label>
              <input
                id="login-email"
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label htmlFor="login-password" className="form-label">
                Password *
              </label>
              <div className="d-flex">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary ms-2"
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <a
              href="#"
              aria-disabled="true"
              className="d-block mb-3 text-muted"
              onClick={(e) => e.preventDefault()}
            >
              Forgot your password?
            </a>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
