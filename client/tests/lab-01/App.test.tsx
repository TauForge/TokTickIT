import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../src/App";

describe("TokTickIT foundation", () => {
  it("renders the TokTickIT heading and Bootstrap marker", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "TokTickIT" })).toBeInTheDocument();
    expect(screen.getByText("Bootstrap ready")).toBeInTheDocument();
  });
});
