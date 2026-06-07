import React from "react";

/**
 * SectionHead
 * -----------
 * A small section title bar with an emoji + Bengali text.
 *
 * Props
 *  - icon  : emoji or short text shown on the left
 *  - title : Bengali section title
 */
export default function SectionHead({ icon, title }) {
  return (
    <div className="section-head">
      {icon} {title}
    </div>
  );
}
