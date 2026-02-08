import { cn } from "@/lib/utils";

const colorClasses = {
  red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-700",
  yellow: "bg-amber-100 text-amber-700",
  green: "bg-green-100 text-green-700",
} as const;

interface MacroBadgeProps {
  label: string;
  value: number;
  unit?: string;
  color: keyof typeof colorClasses;
}

export function MacroBadge({ label, value, unit = "g", color }: MacroBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        colorClasses[color],
      )}
    >
      {label} {Math.round(value)}
      {unit}
    </span>
  );
}
