import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const { mockSignInEmail } = vi.hoisted(() => ({
  mockSignInEmail: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: { email: mockSignInEmail },
  },
}));

// Stub window.location.href assignment
const locationAssignSpy = vi.fn();

beforeAll(() => {
  Object.defineProperty(window, "location", {
    writable: true,
    value: { ...window.location, href: "" },
  });
  Object.defineProperty(window.location, "href", {
    set: locationAssignSpy,
    get: () => "http://localhost:3000",
  });
});

import { LoginForm } from "@/components/auth/login-form";

describe("LoginForm", () => {
  beforeEach(() => {
    mockSignInEmail.mockReset();
    locationAssignSpy.mockClear();
  });

  it("renders email and password inputs", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument();
  });

  it("renders submit button with 'Se connecter' text", () => {
    render(<LoginForm />);

    const button = screen.getByRole("button", { name: /se connecter/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("type", "submit");
  });

  it("shows validation error for empty email", async () => {
    render(<LoginForm />);

    const button = screen.getByRole("button", { name: /se connecter/i });

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByText("Email invalide")).toBeInTheDocument();
    });
  });

  it("shows validation error for short password", async () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Mot de passe");
    const button = screen.getByRole("button", { name: /se connecter/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "short" } });
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(
        screen.getByText("Le mot de passe doit contenir au moins 8 caracteres"),
      ).toBeInTheDocument();
    });
  });

  it("calls authClient.signIn.email with email and password on valid submit", async () => {
    mockSignInEmail.mockResolvedValue({ data: { user: { id: "1" } }, error: null });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Mot de passe");
    const button = screen.getByRole("button", { name: /se connecter/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(mockSignInEmail).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });

  it("redirects to '/' on successful sign in", async () => {
    mockSignInEmail.mockResolvedValue({ data: { user: { id: "1" } }, error: null });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Mot de passe");
    const button = screen.getByRole("button", { name: /se connecter/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(locationAssignSpy).toHaveBeenCalledWith("/");
    });
  });

  it("displays error message on failed sign in", async () => {
    mockSignInEmail.mockResolvedValue({
      data: null,
      error: { message: "Invalid credentials" },
    });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Mot de passe");
    const button = screen.getByRole("button", { name: /se connecter/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByText("Email ou mot de passe incorrect")).toBeInTheDocument();
    });
  });

  it("does not call signIn when form is invalid", async () => {
    render(<LoginForm />);

    const button = screen.getByRole("button", { name: /se connecter/i });

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByText("Email invalide")).toBeInTheDocument();
    });

    expect(mockSignInEmail).not.toHaveBeenCalled();
  });
});
