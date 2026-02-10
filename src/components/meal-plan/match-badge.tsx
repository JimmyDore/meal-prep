"use client";

import { matchColor } from "@/lib/meal-plan";
import { cn } from "@/lib/utils";

interface MatchBadgeProps {
  score: number;
  size?: "sm" | "md";
}

const colorClasses: Record<ReturnType<typeof matchColor>, string> = {
  green: "border-green-200 bg-green-100 text-green-700",
  yellow: "border-amber-200 bg-amber-100 text-amber-700",
  red: "border-red-200 bg-red-100 text-red-700",
};

const sizeClasses: Record<"sm" | "md", string> = {
  sm: "px-1.5 py-0.5 text-xs",
  md: "px-2 py-1 text-sm",
};

export function MatchBadge({ score, size = "sm" }: MatchBadgeProps) {
  const color = matchColor(score);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        colorClasses[color],
        sizeClasses[size],
      )}
    >
      {Math.round(score)}%
    </span>
  );
}
