import { useState } from "react";
import { useDevRequester } from "../api/devRequesterContext";

export function DevRequesterSelect({ onContinue }: { onContinue: (id: number) => void }) {
  const { requesters, loading, error, select, reload } = useDevRequester();
  const [pendingId, setPendingId] = useState<number | "">("");

  if (loading) {
    return (
      <main className="container py-5">
        <p>Loading development requesters…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container py-5">
        <p role="alert" className="text-danger">
          {error}
        </p>
        <button type="button" className="btn btn-secondary" onClick={reload}>
          Retry
        </button>
      </main>
    );
  }

  return (
    <main className="container py-5">
      <section className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <h1 className="h4 mb-3">Select Development Requester</h1>
          <p className="text-muted">
            Choose a development requester to simulate the current requester context for Lab 2.
            This is for testing only and is not a login screen.
          </p>
          <label htmlFor="dev-requester-select" className="form-label">
            Development Requester *
          </label>
          <select
            id="dev-requester-select"
            className="form-select"
            value={pendingId}
            onChange={(event) =>
              setPendingId(event.target.value === "" ? "" : Number(event.target.value))
            }
          >
            <option value="">Choose a requester…</option>
            {requesters.map((requester) => (
              <option key={requester.id} value={requester.id}>
                {requester.name}
              </option>
            ))}
          </select>
          <p className="form-text">
            Only active development requesters are shown. Authentication is coming in Lab 3.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={pendingId === ""}
            onClick={() => {
              if (pendingId !== "") {
                select(pendingId);
                onContinue(pendingId);
              }
            }}
          >
            Continue
          </button>
        </div>
      </section>
    </main>
  );
}
