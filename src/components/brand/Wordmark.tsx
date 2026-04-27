import * as React from "react";
import Mark from "./Mark";

/**
 * Auditron lockup — the cross-reference Mark sits to the LEFT of the
 * wordmark "Auditron", set in Fraunces 500 with display optical-size.
 * The letterforms are NOT modified — the Mark does the visual work,
 * the serif wordmark provides the gravitas.
 *
 * `variant="inline"` (default) → mark · 12px gap · wordmark
 * `variant="stacked"`           → mark above, wordmark below, both centred
 */

type Variant = "inline" | "stacked";

type LockupProps = {
  /** Cap height of the wordmark in px. Mark scales proportionally (≈ 0.92×). */
  height?: number;
  /** Colour applied to both the mark and the wordmark. */
  color?: string;
  variant?: Variant;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
};

export function Wordmark({
  height = 24,
  color = "#5C1A1B",
  variant = "inline",
  className,
  style,
  title = "Auditron",
}: LockupProps) {
  // Fraunces cap-height is ≈ 0.72× the font-size. We size the type so its
  // cap height matches `height` precisely, so the mark and the capital "A"
  // align like a coat-of-arms beside a name.
  const fontSize = Math.round(height / 0.72);
  const markSize = Math.round(height * 0.92);

  const wordStyle: React.CSSProperties = {
    fontFamily: '"Fraunces", Georgia, serif',
    fontWeight: 500,
    fontSize,
    lineHeight: 1,
    letterSpacing: "-0.015em",
    color,
    fontVariationSettings: '"opsz" 96',
    // Trim leading so the optical baseline sits flush with the mark
    display: "inline-block",
  };

  if (variant === "stacked") {
    return (
      <div
        className={className}
        style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          ...style,
        }}
        aria-label={title}
        role="img"
      >
        <Mark size={Math.round(height * 1.1)} color={color} />
        <span style={wordStyle}>Auditron</span>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        ...style,
      }}
      aria-label={title}
      role="img"
    >
      <Mark size={markSize} color={color} />
      <span style={wordStyle}>Auditron</span>
    </div>
  );
}

export default Wordmark;