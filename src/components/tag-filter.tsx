"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";

interface TagFilterProps {
  tags: Array<{ id: string; name: string; slug: string }>;
  activeSlugs: string[];
}

export function TagFilter({ tags, activeSlugs }: TagFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleToggle(slug: string) {
    const params = new URLSearchParams(searchParams.toString());

    // Get current active tags
    const currentTags = params.getAll("tags");

    // Clear all existing tags params
    params.delete("tags");

    if (currentTags.includes(slug)) {
      // Remove the tag (toggle off)
      for (const tag of currentTags) {
        if (tag !== slug) {
          params.append("tags", tag);
        }
      }
    } else {
      // Add the tag (toggle on)
      for (const tag of currentTags) {
        params.append("tags", tag);
      }
      params.append("tags", slug);
    }

    // Reset to page 1 on filter change
    params.delete("page");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${isPending ? "opacity-50" : ""}`}>
      {tags.map((tag) => {
        const isActive = activeSlugs.includes(tag.slug);
        return (
          <button key={tag.id} type="button" onClick={() => handleToggle(tag.slug)}>
            <Badge variant={isActive ? "default" : "outline"} className="cursor-pointer">
              {tag.name}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
