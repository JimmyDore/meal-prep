"use client";

import { useSearchParams } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
}

function buildPageHref(page: number, searchParams: URLSearchParams): string {
  const params = new URLSearchParams(searchParams.toString());
  if (page <= 1) {
    params.delete("page");
  } else {
    params.set("page", String(page));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "?";
}

type PageEntry = { type: "page"; page: number } | { type: "ellipsis"; position: "start" | "end" };

function getPageEntries(current: number, total: number): PageEntry[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => ({ type: "page" as const, page: i + 1 }));
  }

  const entries: PageEntry[] = [{ type: "page", page: 1 }];

  if (current > 3) {
    entries.push({ type: "ellipsis", position: "start" });
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    entries.push({ type: "page", page: i });
  }

  if (current < total - 2) {
    entries.push({ type: "ellipsis", position: "end" });
  }

  entries.push({ type: "page", page: total });

  return entries;
}

export function PaginationControls({ currentPage, totalPages }: PaginationControlsProps) {
  const searchParams = useSearchParams();

  if (totalPages <= 1) {
    return null;
  }

  const entries = getPageEntries(currentPage, totalPages);

  return (
    <Pagination>
      <PaginationContent>
        {currentPage > 1 && (
          <PaginationItem>
            <PaginationPrevious href={buildPageHref(currentPage - 1, searchParams)} />
          </PaginationItem>
        )}

        {entries.map((entry) => {
          if (entry.type === "ellipsis") {
            return (
              <PaginationItem key={`ellipsis-${entry.position}`}>
                <PaginationEllipsis />
              </PaginationItem>
            );
          }

          return (
            <PaginationItem key={entry.page}>
              <PaginationLink
                href={buildPageHref(entry.page, searchParams)}
                isActive={entry.page === currentPage}
              >
                {entry.page}
              </PaginationLink>
            </PaginationItem>
          );
        })}

        {currentPage < totalPages && (
          <PaginationItem>
            <PaginationNext href={buildPageHref(currentPage + 1, searchParams)} />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
}
