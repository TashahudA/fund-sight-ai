import * as React from "react";

/**
 * Working-paper rule motif. Faint horizontal lines every 32px.
 * Variant "ink"      → deep forest at 8% (default for light backgrounds)
 * Variant "champagne"→ champagne at 18% (use on dark forest)
 * Variant "ink-faint"→ deep forest at ~4% (almost imperceptible)
 */
type Variant = "ink" | "ink-faint" | "champagne";

export function RuleMotif({
  variant = "ink",
  fade = false,
  className = "",
  style,
}: {
  variant?: Variant;
  fade?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const cls =
    variant === "champagne"
      ? "brand-rules-champagne"
      : "brand-rules";
  const opacityStyle: React.CSSProperties =
    variant === "ink-faint" ? { opacity: 0.5 } : {};
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${cls} ${
        fade ? "brand-rules-fade" : ""
      } ${className}`}
      style={{ ...opacityStyle, ...style }}
    />
  );
}

export default RuleMotif;