// Helper to safely get environment variables in both Vite and Create React App environments
// SECURITY: The browser must never receive secret API keys. Only public keys/URLs
// should be read on the client.

function safeGet(getter) {
  try {
    return getter();
  } catch (e) {
    return null;
  }
}

export function getEnvVar(name) {
  // Static checks to allow bundler static replacements
  if (name === 'REACT_APP_AI_API_URL') {
    return safeGet(() => process.env.REACT_APP_AI_API_URL) ||
           safeGet(() => import.meta.env.VITE_AI_API_URL) || null;
  }
  if (name === 'REACT_APP_VISION_API_URL') {
    return safeGet(() => process.env.REACT_APP_VISION_API_URL) ||
           safeGet(() => import.meta.env.VITE_VISION_API_URL) || null;
  }
  if (name === 'REACT_APP_FIREBASE_API_KEY') {
    return safeGet(() => process.env.REACT_APP_FIREBASE_API_KEY) ||
           safeGet(() => import.meta.env.VITE_FIREBASE_API_KEY) || null;
  }
  if (name === 'REACT_APP_FIREBASE_AUTH_DOMAIN') {
    return safeGet(() => process.env.REACT_APP_FIREBASE_AUTH_DOMAIN) ||
           safeGet(() => import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) || null;
  }
  if (name === 'REACT_APP_FIREBASE_PROJECT_ID') {
    return safeGet(() => process.env.REACT_APP_FIREBASE_PROJECT_ID) ||
           safeGet(() => import.meta.env.VITE_FIREBASE_PROJECT_ID) || null;
  }
  if (name === 'REACT_APP_FIREBASE_STORAGE_BUCKET') {
    return safeGet(() => process.env.REACT_APP_FIREBASE_STORAGE_BUCKET) ||
           safeGet(() => import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) || null;
  }
  if (name === 'REACT_APP_FIREBASE_MESSAGING_SENDER_ID') {
    return safeGet(() => process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID) ||
           safeGet(() => import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || null;
  }
  if (name === 'REACT_APP_FIREBASE_APP_ID') {
    return safeGet(() => process.env.REACT_APP_FIREBASE_APP_ID) ||
           safeGet(() => import.meta.env.VITE_FIREBASE_APP_ID) || null;
  }
  if (name === 'REACT_APP_FIREBASE_MEASUREMENT_ID') {
    return safeGet(() => process.env.REACT_APP_FIREBASE_MEASUREMENT_ID) ||
           safeGet(() => import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) || null;
  }

  // Dynamic fallback for any other variables
  const viteName = name.replace("REACT_APP_", "VITE_");
  let val = null;
  try {
    val = import.meta.env[viteName];
  } catch (e) {}
  if (!val) {
    try {
      val = process.env[name];
    } catch (e) {}
  }
  return val;
}
