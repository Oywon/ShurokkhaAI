// Helper to safely get environment variables in both Vite and CRA
function getEnvVar(name) {
  const viteName = name.replace("REACT_APP_", "VITE_");
  try {
    if (import.meta.env && import.meta.env[viteName]) {
      return import.meta.env[viteName];
    }
  } catch (e) {}
  try {
    if (typeof process !== "undefined" && process.env && process.env[name]) {
      return process.env[name];
    }
  } catch (e) {}
  return null;
}

// Get current GPS coordinates, falling back to Dhaka if unavailable/denied.
function getCurrentCoords() {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      return resolve({ lat: 23.8103, lon: 90.4125, fallback: true });
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, fallback: false }),
      () => resolve({ lat: 23.8103, lon: 90.4125, fallback: true }),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 1000 * 60 * 30 }
    );
  });
}

// Fetch current temperature from the server-side /weather proxy.
// Returns { temp, feelsLike, humidity, description, city, country, source }.
// `source` is "api" on success, "fallback" if API not configured.
export async function fetchCurrentWeather() {
  const url = getEnvVar('REACT_APP_AI_API_URL') || 'http://localhost:3001';
  try {
    const { lat, lon } = await getCurrentCoords();
    const res = await fetch(`${url.replace(/\/$/, '')}/weather?lat=${lat}&lon=${lon}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { ...data, source: 'api' };
  } catch (err) {
    console.warn('Weather fetch failed, using local fallback:', err.message);
    // Local fallback — Dhaka's typical June average
    return {
      temp: 32.0,
      feelsLike: 38.0,
      humidity: 78,
      description: 'partly cloudy',
      city: 'ঢাকা',
      country: 'BD',
      source: 'fallback'
    };
  }
}
