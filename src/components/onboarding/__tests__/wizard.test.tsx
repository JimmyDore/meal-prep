import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

// Polyfill ResizeObserver for Radix UI components in jsdom
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill Element.hasPointerCapture for Radix UI
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}

const { mockPush, mockRefresh, mockSaveProfile, mockToast } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
  mockSaveProfile: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("@/app/actions/profile", () => ({
  saveProfile: mockSaveProfile,
}));

vi.mock("sonner", () => ({
  toast: mockToast,
}));

import { OnboardingWizard } from "@/components/onboarding/wizard";

describe("OnboardingWizard", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockRefresh.mockReset();
    mockSaveProfile.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
  });

  it("renders step 1 (Physical) content on initial render", () => {
    render(<OnboardingWizard mode="onboarding" />);

    // Step 1 has fields: Poids, Taille, Age, Sexe, Niveau d'activite
    expect(screen.getByText("Poids (kg)")).toBeInTheDocument();
    expect(screen.getByText("Taille (cm)")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.getByText("Sexe")).toBeInTheDocument();
  });

  it("shows progress indicator with 4 steps, step 1 highlighted", () => {
    render(<OnboardingWizard mode="onboarding" />);

    expect(screen.getByText("Physique")).toBeInTheDocument();
    expect(screen.getByText("Objectif")).toBeInTheDocument();
    expect(screen.getByText("Alimentation")).toBeInTheDocument();
    expect(screen.getByText("Sport")).toBeInTheDocument();
  });

  it("has 'Precedent' button disabled on step 1", () => {
    render(<OnboardingWizard mode="onboarding" />);

    const prevButton = screen.getByRole("button", { name: /precedent/i });
    expect(prevButton).toBeDisabled();
  });

  it("shows 'Suivant' button on step 1 (not 'Terminer')", () => {
    render(<OnboardingWizard mode="onboarding" />);

    expect(screen.getByRole("button", { name: /suivant/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /terminer/i })).not.toBeInTheDocument();
  });

  it("stays on step 1 when clicking 'Suivant' without filling required fields", async () => {
    render(<OnboardingWizard mode="onboarding" />);

    const nextButton = screen.getByRole("button", { name: /suivant/i });

    await act(async () => {
      fireEvent.click(nextButton);
    });

    // Should still show step 1 fields
    await waitFor(() => {
      expect(screen.getByText("Poids (kg)")).toBeInTheDocument();
    });

    // Step 2 content (Objectif) should NOT be visible
    expect(screen.queryByText("Objectif", { selector: "label *" })).not.toBeInTheDocument();
  });

  it("advances to step 2 after step 1 validation passes and clicking 'Suivant'", async () => {
    // Use defaultValues so step 1 fields are pre-filled (avoids Radix Select jsdom issues)
    render(<OnboardingWizard mode="onboarding" defaultValues={completeDefaultValues} />);

    // Click Suivant
    const nextButton = screen.getByRole("button", { name: /suivant/i });
    await act(async () => {
      fireEvent.click(nextButton);
    });

    // Step 2 should now be visible (Goal step has "Nombre de personnes")
    await waitFor(() => {
      expect(screen.getByText("Nombre de personnes")).toBeInTheDocument();
    });

    // Step 1 fields should no longer be visible
    expect(screen.queryByText("Poids (kg)")).not.toBeInTheDocument();
  });

  it("'Precedent' button on step 2 goes back to step 1 with data preserved", async () => {
    render(<OnboardingWizard mode="onboarding" defaultValues={completeDefaultValues} />);

    // Advance to step 2
    const nextButton = screen.getByRole("button", { name: /suivant/i });
    await act(async () => {
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Nombre de personnes")).toBeInTheDocument();
    });

    // Click Precedent
    const prevButton = screen.getByRole("button", { name: /precedent/i });
    expect(prevButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(prevButton);
    });

    // Should be back on step 1 with data preserved
    await waitFor(() => {
      expect(screen.getByText("Poids (kg)")).toBeInTheDocument();
    });

    // Check that weight value was preserved
    const weightInput = screen.getByLabelText("Poids (kg)");
    expect(weightInput).toHaveValue(75);
  });

  it("shows 'Terminer' button on the last step", async () => {
    render(<OnboardingWizard mode="onboarding" defaultValues={completeDefaultValues} />);

    // Navigate to step 4 (last step)
    await navigateToStep(4);

    // Should show Terminer instead of Suivant
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /terminer/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /suivant/i })).not.toBeInTheDocument();
  });

  it("calls saveProfile on final submit in onboarding mode and navigates to '/'", async () => {
    mockSaveProfile.mockResolvedValue({ success: true });

    render(<OnboardingWizard mode="onboarding" defaultValues={completeDefaultValues} />);

    // Navigate to last step
    await navigateToStep(4);

    // Click Terminer
    const submitButton = screen.getByRole("button", { name: /terminer/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockSaveProfile).toHaveBeenCalledTimes(1);
    });

    // Verify saveProfile was called with the complete form data
    const savedData = mockSaveProfile.mock.calls[0][0];
    expect(savedData.weight).toBe(75);
    expect(savedData.height).toBe(175);
    expect(savedData.age).toBe(30);
    expect(savedData.sex).toBe("homme");
    expect(savedData.goal).toBe("maintien");

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("calls saveProfile on final submit in settings mode and shows success toast", async () => {
    mockSaveProfile.mockResolvedValue({ success: true });

    render(<OnboardingWizard mode="settings" defaultValues={completeDefaultValues} />);

    // Navigate to last step
    await navigateToStep(4);

    // Click Terminer
    const submitButton = screen.getByRole("button", { name: /terminer/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockSaveProfile).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Profil mis a jour avec succes");
    });

    expect(mockRefresh).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows error toast when saveProfile returns an error", async () => {
    mockSaveProfile.mockResolvedValue({ error: "Erreur lors de la sauvegarde du profil" });

    render(<OnboardingWizard mode="onboarding" defaultValues={completeDefaultValues} />);

    // Navigate to last step
    await navigateToStep(4);

    // Click Terminer
    const submitButton = screen.getByRole("button", { name: /terminer/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Erreur lors de la sauvegarde du profil");
    });

    // Should NOT navigate
    expect(mockPush).not.toHaveBeenCalled();
  });
});

// --- Helpers ---

const completeDefaultValues = {
  weight: 75,
  height: 175,
  age: 30,
  sex: "homme" as const,
  activityLevel: "moderement_actif" as const,
  goal: "maintien" as const,
  householdSize: 2,
  dietaryPreferences: [],
  sportActivities: [],
};

/**
 * Navigate to the target step by clicking "Suivant" repeatedly.
 * Uses defaultValues to skip validation.
 */
async function navigateToStep(targetStep: number) {
  for (let i = 1; i < targetStep; i++) {
    const nextButton = screen.getByRole("button", { name: /suivant/i });
    await act(async () => {
      fireEvent.click(nextButton);
    });
    // Wait for step transition
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  }
}
