// Lightweight shimmer-loading placeholder. Renders one or more blocks with
// a moving background gradient while real data is loading. Honors an
// `inline` flag for use inside text, and a `circle` flag for round avatars.
//
// Usage:
//   <Skeleton width="60%" height={14} />
//   <Skeleton variant="text" />
//   <Skeleton variant="circle" width={48} height={48} />
//
// All sizing props accept numbers (px) or strings (e.g. "60%", "10rem").
import React from "react";

export default function Skeleton({
  width = "100%",
  height = 14,
  variant = "rect",
  style = {},
  className = ""
}) {
  const isCircle = variant === "circle" || variant === "avatar";
  const isText = variant === "text" || variant === "line";

  const w = typeof width === "number" ? `${width}px` : width;
  const h = typeof height === "number" ? `${height}px` : height;

  return (
    <span
      role="presentation"
      aria-hidden="true"
      className={
        "skeleton " +
        (isCircle ? "skeleton--circle " : "") +
        (isText ? "skeleton--text " : "") +
        className
      }
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        width: w,
        height: isText && h === "14px" ? "12px" : h,
        ...style
      }}
    />
  );
}

// Convenience: stack of N text lines. Useful for lists.
export function SkeletonLines({ count = 3, lastWidth = "70%", gap = 8 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === count - 1 ? lastWidth : "100%"}
        />
      ))}
    </div>
  );
}

// Convenience: card-shaped placeholder.
export function SkeletonCard({ height = 120, style = {} }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 12,
        background: "#fff",
        ...style
      }}
    >
      <Skeleton variant="text" width="40%" height={12} style={{ marginBottom: 10 }} />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="90%" />
      <Skeleton variant="text" width="65%" />
    </div>
  );
}
