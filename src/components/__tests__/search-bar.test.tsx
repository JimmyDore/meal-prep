import { act, fireEvent, render, screen } from "@testing-library/react";
import { SearchBar } from "@/components/search-bar";

const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams("");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/recipes",
  useSearchParams: () => mockSearchParams,
}));

describe("SearchBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPush.mockClear();
    // Reset mockSearchParams to empty for each test
    for (const key of [...mockSearchParams.keys()]) {
      mockSearchParams.delete(key);
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders input with defaultValue displayed", () => {
    render(<SearchBar defaultValue="poulet" />);
    const input = screen.getByPlaceholderText("Rechercher une recette...");
    expect(input).toHaveValue("poulet");
  });

  it("renders input with empty string when defaultValue is empty", () => {
    render(<SearchBar defaultValue="" />);
    const input = screen.getByPlaceholderText("Rechercher une recette...");
    expect(input).toHaveValue("");
  });

  it("does NOT call router.push immediately on input change", () => {
    render(<SearchBar defaultValue="" />);
    const input = screen.getByPlaceholderText("Rechercher une recette...");
    fireEvent.change(input, { target: { value: "salade" } });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("calls router.push after 300ms debounce with correct search param", async () => {
    render(<SearchBar defaultValue="" />);
    const input = screen.getByPlaceholderText("Rechercher une recette...");
    fireEvent.change(input, { target: { value: "salade" } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/recipes?q=salade");
  });

  it("does not call router.push before 300ms", async () => {
    render(<SearchBar defaultValue="" />);
    const input = screen.getByPlaceholderText("Rechercher une recette...");
    fireEvent.change(input, { target: { value: "salade" } });

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(mockPush).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it("clears search param when input is emptied", async () => {
    render(<SearchBar defaultValue="salade" />);
    const input = screen.getByPlaceholderText("Rechercher une recette...");
    fireEvent.change(input, { target: { value: "" } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    // When q is deleted and no other params, the URL should be clean
    const pushedUrl = mockPush.mock.calls[0][0] as string;
    expect(pushedUrl).not.toContain("q=");
  });

  it("preserves existing URL params when updating search", async () => {
    // Set existing tags param
    mockSearchParams.append("tags", "rapide");
    mockSearchParams.append("tags", "healthy");

    render(<SearchBar defaultValue="" />);
    const input = screen.getByPlaceholderText("Rechercher une recette...");
    fireEvent.change(input, { target: { value: "poulet" } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    const pushedUrl = mockPush.mock.calls[0][0] as string;
    expect(pushedUrl).toContain("tags=rapide");
    expect(pushedUrl).toContain("tags=healthy");
    expect(pushedUrl).toContain("q=poulet");
  });

  it("resets page param when search changes", async () => {
    mockSearchParams.set("page", "3");

    render(<SearchBar defaultValue="" />);
    const input = screen.getByPlaceholderText("Rechercher une recette...");
    fireEvent.change(input, { target: { value: "pates" } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    const pushedUrl = mockPush.mock.calls[0][0] as string;
    expect(pushedUrl).not.toContain("page=");
    expect(pushedUrl).toContain("q=pates");
  });

  it("only pushes the latest value when input changes within debounce period", async () => {
    render(<SearchBar defaultValue="" />);
    const input = screen.getByPlaceholderText("Rechercher une recette...");

    fireEvent.change(input, { target: { value: "sal" } });
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.change(input, { target: { value: "salade" } });
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.change(input, { target: { value: "salade verte" } });

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // Only the final value should be pushed (once)
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/recipes?q=salade+verte");
  });
});
