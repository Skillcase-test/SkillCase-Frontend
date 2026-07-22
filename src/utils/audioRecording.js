// Shared teardown helpers for the Web Audio recorders.
// Closes an AudioContext at most once.
export function closeAudioContext(context) {
  if (!context || context.state === "closed") return;
  try {
    Promise.resolve(context.close()).catch(() => {});
  } catch {
    // Older WebKit implementations throw synchronously instead of rejecting.
  }
}

// Stops every track on a media stream, releasing the microphone.
export function stopMediaStream(stream) {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => track.stop());
  } catch {
    // Tracks already stopped; releasing twice is not an error worth surfacing.
  }
}

// Disconnects an audio node, tolerating an already-disconnected node.
export function disconnectAudioNode(node) {
  if (!node) return;
  try {
    node.disconnect();
  } catch {
    // Already disconnected.
  }
}

// Clears an interval held in a ref and empties the ref.
export function clearRecordingTimer(timerRef) {
  if (timerRef?.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}
