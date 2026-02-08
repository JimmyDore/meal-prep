import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const { mockSignUpEmail, mockSignInEmail } = vi.hoisted(() => ({
  mockSignUpEmail: vi.fn(),
  mockSignInEmail: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signUp: { email: mockSignUpEmail },
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

import { RegisterForm } from "@/components/auth/register-form";

describe("RegisterForm", () => {
  beforeEach(() => {
    mockSignUpEmail.mockReset();
    mockSignInEmail.mockReset();
    locationAssignSpy.mockClear();
  });

  it("renders email, password, and confirm password fields", () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmer le mot de passe")).toBeInTheDocument();
  });

  it("renders submit button with 'Creer un compte' text", () => {
    render(<RegisterForm />);

    const button = screen.getByRole("button", { name: /creer un compte/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("type", "submit");
  });

  it("shows error when passwords do not match", async () => {
    render(<RegisterForm />);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Mot de passe");
    const confirmInput = screen.getByLabelText("Confirmer le mot de passe");
    const button = screen.getByRole("button", { name: /creer un compte/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.change(confirmInput, { target: { value: "differentpass" } });
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByText("Les mots de passe ne correspondent pas")).toBeInTheDocument();
    });

    expect(mockSignUpEmail).not.toHaveBeenCalled();
  });

  it("calls authClient.signUp.email then signIn.email on valid submit", async () => {
    mockSignUpEmail.mockResolvedValue({ data: { user: { id: "1" } }, error: null });
    mockSignInEmail.mockResolvedValue({ data: { user: { id: "1" } }, error: null });

    render(<RegisterForm />);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Mot de passe");
    const confirmInput = screen.getByLabelText("Confirmer le mot de passe");
    const button = screen.getByRole("button", { name: /creer un compte/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.change(confirmInput, { target: { value: "password123" } });
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(mockSignUpEmail).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
        name: "test",
      });
    });

    await waitFor(() => {
      expect(mockSignInEmail).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });

  it("redirects to '/' on successful sign up and auto-login", async () => {
    mockSignUpEmail.mockResolvedValue({ data: { user: { id: "1" } }, error: null });
    mockSignInEmail.mockResolvedValue({ data: { user: { id: "1" } }, error: null });

    render(<RegisterForm />);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Mot de passe");
    const confirmInput = screen.getByLabelText("Confirmer le mot de passe");
    const button = screen.getByRole("button", { name: /creer un compte/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.change(confirmInput, { target: { value: "password123" } });
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(locationAssignSpy).toHaveBeenCalledWith("/");
    });
  });

  it("displays error message on failed sign up", async () => {
    mockSignUpEmail.mockResolvedValue({
      data: null,
      error: { message: "Email already exists" },
    });

    render(<RegisterForm />);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Mot de passe");
    const confirmInput = screen.getByLabelText("Confirmer le mot de passe");
    const button = screen.getByRole("button", { name: /creer un compte/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.change(confirmInput, { target: { value: "password123" } });
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(
        screen.getByText("Impossible de creer le compte. Cet email est peut-etre deja utilise."),
      ).toBeInTheDocument();
    });

    // signIn should NOT be called when signUp fails
    expect(mockSignInEmail).not.toHaveBeenCalled();
  });

  it("displays error when sign up succeeds but auto-login fails", async () => {
    mockSignUpEmail.mockResolvedValue({ data: { user: { id: "1" } }, error: null });
    mockSignInEmail.mockResolvedValue({
      data: null,
      error: { message: "Login failed" },
    });

    render(<RegisterForm />);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Mot de passe");
    const confirmInput = screen.getByLabelText("Confirmer le mot de passe");
    const button = screen.getByRole("button", { name: /creer un compte/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.change(confirmInput, { target: { value: "password123" } });
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          "Compte cree, mais connexion automatique echouee. Veuillez vous connecter.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("shows validation error for empty email on submit", async () => {
    render(<RegisterForm />);

    const passwordInput = screen.getByLabelText("Mot de passe");
    const confirmInput = screen.getByLabelText("Confirmer le mot de passe");
    const button = screen.getByRole("button", { name: /creer un compte/i });

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.change(confirmInput, { target: { value: "password123" } });
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByText("Email invalide")).toBeInTheDocument();
    });

    expect(mockSignUpEmail).not.toHaveBeenCalled();
  });
});
