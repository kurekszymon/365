import React from "react";

/** A mouse pointer drawn in canvas coordinates, for the drag demo. */
export const Cursor: React.FC<{ x: number; y: number; opacity: number; pressed?: boolean }> = ({
  x,
  y,
  opacity,
  pressed,
}) => {
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      {pressed ? <circle cx={0} cy={0} r={26} fill="rgba(143, 79, 128, 0.18)" /> : null}
      <path
        d="M0 0 L0 30 L8 23 L13 34 L19 31 L14 20 L24 19 Z"
        fill="#ffffff"
        stroke="#241f1a"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
    </g>
  );
};
