import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TicketDetail } from "../../src/screens/TicketDetail";

function mockSequence(responses: unknown[]) {
  let i = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => {
      const r = responses[Math.min(i, responses.length - 1)];
      i += 1;
      return Promise.resolve(r);
    }),
  );
}

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <TicketDetail ticketId="t1" requesterId={1} />
    </MemoryRouter>,
  );
}

const ticket = {
  id: "t1",
  ticketNumber: "TKT-2026-000001",
  summary: "Laptop battery drains quickly",
  description: "Drains fast even when idle.",
  categoryName: "Hardware",
  relatedSystemName: null,
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  status: "NEW",
  requesterId: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const oneAttachment = [
  {
    id: "a1",
    filename: "photo.jpg",
    isRemoved: false,
    removedReason: null,
    downloadUrl: "/api/attachments/a1/download",
    sizeBytes: 1000,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("TicketDetail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows read-only ticket fields and an active attachment", async () => {
    mockSequence([
      { ok: true, json: async () => ticket },
      { ok: true, json: async () => oneAttachment },
    ]);

    renderWithRouter();

    await waitFor(() => expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument());
    expect(screen.getByText("photo.jpg")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /download/i })).toBeInTheDocument();
  });

  it("uploads a new attachment via the file input and shows it in the list", async () => {
    mockSequence([
      { ok: true, json: async () => ticket },
      { ok: true, json: async () => [] },
      {
        ok: true,
        json: async () => ({
          id: "a2",
          filename: "new-photo.png",
          isRemoved: false,
          removedReason: null,
          downloadUrl: "/api/attachments/a2/download",
          sizeBytes: 500,
          createdAt: "2026-01-02T00:00:00.000Z",
        }),
      },
      {
        ok: true,
        json: async () => [
          {
            id: "a2",
            filename: "new-photo.png",
            isRemoved: false,
            removedReason: null,
            downloadUrl: "/api/attachments/a2/download",
            sizeBytes: 500,
            createdAt: "2026-01-02T00:00:00.000Z",
          },
        ],
      },
    ]);
    const user = userEvent.setup();

    renderWithRouter();
    await screen.findByText("TKT-2026-000001");

    const file = new File(["fake bytes"], "new-photo.png", { type: "image/png" });
    await user.upload(screen.getByLabelText(/add attachment/i), file);
    await user.click(screen.getByRole("button", { name: /upload/i }));

    await waitFor(() => expect(screen.getByText("new-photo.png")).toBeInTheDocument());
  });

  it("shows the attachment-limit-reached message when the API returns 409", async () => {
    mockSequence([
      { ok: true, json: async () => ticket },
      { ok: true, json: async () => [] },
      {
        ok: false,
        status: 409,
        json: async () => ({
          error: {
            code: "ATTACHMENT_LIMIT_REACHED",
            message: "This ticket already has 5 active attachments",
            fieldErrors: [],
          },
        }),
      },
    ]);
    const user = userEvent.setup();

    renderWithRouter();
    await screen.findByText("TKT-2026-000001");

    const file = new File(["x"], "sixth.png", { type: "image/png" });
    await user.upload(screen.getByLabelText(/add attachment/i), file);
    await user.click(screen.getByRole("button", { name: /upload/i }));

    await waitFor(() =>
      expect(screen.getByText(/already has 5 active attachments/i)).toBeInTheDocument(),
    );
  });

  it("removing an attachment requires a reason and then shows it as removed", async () => {
    mockSequence([
      { ok: true, json: async () => ticket },
      { ok: true, json: async () => oneAttachment },
      {
        ok: true,
        json: async () => ({
          id: "a1",
          filename: "photo.jpg",
          isRemoved: true,
          removedReason: "Wrong file",
          downloadUrl: null,
          sizeBytes: 1000,
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
      },
    ]);
    const user = userEvent.setup();

    renderWithRouter();

    await screen.findByText("photo.jpg");
    await user.click(screen.getByRole("button", { name: /remove/i }));
    await user.type(screen.getByLabelText(/reason/i), "Wrong file");
    await user.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => expect(screen.getByText(/removed/i)).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: /download/i })).not.toBeInTheDocument();
  });
});
