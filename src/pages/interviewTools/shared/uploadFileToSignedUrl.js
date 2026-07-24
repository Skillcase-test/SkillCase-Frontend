const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

// Raised when every attempt failed because the request never reached the server (connection dropped, offline, timeout). Callers surface this differently from a genuine rejection: retrying later usually works.
export class UploadNetworkError extends Error {
  constructor(message, { attempts, lastStatus = 0 } = {}) {
    super(message);
    this.name = "UploadNetworkError";
    this.code = "upload_network_error";
    this.attempts = attempts;
    this.lastStatus = lastStatus;
  }
}

// Raised when the storage service answered and refused the upload. Retrying the same request will not help.
export class UploadRejectedError extends Error {
  constructor(message, { status } = {}) {
    super(message);
    this.name = "UploadRejectedError";
    this.code = "upload_rejected";
    this.status = status;
  }
}

// True for any rejection caused by a deliberate cancellation: fetch and this
// module raise AbortError, axios raises CanceledError/ERR_CANCELED. Callers use
// this to stay silent instead of reporting a failure the candidate did not hit.
export function isAbortError(error) {
  return (
    error?.name === "AbortError" ||
    error?.name === "CanceledError" ||
    error?.code === "ERR_CANCELED"
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Matches what fetch itself throws on abort, so callers can branch on
// error.name === "AbortError" without caring where the rejection came from.
function abortError() {
  return new DOMException("Upload aborted", "AbortError");
}

// Full jitter on an exponential base keeps a roomful of candidates from retrying in lockstep and re-saturating the same uplink.
function backoffDelay(attempt, baseDelayMs) {
  const ceiling = baseDelayMs * 2 ** (attempt - 1);
  return Math.round(ceiling / 2 + Math.random() * (ceiling / 2));
}

function isRetriableStatus(status, canRefreshUrl) {
  if (status === 408 || status === 429) return true;
  if (status >= 500) return true;
  // An expired or clock-skewed signature is only worth retrying when we can ask the backend for a freshly signed URL.
  if ((status === 400 || status === 403) && canRefreshUrl) return true;
  return false;
}

// A fetch that never reached the server rejects with a bare TypeError; an aborted one rejects with an AbortError. Both are worth another attempt.
function isFetchNetworkFailure(error) {
  return error?.name === "TypeError" || error?.name === "AbortError";
}

// Deliberately stricter than the fetch check: a getUploadUrl refresher runs caller code, and a TypeError from a bug in there must surface as itself rather than be retried three times and reported as a network failure. Only the axios "request sent, no response" shape counts.
function isRequestNetworkFailure(error) {
  if (error?.code === "ERR_NETWORK" || error?.code === "ECONNABORTED") {
    return true;
  }
  return error?.response === undefined && error?.request !== undefined;
}

export async function uploadFileToSignedUrl({
  file,
  uploadUrl,
  contentType,
  getUploadUrl,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  baseDelayMs = DEFAULT_BASE_DELAY_MS,
  onRetry,
  signal,
}) {
  if (!getUploadUrl && !uploadUrl) {
    throw new Error("uploadFileToSignedUrl requires uploadUrl or getUploadUrl");
  }

  const resolvedContentType =
    contentType || file?.type || "application/octet-stream";
  let lastError = null;
  let lastStatus = 0;

  if (signal?.aborted) throw abortError();

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let target = null;

    // Minting the signed URL and the PUT itself are classified separately: only a dropped request is retriable, anything the server actually answered (404 stale session, 403 finished submission) must surface now.
    try {
      target = getUploadUrl ? await getUploadUrl({ attempt }) : { uploadUrl };
    } catch (error) {
      // Checked before classifying: a cancelled axios request rejects with a
      // CanceledError whose shape would otherwise look retriable.
      if (signal?.aborted) throw abortError();
      if (!isRequestNetworkFailure(error)) throw error;
      lastError = error;
    }

    if (target) {
      try {
        const response = await fetch(target.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": resolvedContentType },
          body: file,
          signal,
        });

        if (response.ok) {
          return { ...target, attempts: attempt };
        }

        lastStatus = response.status;
        if (!isRetriableStatus(response.status, Boolean(getUploadUrl))) {
          throw new UploadRejectedError(
            `Upload rejected with status ${response.status}`,
            { status: response.status },
          );
        }
        lastError = new UploadNetworkError(
          `Upload failed with status ${response.status}`,
          { attempts: attempt, lastStatus: response.status },
        );
      } catch (error) {
        if (error instanceof UploadRejectedError) throw error;
        if (signal?.aborted) throw abortError();
        if (!isFetchNetworkFailure(error)) throw error;
        lastError = error;
      }
    }

    // An abort is a deliberate handover, not a failure to report: whoever
    // aborted (the overall-time-limit timer) owns the outcome from here.
    if (signal?.aborted) throw abortError();

    if (attempt < maxAttempts) {
      onRetry?.({ attempt, maxAttempts, error: lastError });
      await delay(backoffDelay(attempt, baseDelayMs));
      if (signal?.aborted) throw abortError();
    }
  }

  throw new UploadNetworkError(
    "Upload could not reach the server after multiple attempts",
    { attempts: maxAttempts, lastStatus },
  );
}
