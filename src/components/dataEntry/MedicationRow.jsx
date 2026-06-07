import React from "react";

/**
 * MedicationRow
 * -------------
 * A single clickable row that toggles a medication "taken / pending" state.
 *
 * Props
 *  - label   : medication name shown in the row
 *  - taken   : boolean — whether the medication is marked as taken
 *  - onToggle: () => void
 */
export default function MedicationRow({ label, taken, onToggle }) {
  return (
    <div className="med-row" onClick={onToggle}>
      <div className={taken ? "med-check-done" : "med-check-empty"}>
        {taken ? "✓" : ""}
      </div>
      <div className="med-label">{label}</div>
      <div className={taken ? "med-status-done" : "med-status-empty"}>
        {taken ? "খেয়েছি ✓" : "বাকি আছে"}
      </div>
    </div>
  );
}
