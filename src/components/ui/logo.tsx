import { cn } from "@/lib/utils";

interface ProjecontLogoProps {
  variant?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

export function ProjecontLogo({
  variant = "light",
  size = "md",
  showTagline = false,
  className,
}: ProjecontLogoProps) {
  const isDark = variant === "dark";

  const sizes = {
    sm: { icon: 24, text: "text-lg", tagline: "text-xs" },
    md: { icon: 32, text: "text-2xl", tagline: "text-xs" },
    lg: { icon: 44, text: "text-3xl", tagline: "text-sm" },
  };

  const s = sizes[size];
  const iconColor = isDark ? "#F7F6F2" : "#1A1916";
  const accentColor = isDark ? "#378ADD" : "#378ADD";
  const textColor = isDark ? "text-white" : "text-ds-ink";
  const taglineColor = isDark ? "text-white/60" : "text-ds-ash";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* SVG Icon — two petal shapes forming "p" */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Left petal */}
        <path
          d="M10 8C10 8 10 20 18 26C14 28 10 32 10 38"
          stroke={iconColor}
          strokeWidth="0"
          fill="none"
        />
        <path
          d="M8 6C8 6 8 18 16 24C12 26 8 30 8 36C8 36 8 24 20 24C20 24 8 24 8 6Z"
          fill={accentColor}
        />
        {/* Right petal */}
        <path
          d="M24 6C24 6 36 6 36 18C36 24 32 28 24 28C24 28 24 16 24 6Z"
          fill={iconColor}
        />
        <path
          d="M24 20C24 20 36 20 36 32C36 38 32 42 24 42C24 42 24 30 24 20Z"
          fill={accentColor}
          opacity="0.7"
        />
      </svg>

      <div className="flex flex-col">
        <span
          className={cn("font-bold leading-none tracking-tight", s.text, textColor)}
        >
          projecont
        </span>
        {showTagline && (
          <span className={cn("font-normal leading-tight mt-0.5", s.tagline, taglineColor)}>
            Consultoria Contábil
          </span>
        )}
      </div>
    </div>
  );
}
