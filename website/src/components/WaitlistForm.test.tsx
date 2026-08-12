import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WaitlistForm } from "./WaitlistForm";
import { site } from "@/data/site";

/**
 * The page's only conversion goal. The network is stubbed at `fetch`, so
 * nothing leaves the test — what is asserted is the contract between this form
 * and /api/waitlist, and the error path a visitor actually sees.
 */

const fetchMock = vi.fn();

beforeEach(() => {
  sessionStorage.clear();
  fetchMock.mockReset().mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function submit(email: string) {
  const input = screen.getByLabelText("Email");
  fireEvent.change(input, { target: { value: email } });
  fireEvent.submit(input.closest("form")!);
  return input;
}

describe("client-side validation", () => {
  it("shows an announced error and never posts an address it can reject itself", async () => {
    render(<WaitlistForm />);

    submit("not-an-email");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/valid email address/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("wires the field to the error line so a screen reader reaches it", async () => {
    render(<WaitlistForm />);
    const input = submit("nope");

    const alert = await screen.findByRole("alert");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", alert.id);
  });

  it("applies the same rule the API applies", async () => {
    render(<WaitlistForm />);

    for (const bad of ["a@b", "a b@c.co", "@studio.com", "designer@"]) {
      submit(bad);
      expect(await screen.findByRole("alert")).toBeInTheDocument();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not lean on the browser bubble — the form opts out of native validation", () => {
    const { container } = render(<WaitlistForm />);
    expect(container.querySelector("form")).toHaveAttribute("novalidate");
  });
});

describe("submitting", () => {
  it("posts the address and the honeypot as JSON", async () => {
    render(<WaitlistForm />);
    submit("designer@studio.com");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];

    expect(url).toBe("/api/waitlist");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({ email: "designer@studio.com", company: "" });
  });

  it("confirms with the launch window the rest of the page promises", async () => {
    render(<WaitlistForm />);
    submit("designer@studio.com");

    const done = await screen.findByRole("status");
    expect(done).toHaveTextContent("You are on the list");
    expect(done).toHaveTextContent(site.launch);
  });

  it("carries the server's own message into the error line", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "The waitlist is not configured yet." }), { status: 503 }),
    );
    render(<WaitlistForm />);
    submit("designer@studio.com");

    expect(await screen.findByRole("alert")).toHaveTextContent("The waitlist is not configured yet.");
  });

  it("falls back to a readable message when the failure carries no body", async () => {
    fetchMock.mockResolvedValue(new Response("gateway timeout", { status: 502 }));
    render(<WaitlistForm />);
    submit("designer@studio.com");

    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
  });

  it("says so plainly when the request never reached the server", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<WaitlistForm />);
    submit("designer@studio.com");

    expect(await screen.findByRole("alert")).toHaveTextContent(/network error/i);
  });

  it("leaves the form in place after a failure so the address can be resubmitted", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "nope" }), { status: 400 }));
    render(<WaitlistForm />);
    submit("designer@studio.com");

    await screen.findByRole("alert");
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });
});

describe("the honeypot", () => {
  it("is present, hidden from assistive tech, and out of the tab order", () => {
    const { container } = render(<WaitlistForm />);
    const honeypot = container.querySelector('input[name="company"]')!;

    expect(honeypot).toHaveAttribute("aria-hidden", "true");
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot).toHaveAttribute("autocomplete", "off");
  });

  it("is submitted with whatever a bot put in it", async () => {
    const { container } = render(<WaitlistForm />);
    fireEvent.change(container.querySelector('input[name="company"]')!, {
      target: { value: "bot inc" },
    });

    submit("designer@studio.com");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).company).toBe("bot inc");
  });
});

describe("the joined state", () => {
  it("is remembered, so a second instance on the page does not ask again", async () => {
    render(<WaitlistForm />);
    submit("designer@studio.com");
    await screen.findByRole("status");

    expect(sessionStorage.getItem("legibly:waitlist-joined")).toBe("1");
  });

  it("shows the confirmation to an instance that mounts after the join", async () => {
    sessionStorage.setItem("legibly:waitlist-joined", "1");
    render(<WaitlistForm />);

    expect(await screen.findByRole("status")).toHaveTextContent("You are on the list");
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("puts both instances back to the form when one of them enters another address", async () => {
    render(
      <>
        <WaitlistForm />
        <WaitlistForm />
      </>,
    );

    const first = screen.getAllByLabelText("Email")[0];
    fireEvent.change(first, { target: { value: "designer@studio.com" } });
    fireEvent.submit(first.closest("form")!);
    await waitFor(() => expect(screen.getAllByRole("status")).toHaveLength(2));

    fireEvent.click(screen.getAllByRole("button", { name: "Enter another" })[0]);

    await waitFor(() => expect(screen.getAllByLabelText("Email")).toHaveLength(2));
    expect(sessionStorage.getItem("legibly:waitlist-joined")).toBeNull();
  });

  it("confirms in both instances when either one joins", async () => {
    render(
      <>
        <WaitlistForm />
        <WaitlistForm />
      </>,
    );

    const inputs = screen.getAllByLabelText("Email");
    fireEvent.change(inputs[1], { target: { value: "designer@studio.com" } });
    fireEvent.submit(inputs[1].closest("form")!);

    await waitFor(() => expect(screen.getAllByRole("status")).toHaveLength(2));
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });
});
