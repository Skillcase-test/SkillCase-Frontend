import { describe, test, expect, beforeEach, vi } from "vitest";
import {
  uploadFileToSignedUrl,
  UploadNetworkError,
  UploadRejectedError,
  isAbortError,
} from "../pages/interviewTools/shared/uploadFileToSignedUrl";

const FILE = new Blob(["video-bytes"], { type: "video/mp4" });

// A dropped connection surfaces as a TypeError from fetch — the exact shape
// that took down answer uploads in production.
function networkFailure() {
  return Promise.reject(new TypeError("Failed to fetch"));
}

function httpResponse(status) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status });
}

describe("uploadFileToSignedUrl", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  test("returns the signed target and attempt count on first success", async () => {
    globalThis.fetch.mockImplementationOnce(() => httpResponse(200));

    const result = await uploadFileToSignedUrl({
      file: FILE,
      uploadUrl: "https://s3.example/answer.mp4?sig=1",
      contentType: "video/mp4",
    });

    expect(result.attempts).toBe(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe("https://s3.example/answer.mp4?sig=1");
    expect(init.method).toBe("PUT");
    expect(init.headers["Content-Type"]).toBe("video/mp4");
  });

  test("retries a dropped connection and re-mints the signed URL each attempt", async () => {
    globalThis.fetch
      .mockImplementationOnce(networkFailure)
      .mockImplementationOnce(networkFailure)
      .mockImplementationOnce(() => httpResponse(200));

    const getUploadUrl = vi.fn(async ({ attempt }) => ({
      uploadUrl: `https://s3.example/answer.mp4?sig=${attempt}`,
      key: "interview-submissions/14/233/100/answer.mp4",
    }));
    const onRetry = vi.fn();

    const result = await uploadFileToSignedUrl({
      file: FILE,
      contentType: "video/mp4",
      getUploadUrl,
      baseDelayMs: 0,
      onRetry,
    });

    expect(result.key).toBe("interview-submissions/14/233/100/answer.mp4");
    expect(result.attempts).toBe(3);
    expect(getUploadUrl).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch.mock.calls[2][0]).toContain("sig=3");
  });

  test("a failing upload-url request counts against the same retry budget", async () => {
    globalThis.fetch.mockImplementation(() => httpResponse(200));

    const getUploadUrl = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error("Network Error"), { code: "ERR_NETWORK" }),
      )
      .mockResolvedValue({ uploadUrl: "https://s3.example/x", key: "k" });

    const result = await uploadFileToSignedUrl({
      file: FILE,
      contentType: "video/mp4",
      getUploadUrl,
      baseDelayMs: 0,
    });

    expect(result.attempts).toBe(2);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test("throws UploadNetworkError once the attempt budget is exhausted", async () => {
    globalThis.fetch.mockImplementation(networkFailure);
    const onRetry = vi.fn();

    await expect(
      uploadFileToSignedUrl({
        file: FILE,
        uploadUrl: "https://s3.example/answer.mp4",
        contentType: "video/mp4",
        maxAttempts: 3,
        baseDelayMs: 0,
        onRetry,
      }),
    ).rejects.toBeInstanceOf(UploadNetworkError);

    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    // No retry notice after the final attempt — there is nothing left to wait for.
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  test("does not retry a definitive rejection", async () => {
    globalThis.fetch.mockImplementation(() => httpResponse(404));

    await expect(
      uploadFileToSignedUrl({
        file: FILE,
        uploadUrl: "https://s3.example/answer.mp4",
        contentType: "video/mp4",
        baseDelayMs: 0,
      }),
    ).rejects.toBeInstanceOf(UploadRejectedError);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test("retries an expired signature only when a fresh URL can be minted", async () => {
    globalThis.fetch
      .mockImplementationOnce(() => httpResponse(403))
      .mockImplementationOnce(() => httpResponse(200));

    const result = await uploadFileToSignedUrl({
      file: FILE,
      contentType: "video/mp4",
      getUploadUrl: async () => ({ uploadUrl: "https://s3.example/x", key: "k" }),
      baseDelayMs: 0,
    });
    expect(result.attempts).toBe(2);

    globalThis.fetch.mockClear();
    globalThis.fetch.mockImplementation(() => httpResponse(403));

    await expect(
      uploadFileToSignedUrl({
        file: FILE,
        uploadUrl: "https://s3.example/answer.mp4",
        contentType: "video/mp4",
        baseDelayMs: 0,
      }),
    ).rejects.toBeInstanceOf(UploadRejectedError);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test("retries 5xx from the storage service", async () => {
    globalThis.fetch
      .mockImplementationOnce(() => httpResponse(503))
      .mockImplementationOnce(() => httpResponse(200));

    const result = await uploadFileToSignedUrl({
      file: FILE,
      uploadUrl: "https://s3.example/answer.mp4",
      contentType: "video/mp4",
      baseDelayMs: 0,
    });

    expect(result.attempts).toBe(2);
  });

  // A finished or expired session makes the backend answer 404/403. Retrying
  // that is pointless and would hold the candidate on a spinner, so the error
  // must escape the loop on the first attempt, unwrapped.
  test("does not retry an upload-url request the server answered", async () => {
    globalThis.fetch.mockImplementation(() => httpResponse(200));

    const rejection = Object.assign(new Error("Request failed"), {
      name: "AxiosError",
      code: "ERR_BAD_REQUEST",
      request: {},
      response: { status: 404, data: { message: "Submission not found" } },
    });
    const getUploadUrl = vi.fn().mockRejectedValue(rejection);

    await expect(
      uploadFileToSignedUrl({
        file: FILE,
        contentType: "video/mp4",
        getUploadUrl,
        baseDelayMs: 0,
      }),
    ).rejects.toBe(rejection);

    expect(getUploadUrl).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  // A TypeError raised by a bug inside the caller's refresher must not be
  // mistaken for a dropped connection.
  test("does not retry a programming error inside getUploadUrl", async () => {
    const bug = new TypeError("Cannot read properties of undefined");
    const getUploadUrl = vi.fn().mockRejectedValue(bug);

    await expect(
      uploadFileToSignedUrl({
        file: FILE,
        contentType: "video/mp4",
        getUploadUrl,
        baseDelayMs: 0,
      }),
    ).rejects.toBe(bug);

    expect(getUploadUrl).toHaveBeenCalledTimes(1);
  });

  // The overall-time-limit timer aborts in-flight uploads so its forced finish
  // cannot race a save that lands after the session is already completed.
  describe("abort", () => {
    test("stops retrying and rejects with AbortError", async () => {
      const controller = new AbortController();
      const onRetry = vi.fn();

      globalThis.fetch.mockImplementation(() => {
        controller.abort();
        return Promise.reject(new TypeError("Failed to fetch"));
      });

      await expect(
        uploadFileToSignedUrl({
          file: FILE,
          uploadUrl: "https://s3.example/answer.mp4",
          contentType: "video/mp4",
          maxAttempts: 3,
          baseDelayMs: 0,
          signal: controller.signal,
          onRetry,
        }),
      ).rejects.toMatchObject({ name: "AbortError" });

      // Aborted mid-flight: no second attempt, no retry notice to the candidate.
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(onRetry).not.toHaveBeenCalled();
    });

    test("rejects immediately when the signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        uploadFileToSignedUrl({
          file: FILE,
          uploadUrl: "https://s3.example/answer.mp4",
          contentType: "video/mp4",
          signal: controller.signal,
        }),
      ).rejects.toMatchObject({ name: "AbortError" });

      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    // Axios rejects a cancelled request with a CanceledError, whose shape
    // (no response) would otherwise be classified as a retriable network drop.
    test("a cancelled upload-url request surfaces as AbortError, not a retry", async () => {
      const controller = new AbortController();
      const getUploadUrl = vi.fn(async () => {
        controller.abort();
        throw Object.assign(new Error("canceled"), {
          name: "CanceledError",
          code: "ERR_CANCELED",
          request: {},
        });
      });

      await expect(
        uploadFileToSignedUrl({
          file: FILE,
          contentType: "video/mp4",
          getUploadUrl,
          maxAttempts: 3,
          baseDelayMs: 0,
          signal: controller.signal,
        }),
      ).rejects.toMatchObject({ name: "AbortError" });

      expect(getUploadUrl).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    test("an upload that completes before the abort still succeeds", async () => {
      const controller = new AbortController();
      globalThis.fetch.mockImplementation(() => httpResponse(200));

      const result = await uploadFileToSignedUrl({
        file: FILE,
        uploadUrl: "https://s3.example/answer.mp4",
        contentType: "video/mp4",
        signal: controller.signal,
      });

      expect(result.attempts).toBe(1);
      controller.abort();
    });
  });

  // The pages branch on this to stay silent when the time-limit timer cancels
  // a submission; a false negative would put a red error on the done screen.
  describe("isAbortError", () => {
    test("recognises every cancellation shape, and nothing else", () => {
      expect(isAbortError(new DOMException("x", "AbortError"))).toBe(true);
      expect(
        isAbortError(Object.assign(new Error("x"), { name: "CanceledError" })),
      ).toBe(true);
      expect(
        isAbortError(Object.assign(new Error("x"), { code: "ERR_CANCELED" })),
      ).toBe(true);

      expect(isAbortError(new TypeError("Failed to fetch"))).toBe(false);
      expect(
        isAbortError(Object.assign(new Error("x"), { code: "ERR_NETWORK" })),
      ).toBe(false);
      expect(isAbortError(new UploadNetworkError("x", { attempts: 3 }))).toBe(
        false,
      );
      expect(isAbortError(undefined)).toBe(false);
    });
  });

  test("requires a URL source", async () => {
    await expect(
      uploadFileToSignedUrl({ file: FILE, contentType: "video/mp4" }),
    ).rejects.toThrow(/uploadUrl or getUploadUrl/);
  });
});
