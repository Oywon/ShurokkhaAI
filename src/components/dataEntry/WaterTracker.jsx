import React from "react";

/**
 * WaterTracker
 * ------------
 * A small +/- counter for the number of water glasses consumed today.
 *
 * Props
 *  - count   : number
 *  - onDec   : () => void
 *  - onInc   : () => void
 */
export default function WaterTracker({ count, onDec, onInc }) {
  return (
    <div className="water-row">
      <div className="water-label">গ্লাস পান করেছি</div>
      <div className="water-ctrl">
        <button
          type="button"
          className="w-btn minus"
          onClick={onDec}
          aria-label="এক গ্লাস কমান"
        >
          −
        </button>
        <div className="w-count">{count}</div>
        <button
          type="button"
          className="w-btn plus"
          onClick={onInc}
          aria-label="এক গ্লাস বাড়ান"
        >
          +
        </button>
      </div>
    </div>
  );
}
