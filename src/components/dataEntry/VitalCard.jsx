import React from "react";

/**
 * VitalCard
 * ----------
 * A small, self-contained card showing a labelled vitals input
 * (temperature, blood pressure, oxygen, heart rate, etc.).
 *
 * Props
 *  - label    : Bengali label text (e.g. "তাপমাত্রা")
 *  - value    : current input value
 *  - onChange : change handler
 *  - type     : input type ("text" | "number") — defaults to "text"
 *  - unit     : unit text shown beneath the input (e.g. "°সেলসিয়াস")
 *  - icon     : JSX node (svg) shown next to the label
 *  - required : whether the input is required
 *  - inputMode: optional inputMode hint (e.g. "numeric", "decimal")
 */
export default function VitalCard({
  label,
  value,
  onChange,
  type = "text",
  unit,
  icon,
  required = false,
  inputMode,
  abnormal = false
}) {
  return (
    <div className={`vital-card${abnormal ? " abnormal" : ""}`} style={{ marginTop: 10 }}>
      <div className="vital-lbl">
        {icon}
        {label}
      </div>
      <input
        type={type}
        className="vital-inp"
        value={value}
        onChange={onChange}
        required={required}
        inputMode={inputMode}
      />
      {unit && <div className="vital-unit">{unit}</div>}
    </div>
  );
}
