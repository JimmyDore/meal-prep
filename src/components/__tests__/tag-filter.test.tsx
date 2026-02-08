import { render, screen, fireEvent, act } from "@testing-library/react";
import { TagFilter } from "@/components/tag-filter";

const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams("");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/recipes",
  useSearchParams: () => mockSearchParams,
}));

const sampleTags = [
  { id: "1", name: "Rapide", slug: "rapide" },
  { id: "2", name: "Healthy", slug: "healthy" },
  { id: "3", name: "Vegetarien", slug: "vegetarien" },
];

describe("TagFilter", () => {
  beforeEach(() => {
    mockPush.mockClear();
    for (const key of [...mockSearchParams.keys()]) {
      mockSearchParams.delete(key);
    }
  });

  it("renders null when tags array is empty", () => {
    const { container } = render(<TagFilter tags={[]} activeSlugs={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders all tag names when tags provided", () => {
    render(<TagFilter tags={sampleTags} activeSlugs={[]} />);
    expect(screen.getByText("Rapide")).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.getByText("Vegetarien")).toBeInTheDocument();
  });

  it("renders inactive tags with outline variant", () => {
    render(<TagFilter tags={sampleTags} activeSlugs={[]} />);
    const badge = screen.getByText("Rapide").closest("[data-slot='badge']");
    expect(badge).toHaveAttribute("data-variant", "outline");
  });

  it("renders active tags with default variant", () => {
    render(<TagFilter tags={sampleTags} activeSlugs={["rapide"]} />);
    const activeBadge = screen.getByText("Rapide").closest("[data-slot='badge']");
    expect(activeBadge).toHaveAttribute("data-variant", "default");

    const inactiveBadge = screen.getByText("Healthy").closest("[data-slot='badge']");
    expect(inactiveBadge).toHaveAttribute("data-variant", "outline");
  });

  it("clicking inactive tag adds slug to URL params", async () => {
    render(<TagFilter tags={sampleTags} activeSlugs={[]} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Rapide"));
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    const pushedUrl = mockPush.mock.calls[0][0] as string;
    expect(pushedUrl).toContain("tags=rapide");
  });

  it("clicking active tag removes slug from URL params", async () => {
    mockSearchParams.append("tags", "rapide");

    render(<TagFilter tags={sampleTags} activeSlugs={["rapide"]} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Rapide"));
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    const pushedUrl = mockPush.mock.calls[0][0] as string;
    expect(pushedUrl).not.toContain("tags=rapide");
  });

  it("toggling one tag preserves other active tags", async () => {
    mockSearchParams.append("tags", "rapide");
    mockSearchParams.append("tags", "healthy");

    render(
      <TagFilter tags={sampleTags} activeSlugs={["rapide", "healthy"]} />,
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Rapide"));
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    const pushedUrl = mockPush.mock.calls[0][0] as string;
    expect(pushedUrl).not.toContain("tags=rapide");
    expect(pushedUrl).toContain("tags=healthy");
  });

  it("adding a new tag preserves existing active tags", async () => {
    mockSearchParams.append("tags", "rapide");

    render(<TagFilter tags={sampleTags} activeSlugs={["rapide"]} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Vegetarien"));
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    const pushedUrl = mockPush.mock.calls[0][0] as string;
    expect(pushedUrl).toContain("tags=rapide");
    expect(pushedUrl).toContain("tags=vegetarien");
  });

  it("resets page param when toggling tags", async () => {
    mockSearchParams.set("page", "3");

    render(<TagFilter tags={sampleTags} activeSlugs={[]} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Healthy"));
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    const pushedUrl = mockPush.mock.calls[0][0] as string;
    expect(pushedUrl).not.toContain("page=");
    expect(pushedUrl).toContain("tags=healthy");
  });

  it("preserves search param when toggling tags", async () => {
    mockSearchParams.set("q", "poulet");

    render(<TagFilter tags={sampleTags} activeSlugs={[]} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Rapide"));
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    const pushedUrl = mockPush.mock.calls[0][0] as string;
    expect(pushedUrl).toContain("q=poulet");
    expect(pushedUrl).toContain("tags=rapide");
  });
});
