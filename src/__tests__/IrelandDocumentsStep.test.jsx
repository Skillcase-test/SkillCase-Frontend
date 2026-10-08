import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const setIrelandDocAnswers = vi.fn();
const uploadIrelandDocument = vi.fn();
const deleteIrelandDocument = vi.fn();

vi.mock("../api/irelandJobsApi", () => ({
  setIrelandDocAnswers: (...args) => setIrelandDocAnswers(...args),
  uploadIrelandDocument: (...args) => uploadIrelandDocument(...args),
  deleteIrelandDocument: (...args) => deleteIrelandDocument(...args),
}));

vi.mock("react-hot-toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import IrelandDocumentsStep from "../pages/irelandJobs/components/IrelandDocumentsStep";

const DOCS = [
  { id: "ielts", label: "IELTS Certificate", fixed: true },
  { id: "doc_voscreen", label: "VOSCREEN Certificate" },
];

function progressWith(documents = {}, requiredDocuments = DOCS) {
  return {
    requiredDocuments,
    documents,
  };
}

function setup(progress, overrides = {}) {
  return render(
    <IrelandDocumentsStep
      progress={progress}
      onComplete={vi.fn()}
      onBack={vi.fn()}
      onProgressUpdate={vi.fn()}
      {...overrides}
    />,
  );
}

function answerRadio(docLabel, optionLabel) {
  const group = screen.getByRole("radiogroup", { name: docLabel });
  return Array.from(group.querySelectorAll('[role="radio"]')).find((r) =>
    r.textContent.includes(optionLabel),
  );
}

describe("IrelandDocumentsStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders every required doc with the three-state answer group; IELTS gets its nurse note", () => {
    setup(progressWith());
    expect(
      screen.getByRole("radiogroup", { name: "IELTS Certificate" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("radiogroup", { name: "VOSCREEN Certificate" }),
    ).toBeTruthy();
    expect(screen.getByText("Required for the Nurse opportunity")).toBeTruthy();
    expect(answerRadio("IELTS Certificate", "Yes, I have it")).toBeTruthy();
    expect(answerRadio("IELTS Certificate", "No, I don't")).toBeTruthy();
    expect(answerRadio("IELTS Certificate", "I'm preparing")).toBeTruthy();
  });

  test("submit stays disabled until every doc has an answer", () => {
    setup(progressWith());
    const submit = screen.getByRole("button", { name: /Confirm/ });
    expect(submit.disabled).toBe(true);

    fireEvent.click(answerRadio("IELTS Certificate", "No, I don't"));
    expect(submit.disabled).toBe(true);

    fireEvent.click(answerRadio("VOSCREEN Certificate", "I'm preparing"));
    expect(submit.disabled).toBe(false);
  });

  test("all none/preparing submits with zero uploads and exits to the lobby", async () => {
    const onComplete = vi.fn();
    setIrelandDocAnswers.mockResolvedValue({ data: { success: true } });
    setup(progressWith(), { onComplete });

    fireEvent.click(answerRadio("IELTS Certificate", "I'm preparing"));
    fireEvent.click(answerRadio("VOSCREEN Certificate", "No, I don't"));
    fireEvent.click(screen.getByRole("button", { name: /Confirm/ }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    expect(setIrelandDocAnswers).toHaveBeenCalledWith({
      ielts: "preparing",
      doc_voscreen: "none",
    });
  });

  test("'have' without an uploaded file keeps submit disabled and shows the upload zone", () => {
    setup(progressWith());
    fireEvent.click(answerRadio("IELTS Certificate", "Yes, I have it"));
    fireEvent.click(answerRadio("VOSCREEN Certificate", "No, I don't"));

    expect(
      screen.getByRole("button", { name: /Confirm/ }).disabled,
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: /Click to upload/ }),
    ).toBeTruthy();
  });

  test("'have' with an uploaded file submits fine; a rejected file surfaces the reason", () => {
    setup(
      progressWith({
        ielts: {
          answer: "have",
          filename: "ielts.pdf",
          status: "rejected",
          rejectionReason: "Blurry scan",
        },
        doc_voscreen: { answer: "none" },
      }),
    );
    expect(screen.getByText("ielts.pdf")).toBeTruthy();
    expect(screen.getByText("Rejected")).toBeTruthy();
    expect(screen.getByText(/Blurry scan/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Confirm/ }).disabled,
    ).toBe(false);
  });

  test("pending files show the status chip; review status renders the review screen", () => {
    const pending = progressWith(
      {
        ielts: { answer: "have", filename: "ielts.pdf", status: "pending" },
        doc_voscreen: { answer: "none" },
      },
    );
    setup(pending);
    expect(screen.getByText("Under review")).toBeTruthy();
    expect(screen.getByText("ielts.pdf")).toBeTruthy();

    setup({
      ...pending,
      steps: [{ id: "documents", status: "review" }],
    });
    expect(
      screen.getByRole("heading", { name: "Documents under review", level: 2 }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Refresh status/ }),
    ).toBeTruthy();
  });

  test("uploading a file calls the API, flips the answer to 'have', and pushes fresh progress", async () => {
    const onProgressUpdate = vi.fn();
    uploadIrelandDocument.mockResolvedValue({ data: { success: true } });
    setup(progressWith(), { onProgressUpdate });

    fireEvent.click(answerRadio("IELTS Certificate", "Yes, I have it"));
    const input = document.querySelector('input[type="file"]');
    const file = new File(["cert"], "ielts.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(uploadIrelandDocument).toHaveBeenCalled());
    expect(uploadIrelandDocument.mock.calls[0][0]).toBe("ielts");
    expect(uploadIrelandDocument.mock.calls[0][1] instanceof FormData).toBe(true);
    await waitFor(() => expect(onProgressUpdate).toHaveBeenCalled());
  });

  test("deleting an uploaded file calls the API and pushes fresh progress", async () => {
    const onProgressUpdate = vi.fn();
    deleteIrelandDocument.mockResolvedValue({ data: { success: true } });
    setup(
      progressWith({
        ielts: { answer: "have", filename: "ielts.pdf", status: "pending" },
      }),
      { onProgressUpdate },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Remove IELTS Certificate" }),
    );
    await waitFor(() =>
      expect(deleteIrelandDocument).toHaveBeenCalledWith("ielts"),
    );
    await waitFor(() => expect(onProgressUpdate).toHaveBeenCalled());
  });

  test("a failed save shows the error and does not exit the step", async () => {
    const onComplete = vi.fn();
    setIrelandDocAnswers.mockRejectedValue({
      response: { data: { message: "answers object is required" } },
    });
    setup(progressWith(), { onComplete });

    fireEvent.click(answerRadio("IELTS Certificate", "No, I don't"));
    fireEvent.click(answerRadio("VOSCREEN Certificate", "No, I don't"));
    fireEvent.click(screen.getByRole("button", { name: /Confirm/ }));

    await waitFor(() =>
      expect(screen.getByText("answers object is required")).toBeTruthy(),
    );
    expect(onComplete).not.toHaveBeenCalled();
  });
});
