interface BrandLogoProps {
  theme?: "light" | "dark";
  tagline?: string;
  className?: string;
  compact?: boolean;
  iconSize?: "sm" | "md" | "lg";
}

const iconSizes = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-14 w-14",
};

export default function BrandLogo({
  theme = "light",
  tagline = "Research | Backtest | Execute",
  className,
  compact = false,
  iconSize = "md",
}: BrandLogoProps) {
  const isDark = theme === "dark";
  const wrapperClassName = ["flex items-center gap-3", className].filter(Boolean).join(" ");
  const iconClassName = [
    "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[14px] border shadow-[0_18px_35px_rgba(7,24,53,0.18)]",
    iconSizes[iconSize],
    isDark
      ? "border-white/12 bg-[linear-gradient(180deg,#0f4f9a_0%,#0b2a5b_58%,#081b38_100%)]"
      : "border-sky-200/70 bg-[linear-gradient(180deg,#0a8ad6_0%,#0b2a5b_100%)]",
  ]
    .filter(Boolean)
    .join(" ");
  const titleClassName = isDark ? "text-white" : "text-[#0b2a5b]";
  const taglineClassName = isDark ? "text-sky-100/65" : "text-slate-500";

  return (
    <div className={wrapperClassName}>
      <div className={iconClassName} aria-hidden="true">
        <svg viewBox="0 0 72 72" className="h-[76%] w-[76%]" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11 52.5H61" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeLinecap="round" />
          <rect x="12" y="29" width="10" height="22" rx="4" fill="rgba(255,255,255,0.18)" />
          <rect x="29" y="21" width="10" height="30" rx="4" fill="rgba(255,255,255,0.26)" />
          <rect x="46" y="12" width="10" height="39" rx="4" fill="rgba(255,255,255,0.34)" />
          <path
            d="M14 43L27 35L36 39L53 21"
            stroke="#7DD3FC"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M46 21H53V28" stroke="#7DD3FC" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="14" cy="43" r="3" fill="#E0F2FE" />
          <circle cx="27" cy="35" r="3" fill="#E0F2FE" />
          <circle cx="36" cy="39" r="3" fill="#E0F2FE" />
          <circle cx="53" cy="21" r="3.5" fill="#E0F2FE" />
        </svg>
      </div>

      {compact ? null : (
        <div className="min-w-0">
          <p className={`text-lg font-semibold tracking-tight ${titleClassName}`}>AlgoTrader</p>
          <p className={`text-[11px] uppercase tracking-[0.24em] ${taglineClassName}`}>{tagline}</p>
        </div>
      )}
    </div>
  );
}
