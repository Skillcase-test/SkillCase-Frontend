import api from "./axios";

// A cached GET that a screen can also peek at synchronously on first render:
// read(...args) fetches, read.peek(...args) returns the cached { data } or undefined.
export function cachedRead(build) {
  const read = (...args) => api.cachedGet(...build(...args));
  read.peek = (...args) => api.peekGet?.(...build(...args));
  return read;
}
