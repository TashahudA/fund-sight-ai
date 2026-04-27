import * as React from "react";

/**
 * Auditron Wordmark.
 * The capital "A" is hand-constructed: its crossbar is the tick gesture
 * (angled slightly up from low-left to mid-right) plus a small companion
 * dot to the upper-right of where the crossbar meets the right diagonal.
 * Remaining glyphs "uditron" are set in Inter Tight 700 with tightened tracking.
 */
type WordmarkProps = {
  height?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
};

export function Wordmark({
  height = 22,
  color = "#0E2E25",
  className,
  style,
  title = "Auditron",
}: WordmarkProps) {
  // Intrinsic viewBox: 200 wide × 36 tall.
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 36"
      height={height}
      width={(height * 200) / 36}
      role="img"
      aria-label={title}
      className={className}
      style={style}
    >
      {/* --- Custom "A" --- */}
      {/* Left diagonal */}
      <path
        d="M2.5 32 L14 4"
        stroke={color}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Right diagonal */}
      <path
        d="M14 4 L25.5 32"
        stroke={color}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Crossbar = the tick gesture, slightly angled upward */}
      <path
        d="M7.5 23.5 L20 19"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Companion dot at upper-right of where the crossbar meets the right diagonal */}
      <circle cx="22.6" cy="14.6" r="1.45" fill={color} />

      {/* --- "uditron" in Inter Tight 700 --- */}
      <text
        x="32"
        y="28"
        fill={color}
        style={{
          fontFamily: '"Inter Tight", system-ui, sans-serif',
          fontWeight: 700,
          fontSize: "26px",
          letterSpacing: "-0.02em",
        }}
      >
        uditron
      </text>
    </svg>
  );
}

export default Wordmark;