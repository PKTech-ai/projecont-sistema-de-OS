import { cn } from "@/lib/utils";

type Variant = "paper" | "ink";

interface DotGridBackgroundProps {
  children: React.ReactNode;
  className?: string;
  /** paper = fundo claro tipo caderno; ink = pontos sutis sobre sidebar/hero escuro */
  variant?: Variant;
}

/**
 * Grade de pontos (dot grid) — clean, inspiração em cadernos / notebooks.
 */
export function DotGridBackground({
  children,
  className,
  variant = "paper",
}: DotGridBackgroundProps) {
  return (
    <div
      className={cn(
        variant === "paper" ? "ds-bg-dot-grid" : "ds-bg-dot-grid-ink",
        className
      )}
    >
      {children}
    </div>
  );
}
