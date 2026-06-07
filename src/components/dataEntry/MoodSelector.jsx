import React from "react";

/**
 * MoodSelector
 * ------------
 * Renders a horizontal chip list for picking a mood.
 *
 * Props
 *  - moods       : array of mood strings
 *  - selected    : currently selected mood
 *  - onSelect    : (mood) => void
 */
export default function MoodSelector({ moods = [], selected, onSelect }) {
  return (
    <div className="mood-chips">
      {moods.map((m) => (
        <div
          key={m}
          className={`mood-chip ${selected === m ? "sel" : "def"}`}
          onClick={() => onSelect(m)}
        >
          {m}
        </div>
      ))}
    </div>
  );
}
