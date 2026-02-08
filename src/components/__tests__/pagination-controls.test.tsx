import { render, screen } from "@testing-library/react";
import { PaginationControls } from "@/components/pagination-controls";

const mockSearchParams = new URLSearchParams("");

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

describe("PaginationControls", () => {
  beforeEach(() => {
    for (const key of [...mockSearchParams.keys()]) {
      mockSearchParams.delete(key);
    }
  });

  it("renders nothing when totalPages is 1", () => {
    const { container } = render(<PaginationControls currentPage={1} totalPages={1} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when totalPages is 0", () => {
    const { container } = render(<PaginationControls currentPage={1} totalPages={0} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders page links for totalPages=3", () => {
    render(<PaginationControls currentPage={1} totalPages={3} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("marks current page with aria-current='page'", () => {
    render(<PaginationControls currentPage={2} totalPages={3} />);
    const currentLink = screen.getByText("2").closest("a");
    expect(currentLink).toHaveAttribute("aria-current", "page");

    const otherLink = screen.getByText("1").closest("a");
    expect(otherLink).not.toHaveAttribute("aria-current");
  });

  it("renders correct number of page links for totalPages=5", () => {
    render(<PaginationControls currentPage={1} totalPages={5} />);
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  it("page links have correct href with page param", () => {
    render(<PaginationControls currentPage={1} totalPages={3} />);

    // Page 1 should not have page= param (deleted for page 1)
    const page1Link = screen.getByText("1").closest("a");
    expect(page1Link).toHaveAttribute("href", "?");

    // Page 2 should have page=2
    const page2Link = screen.getByText("2").closest("a");
    expect(page2Link).toHaveAttribute("href", "?page=2");

    // Page 3 should have page=3
    const page3Link = screen.getByText("3").closest("a");
    expect(page3Link).toHaveAttribute("href", "?page=3");
  });

  it("preserves existing search params in page links", () => {
    mockSearchParams.set("q", "poulet");
    mockSearchParams.append("tags", "rapide");

    render(<PaginationControls currentPage={1} totalPages={3} />);

    const page2Link = screen.getByText("2").closest("a");
    const href = page2Link?.getAttribute("href") ?? "";
    expect(href).toContain("q=poulet");
    expect(href).toContain("tags=rapide");
    expect(href).toContain("page=2");
  });

  it("does not render Previous button on page 1", () => {
    render(<PaginationControls currentPage={1} totalPages={3} />);
    expect(screen.queryByLabelText("Go to previous page")).not.toBeInTheDocument();
  });

  it("does not render Next button on last page", () => {
    render(<PaginationControls currentPage={3} totalPages={3} />);
    expect(screen.queryByLabelText("Go to next page")).not.toBeInTheDocument();
  });

  it("renders Previous button when not on page 1", () => {
    render(<PaginationControls currentPage={2} totalPages={3} />);
    const prevLink = screen.getByLabelText("Go to previous page");
    expect(prevLink).toBeInTheDocument();
    expect(prevLink).toHaveAttribute("href", "?");
  });

  it("renders Next button when not on last page", () => {
    render(<PaginationControls currentPage={2} totalPages={3} />);
    const nextLink = screen.getByLabelText("Go to next page");
    expect(nextLink).toBeInTheDocument();
    expect(nextLink).toHaveAttribute("href", "?page=3");
  });

  it("Previous button has correct href for page 3", () => {
    render(<PaginationControls currentPage={3} totalPages={5} />);
    const prevLink = screen.getByLabelText("Go to previous page");
    expect(prevLink).toHaveAttribute("href", "?page=2");
  });

  it("shows ellipsis for many pages when current is in the middle", () => {
    render(<PaginationControls currentPage={5} totalPages={10} />);
    // Should show page 1, ellipsis, 4, 5, 6, ellipsis, 10
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    // Should have ellipsis elements
    const ellipses = screen.getAllByText("More pages");
    expect(ellipses.length).toBe(2);
  });

  it("preserves search params in Previous and Next hrefs", () => {
    mockSearchParams.set("q", "tofu");

    render(<PaginationControls currentPage={2} totalPages={3} />);

    const prevLink = screen.getByLabelText("Go to previous page");
    expect(prevLink.getAttribute("href")).toContain("q=tofu");

    const nextLink = screen.getByLabelText("Go to next page");
    const nextHref = nextLink.getAttribute("href") ?? "";
    expect(nextHref).toContain("q=tofu");
    expect(nextHref).toContain("page=3");
  });
});
