// Simple MediaRecorder wrapper to capture microphone audio and return a Blob.

export function createRecorder(opts = { mimeType: 'audio/webm' }) {
  let mediaRecorder = null;
  let chunks = [];

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, { mimeType: opts.mimeType });
    chunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    mediaRecorder.start();
    return mediaRecorder;
  }

  function stop() {
    return new Promise((resolve) => {
      if (!mediaRecorder) return resolve(null);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: opts.mimeType });
        resolve(blob);
      };
      mediaRecorder.stop();
    });
  }

  return { start, stop };
}
