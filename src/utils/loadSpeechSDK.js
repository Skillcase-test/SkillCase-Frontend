// The Azure Speech SDK is ~1.5 MB and only the B1 Maya screen uses it, so it is
// no longer a blocking <script> in index.html — it loads on demand instead.
// Resolves to null on failure, which keeps the existing "SDK missing" guards in
// useB1MayaVAD behaving exactly as they did when the CDN was unreachable.
//
// ponytail: URL still tracks @latest, same as the tag it replaced. Pin the
// version in a separate change so an upstream release can't ship straight to
// production and so the file can be cached long-term.
const SDK_URL =
  "https://cdn.jsdelivr.net/npm/microsoft-cognitiveservices-speech-sdk@latest/distrib/browser/microsoft.cognitiveservices.speech.sdk.bundle-min.js";

let loadPromise = null;

export default function loadSpeechSDK() {
  if (window.SpeechSDK) return Promise.resolve(window.SpeechSDK);

  if (!loadPromise) {
    loadPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => resolve(window.SpeechSDK || null);
      script.onerror = () => {
        // Clear the memo so a later turn can retry — one dropped connection
        // shouldn't disable live transcription for the whole session.
        loadPromise = null;
        script.remove();
        resolve(null);
      };
      document.head.appendChild(script);
    });
  }

  return loadPromise;
}
