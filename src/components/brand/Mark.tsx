import * as React from "react";

/**
 * Auditron Mark — the cross-reference tick + dot.
 * A geometric tick with rounded caps and a small companion dot
 * to the upper-right of the tick's apex. Working-paper origin.
 */
type MarkProps = {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
};

export function Mark({
  size = 24,
  color = "#0E2E25",
  className,
  style,
  title,
}: MarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role={title ? "img" : "presentation"}
      aria-label={title}
      className={className}
      style={style}
    >
      {/* Tick: short stroke from lower-left, long steep stroke up to upper-right */}
      <path
        d="M4.2 13.4 L8.6 17.6 L17.4 5.6"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Companion dot, upper-right of the apex, separated by a clear gap */}
      <circle cx="20.1" cy="3.9" r="1.55" fill={color} />
    </svg>
  );
}

export default Mark;