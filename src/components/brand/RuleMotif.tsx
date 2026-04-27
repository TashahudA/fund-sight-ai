import * as React from "react";

/**
 * Working-paper rule motif. Faint horizontal lines every 32px.
 * Variant "ink"      → oxblood at 10% (default for light backgrounds)
 * Variant "cream"    → cream at 18% (use on deep oxblood backgrounds)
 * Variant "ink-faint"→ oxblood at ~5% (almost imperceptible)
 */
type Variant = "ink" | "ink-faint" | "cream";

export function RuleMotif({
  variant = "ink",
  fade = false,
  draw = false,
  className = "",
  style,
}: {
  variant?: Variant;
  fade?: boolean;
  /** When true, plays a one-time horizontal "ledger being drawn" reveal. */
  draw?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const cls =
    variant === "cream" ? "brand-rules-cream" : "brand-rules";
  const opacityStyle: React.CSSProperties =
    variant === "ink-faint" ? { opacity: 0.5 } : {};
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${cls} ${
        fade ? "brand-rules-fade" : ""
      } ${draw ? "brand-rules-draw" : ""} ${className}`}
      style={{ ...opacityStyle, ...style }}
    />
  );
}

export default RuleMotif;