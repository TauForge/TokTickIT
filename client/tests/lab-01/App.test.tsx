import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/App";
import { mockFetchByUrl, loggedOutMeResponse } from "../lab-03/testHelpers";

describe("App shell (entry point)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Lab 2 showed a Development Requester Selection screen here; Lab 3 replaced it with real
  // sign-in, so the intent (the app opens on an identity gate when nobody is identified)
  // is now asserted against the Sign In screen.
  it("renders the Sign In screen when there is no session", async () => {
    mockFetchByUrl({ "/api/v1/me": loggedOutMeResponse() });

    render(<App />);

    await waitFor(() => expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument());
    expect(screen.queryByRole("navigation", { name: /main/i })).not.toBeInTheDocument();
  });
});
