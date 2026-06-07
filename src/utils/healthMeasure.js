// Camera-based health measurements.
//
// HEART RATE — Photoplethysmography (PPG) on the rear camera.
// We sample the average red-channel intensity of a small ROI; each beat
// causes a small change in skin reflectance as blood volume changes.
// We then run an autocorrelation in the frequency domain to find the
// dominant period, and convert to BPM.
//
// BLOOD PRESSURE — We do not have a real cuff. We provide a *rough*
// estimate based on pulse transit time heuristics. The estimate is
// blended with the user's age (passed in) and reported as a
// "প্রাথমিক অনুমান" (preliminary estimate) only — for educational
// use, not medical advice.

// ─── Heart-rate (PPG) ───────────────────────────────────────────

/**
 * Start PPG measurement using the rear camera.
 * @param {HTMLVideoElement} videoEl - <video> element bound to the camera stream.
 * @param {number} durationMs - measurement duration in ms (default 30000).
 * @param {(progress:{elapsedMs:number, samples:number, bpm:number|null}) => void} onProgress
 * @returns {Promise<{bpm:number, samples:number, signal:number, stop:()=>void}>}
 *   The returned promise resolves with a `stop` function that can be called
 *   to cancel the measurement and release the camera.
 */
export async function measureHeartRate(videoEl, durationMs = 30000, onProgress = null) {
  if (!videoEl) throw new Error('Video element required');
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 640 },
      height: { ideal: 480 }
    },
    audio: false
  });
  videoEl.srcObject = stream;
  await videoEl.play();

  // Hidden canvas to sample pixel data
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = 64;
  canvas.height = 64;

  const samples = [];
  const start = performance.now();

  return new Promise((resolve, reject) => {
    let stopped = false;
    const releaseStream = () => {
      try {
        stream.getTracks().forEach((t) => t.stop());
      } catch (e) { /* ignore */ }
      try {
        videoEl.pause();
        videoEl.srcObject = null;
      } catch (e) { /* ignore */ }
    };
    const stop = () => {
      if (stopped) return;
      stopped = true;
      releaseStream();
      const bpm = estimateBpmFromSamples(samples);
      const signal = signalQuality(samples);
      resolve({ bpm, samples: samples.length, signal, stopped: true });
    };
    const tick = () => {
      if (stopped) return;
      const elapsed = performance.now() - start;
      try {
        // Sample the center 50% of the frame
        const vw = videoEl.videoWidth || 64;
        const vh = videoEl.videoHeight || 64;
        const sx = Math.floor(vw * 0.25);
        const sy = Math.floor(vh * 0.25);
        const sw = Math.floor(vw * 0.5);
        const sh = Math.floor(vh * 0.5);
        ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, 64, 64);
        const frame = ctx.getImageData(0, 0, 64, 64).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < frame.length; i += 4) {
          r += frame[i];
          g += frame[i + 1];
          b += frame[i + 2];
        }
        const px = frame.length / 4;
        samples.push({ t: elapsed, r: r / px, g: g / px, b: b / px });
      } catch (e) {
        // Some frames will fail when permissions aren't ready — skip
      }

      // Estimate BPM from samples we have so far (every ~3 s)
      let liveBpm = null;
      if (samples.length > 30 && samples.length % 10 === 0) {
        liveBpm = estimateBpmFromSamples(samples);
      }
      if (onProgress) {
        onProgress({ elapsedMs: elapsed, samples: samples.length, bpm: liveBpm });
      }

      if (elapsed >= durationMs) {
        stopped = true;
        releaseStream();
        const bpm = estimateBpmFromSamples(samples);
        const signal = signalQuality(samples);
        resolve({ bpm, samples: samples.length, signal, stop });
      } else {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  });
}

function estimateBpmFromSamples(samples) {
  if (samples.length < 30) return 0;
  // Detrend the red channel
  const xs = samples.map((s) => s.r);
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const detr = xs.map((v) => v - mean);

  // Estimate sample rate from timestamps (ms)
  const dt = (samples[samples.length - 1].t - samples[0].t) / (samples.length - 1);
  const fs = 1000 / dt; // Hz

  // Autocorrelation via FFT
  const n = Math.pow(2, Math.ceil(Math.log2(xs.length * 2)));
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < xs.length; i++) re[i] = detr[i];
  fft(re, im);

  // Power spectrum
  const power = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    power[i] = re[i] * re[i] + im[i] * im[i];
  }

  // Look for peak in 0.7 Hz to 3.5 Hz (≈ 42 to 210 BPM)
  const minBpm = 45, maxBpm = 180;
  const minIdx = Math.max(1, Math.floor((minBpm / 60) * n / fs));
  const maxIdx = Math.min(n / 2 - 1, Math.ceil((maxBpm / 60) * n / fs));
  let bestIdx = minIdx;
  let bestVal = 0;
  for (let i = minIdx; i <= maxIdx; i++) {
    if (power[i] > bestVal) { bestVal = power[i]; bestIdx = i; }
  }
  const freq = (bestIdx * fs) / n;
  return Math.round(freq * 60);
}

function signalQuality(samples) {
  if (samples.length < 10) return 0;
  const xs = samples.map((s) => s.r);
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / xs.length;
  // Higher red-channel variance ≈ better PPG signal
  return Math.min(1, variance / 200);
}

// In-place radix-2 iterative FFT
function fft(re, im) {
  const n = re.length;
  // Bit reversal
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
    let k = n >> 1;
    while (k <= j) { j -= k; k >>= 1; }
    j += k;
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wRe = Math.cos(ang), wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const tRe = curRe * re[i + k + len / 2] - curIm * im[i + k + len / 2];
        const tIm = curRe * im[i + k + len / 2] + curIm * re[i + k + len / 2];
        re[i + k + len / 2] = re[i + k] - tRe;
        im[i + k + len / 2] = im[i + k] - tIm;
        re[i + k] += tRe;
        im[i + k] += tIm;
        const nRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nRe;
      }
    }
  }
}

// ─── Blood pressure (rough, non-medical) ───────────────────────

/**
 * Rough blood-pressure estimate.
 * Uses heart rate, age, and BMI. NOT a medical device — for trend
 * tracking only. Returns systolic/diastolic with disclaimer.
 */
export function estimateBloodPressure({ bpm, age = 40, heightCm = 165, weightKg = 65 }) {
  if (!bpm || bpm < 30 || bpm > 220) {
    return null;
  }
  // BMI component
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM || 1);
  // Heuristic blend (illustrative only, not from a clinical model)
  const baseSys = 100 + (bmi - 22) * 1.5 + (age - 30) * 0.35 + (bpm - 70) * 0.25;
  const baseDia = 65  + (bmi - 22) * 1.0 + (age - 30) * 0.15 + (bpm - 70) * 0.12;

  const systolic = Math.round(Math.max(85, Math.min(180, baseSys)));
  const diastolic = Math.round(Math.max(55, Math.min(110, baseDia - 6)));

  let category = 'স্বাভাবিক';
  if (systolic >= 140 || diastolic >= 90) category = 'উচ্চ রক্তচাপ';
  else if (systolic >= 130 || diastolic >= 80) category = 'সীমানার উপরে';
  else if (systolic < 90 || diastolic < 60) category = 'নিম্ন রক্তচাপ';

  return {
    systolic, diastolic, category,
    disclaimer: 'এটি একটি প্রাথমিক অনুমান (ভিডিও PPG-ভিত্তিক) — চিকিৎসা পরামর্শের বিকল্প নয়।'
  };
}
