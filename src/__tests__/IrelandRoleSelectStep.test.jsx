import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const selectIrelandRole = vi.fn();
const markIrelandIeltsInterest = vi.fn();
const markIrelandOpportunityInterest = vi.fn();
const uploadIrelandDocument = vi.fn();

vi.mock("../api/irelandJobsApi", () => ({
  selectIrelandRole: (...args) => selectIrelandRole(...args),
  markIrelandIeltsInterest: (...args) => markIrelandIeltsInterest(...args),
  markIrelandOpportunityInterest: (...args) =>
    markIrelandOpportunityInterest(...args),
  uploadIrelandDocument: (...args) => uploadIrelandDocument(...args),
}));

vi.mock("react-hot-toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// framer-motion props aren't real DOM attrs — strip them (same pattern as the
// JobScreening suite) so motion.button renders as a plain button.
vi.mock("framer-motion", async () => {
  const ReactLib = await import("react");
  const MOTION_ONLY_PROPS = ["whileTap", "initial", "animate", "exit", "transition"];
  const makeMotionComponent = (tag) =>
    ReactLib.forwardRef((props, ref) => {
      const clean = { ...props };
      MOTION_ONLY_PROPS.forEach((k) => delete clean[k]);
      return ReactLib.createElement(tag, { ...clean, ref }, props.children);
    });
  return {
    motion: new Proxy({}, { get: (_t, tag) => makeMotionComponent(tag) }),
    AnimatePresence: ({ children }) => children,
  };
});

import RoleSelectStep from "../pages/irelandJobs/components/RoleSelectStep";

function progressWith({
  role = null,
  ielts = {},
  nmbi = {},
  ieltsInterestAt = null,
} = {}) {
  return {
    role,
    ielts: { answer: null, status: null, approved: false, pending: false, rejected: false, ...ielts },
    nmbi: {
      filename: null,
      status: null,
      approved: false,
      pending: false,
      rejected: false,
      rejectionReason: null,
      ...nmbi,
    },
    ieltsInterestAt,
    documents: {},
  };
}

function setup(progress, overrides = {}) {
  return render(
    <RoleSelectStep
      progress={progress}
      onComplete={vi.fn()}
      onBack={vi.fn()}
      onProgressUpdate={vi.fn()}
      {...overrides}
    />,
  );
}

const pickNurse = () => fireEvent.click(screen.getByText("Nurse"));
const interestedBtn = () =>
  screen.getByRole("button", { name: "I'm Interested" });
const commitInterested = async () => {
  fireEvent.click(interestedBtn());
  await waitFor(() => expect(markIrelandOpportunityInterest).toHaveBeenCalled());
};
const noInterested = () =>
  expect(screen.queryByRole("button", { name: "I'm Interested" })).toBeNull();

describe("RoleSelectStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectIrelandRole.mockResolvedValue({ data: { success: true } });
    markIrelandOpportunityInterest.mockResolvedValue({
      data: { success: true },
    });
  });

  test("renders both roles; Continue is disabled until one is picked", () => {
    setup(progressWith());
    expect(screen.getByText("Nurse")).toBeTruthy();
    expect(screen.getByText("Caregiver")).toBeTruthy();
    noInterested();
  });

  test("caregiver: pick previews only → 'I'm Interested' commits role + interest → onComplete exits", async () => {
    const onComplete = vi.fn();
    setup(progressWith(), { onComplete });

    // A card tap is a preview — nothing hits the server yet.
    fireEvent.click(screen.getByText("Caregiver"));
    expect(selectIrelandRole).not.toHaveBeenCalled();

    // "I'm Interested" IS the complete action — it commits and exits.
    await commitInterested();
    expect(selectIrelandRole).toHaveBeenCalledWith("caregiver");
    expect(markIrelandOpportunityInterest).toHaveBeenCalledWith("caregiver");
    expect(onComplete).toHaveBeenCalledOnce();
    // Caregiver never sees either nurse gate.
    expect(screen.queryByText(/IELTS certificate to continue/)).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Upload NMBI certificate/ }),
    ).toBeNull();
  });

  test("nurse without IELTS or NMBI: both gates show, Continue disabled", async () => {
    setup(progressWith());
    pickNurse();

    expect(
      screen.getByText(/Please upload your IELTS certificate to continue/),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Upload IELTS certificate/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Want to get an IELTS certificate/ }),
    ).toBeTruthy();
    expect(screen.getByText(/Irish hospitals require/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Upload NMBI certificate/ }),
    ).toBeTruthy();
    noInterested();
  });

  test("'want to get IELTS' marks interest but NMBI still gates Continue", async () => {
    const onProgressUpdate = vi.fn();
    markIrelandIeltsInterest.mockResolvedValue({ data: { success: true } });
    setup(progressWith(), { onProgressUpdate });

    pickNurse();
    fireEvent.click(
      screen.getByRole("button", { name: /Want to get an IELTS certificate/ }),
    );

    await waitFor(() =>
      expect(markIrelandIeltsInterest).toHaveBeenCalledOnce(),
    );
    await waitFor(() =>
      expect(screen.getByText(/Interest noted/)).toBeTruthy(),
    );
    expect(onProgressUpdate).toHaveBeenCalled();
    // IELTS settled via interest, but NMBI is still missing → still disabled.
    noInterested();
  });

  test("IELTS interest + approved NMBI unlocks Continue", async () => {
    const onComplete = vi.fn();
    setup(
      progressWith({
        nmbi: { approved: true, status: "approved" },
        ieltsInterestAt: new Date().toISOString(),
      }),
      { onComplete },
    );
    pickNurse();
    expect(screen.getByText(/NMBI certificate is approved/)).toBeTruthy();
    await commitInterested();
    expect(onComplete).toHaveBeenCalledOnce();
  });

  test("nurse + approved IELTS and approved NMBI skips both gates", async () => {
    const onComplete = vi.fn();
    setup(
      progressWith({
        ielts: { approved: true, status: "approved" },
        nmbi: { approved: true, status: "approved" },
      }),
      { onComplete },
    );
    pickNurse();
    expect(screen.getByText(/IELTS certificate is approved/)).toBeTruthy();
    expect(screen.getByText(/NMBI certificate is approved/)).toBeTruthy();
    // Gates settled → Interested appears; Continue unlocks only after commit.
    await commitInterested();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("button", { name: /Upload IELTS certificate/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Upload NMBI certificate/ }),
    ).toBeNull();
  });

  test("nurse + IELTS and NMBI under review shows waiting states and allows Continue", async () => {
    const onComplete = vi.fn();
    setup(
      progressWith({
        ielts: { pending: true, status: "pending" },
        nmbi: { pending: true, status: "pending", filename: "nmbi.pdf" },
      }),
      { onComplete },
    );
    pickNurse();
    expect(screen.getAllByText(/under review/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("nmbi.pdf")).toBeTruthy();
    await commitInterested();
    expect(onComplete).toHaveBeenCalledOnce();
  });

  test("nurse + rejected NMBI shows the reason and re-upload prompt", async () => {
    setup(
      progressWith({
        ielts: { approved: true, status: "approved" },
        nmbi: {
          rejected: true,
          status: "rejected",
          rejectionReason: "Expired certificate",
        },
      }),
    );
    pickNurse();
    expect(
      screen.getByText(/NMBI certificate was rejected. Expired certificate/),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Upload NMBI certificate/ }),
    ).toBeTruthy();
    noInterested();
  });

  test("NMBI file input uploads via uploadIrelandDocument('nmbi')", async () => {
    const onProgressUpdate = vi.fn();
    uploadIrelandDocument.mockResolvedValue({ data: { success: true } });
    const { container } = setup(
      progressWith({
        ielts: { approved: true, status: "approved" },
      }),
      { onProgressUpdate },
    );
    pickNurse();

    // IELTS is approved so only the NMBI card renders a file input.
    const nmbiInput = container.querySelector('input[type="file"]');
    expect(nmbiInput).toBeTruthy();
    fireEvent.change(nmbiInput, {
      target: { files: [new File(["x"], "nmbi.pdf", { type: "application/pdf" })] },
    });
    await waitFor(() =>
      expect(uploadIrelandDocument).toHaveBeenCalledWith("nmbi", expect.any(FormData)),
    );
    await waitFor(() => expect(onProgressUpdate).toHaveBeenCalled());
    expect(selectIrelandRole).not.toHaveBeenCalled();
  });

  test("IELTS upload is tagged source=role_select so the Documents step stays done", async () => {
    uploadIrelandDocument.mockResolvedValue({ data: { success: true } });
    const { container } = setup(
      progressWith({ nmbi: { approved: true, status: "approved" } }),
    );
    pickNurse();
    // NMBI is approved so only the IELTS card renders a file input.
    const ieltsInput = container.querySelector('input[type="file"]');
    fireEvent.change(ieltsInput, {
      target: { files: [new File(["x"], "ielts.pdf", { type: "application/pdf" })] },
    });
    await waitFor(() =>
      expect(uploadIrelandDocument).toHaveBeenCalledWith(
        "ielts",
        expect.any(FormData),
        { source: "role_select" },
      ),
    );
  });

  test.each([
    ["under review", { pending: true, status: "pending" }],
    ["approved", { approved: true, status: "approved" }],
  ])("shows the uploaded IELTS certificate on Choose your path when %s", (_label, ielts) => {
    setup({
      ...progressWith({ ielts, nmbi: { approved: true, status: "approved" } }),
      documents: {
        ielts: {
          answer: "none",
          filename: "my-ielts.pdf",
          downloadUrl: "https://s3.example/ielts",
          status: ielts.status,
        },
      },
    });
    pickNurse();
    expect(screen.getByText("my-ielts.pdf")).toBeTruthy();
    expect(screen.getByRole("link", { name: /View/ }).getAttribute("href")).toBe(
      "https://s3.example/ielts",
    );
  });

  test("nurse + rejected IELTS shows the rejection copy in the gate", async () => {
    setup(
      progressWith({
        ielts: { rejected: true, status: "rejected" },
        nmbi: { approved: true, status: "approved" },
      }),
    );
    pickNurse();
    expect(screen.getByText(/IELTS certificate was rejected/)).toBeTruthy();
    noInterested();
  });

  test("no opportunity content → no 'View details' links", () => {
    setup(progressWith());
    expect(screen.queryByText(/View opportunity details/)).toBeNull();
  });

  test("opportunity sheet opens from the card link and selects via its CTA", async () => {
    setup(
      {
        ...progressWith(),
        opportunities: {
          caregiver: {
            header: { title: "Ireland Caregiver Opportunity" },
            sections: [
              { id: "snap", title: "Snapshot", kind: "table", rows: [{ label: "Role", value: "Caregiver" }] },
            ],
            cta: { primaryLabel: "I'm Interested", secondaryLabel: "Not Now" },
          },
        },
      },
    );
    fireEvent.click(screen.getByText(/View opportunity details/));
    expect(screen.getByText("Ireland Caregiver Opportunity")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "I'm Interested" }));
    await waitFor(() =>
      expect(selectIrelandRole).toHaveBeenCalledWith("caregiver"),
    );
    // The sheet CTA selects AND records interest — one click, no second stop.
    await waitFor(() =>
      expect(markIrelandOpportunityInterest).toHaveBeenCalledWith("caregiver"),
    );
    await waitFor(() =>
      expect(screen.queryByText("Ireland Caregiver Opportunity")).toBeNull(),
    );
  });

  const NURSE_SHEET = {
    header: { title: "Ireland Nurse Opportunity" },
    sections: [],
    cta: { primaryLabel: "I'm Interested", secondaryLabel: "Not Now" },
  };
  const withNurseSheet = (progress) => ({
    ...progress,
    opportunities: { nurse: NURSE_SHEET },
  });

  test("nurse sheet with unmet gates shows the uploads instead of a Locked button", () => {
    setup(withNurseSheet(progressWith()));
    fireEvent.click(screen.getByText(/View opportunity details/));
    expect(screen.getByText("Ireland Nurse Opportunity")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Locked/ })).toBeNull();
    expect(
      screen.getByRole("button", { name: /Upload IELTS certificate/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Want to get an IELTS certificate/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Upload NMBI certificate/ }),
    ).toBeTruthy();
    noInterested();
  });

  test("uploading NMBI from the sheet needs no saved role", async () => {
    uploadIrelandDocument.mockResolvedValue({ data: { success: true } });
    const { container } = setup(
      withNurseSheet(progressWith({ ielts: { approved: true, status: "approved" } })),
    );
    fireEvent.click(screen.getByText(/View opportunity details/));
    // No card picked → the only file input on screen is the sheet's NMBI one.
    const inputs = container.ownerDocument.querySelectorAll('input[type="file"]');
    expect(inputs).toHaveLength(1);
    fireEvent.change(inputs[0], {
      target: { files: [new File(["x"], "nmbi.pdf", { type: "application/pdf" })] },
    });
    await waitFor(() =>
      expect(uploadIrelandDocument).toHaveBeenCalledWith("nmbi", expect.any(FormData)),
    );
    expect(selectIrelandRole).not.toHaveBeenCalled();
  });

  test("once the nurse gates settle, the sheet shows I'm Interested again", () => {
    setup(
      withNurseSheet(
        progressWith({
          nmbi: { pending: true, status: "pending", filename: "nmbi.pdf" },
          ieltsInterestAt: new Date().toISOString(),
        }),
      ),
    );
    fireEvent.click(screen.getByText(/View opportunity details/));
    expect(screen.queryByRole("button", { name: /Upload NMBI certificate/ })).toBeNull();
    expect(screen.getByRole("button", { name: "I'm Interested" })).toBeTruthy();
  });

  test("picking a role shows the inline Interested CTA; click commits + swaps to done state", async () => {
    setup(progressWith());
    fireEvent.click(screen.getByText("Caregiver"));
    // Preview only — no server call on the card tap.
    expect(selectIrelandRole).not.toHaveBeenCalled();

    fireEvent.click(
      await screen.findByRole("button", { name: "I'm Interested" }),
    );
    await waitFor(() =>
      expect(selectIrelandRole).toHaveBeenCalledWith("caregiver"),
    );
    await waitFor(() =>
      expect(markIrelandOpportunityInterest).toHaveBeenCalledWith("caregiver"),
    );
    expect(
      screen.getByText(/Interested ✓ Our team will reach out/),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "I'm Interested" })).toBeNull();
  });

  test("nurse with unmet gates does NOT see the Interested CTA", async () => {
    setup(progressWith());
    pickNurse();
    expect(screen.queryByRole("button", { name: "I'm Interested" })).toBeNull();
    noInterested();
  });

  test("nurse sees Interested only once IELTS is settled and NMBI is in flight", async () => {
    setup(
      progressWith({
        nmbi: { pending: true, status: "pending", filename: "nmbi.pdf" },
        ieltsInterestAt: new Date().toISOString(),
      }),
    );
    pickNurse();
    expect(
      await screen.findByRole("button", { name: "I'm Interested" }),
    ).toBeTruthy();
  });

  test("switching roles re-arms the Interested button (interest cleared server-side)", async () => {
    const onComplete = vi.fn();
    setup(
      progressWith({
        nmbi: { approved: true, status: "approved" },
        ieltsInterestAt: new Date().toISOString(),
      }),
      { onComplete },
    );
    fireEvent.click(screen.getByText("Caregiver"));
    await commitInterested();
    await waitFor(() =>
      expect(screen.getByText(/Interested ✓/)).toBeTruthy(),
    );

    // Picking the Nurse card is a preview — the button re-arms because the
    // committed role no longer matches the previewed one (gates are met here).
    fireEvent.click(screen.getByText("Nurse"));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "I'm Interested" }),
      ).toBeTruthy(),
    );
    await commitInterested();
    expect(selectIrelandRole).toHaveBeenCalledWith("nurse");
  });

  test("a failed role save surfaces the API error", async () => {
    selectIrelandRole.mockRejectedValue({
      response: { data: { message: "Pipeline is inactive for this account" } },
    });
    setup(progressWith());
    fireEvent.click(screen.getByText("Caregiver"));
    fireEvent.click(
      await screen.findByRole("button", { name: "I'm Interested" }),
    );
    await waitFor(() =>
      expect(
        screen.getByText("Pipeline is inactive for this account"),
      ).toBeTruthy(),
    );
  });

  test("a completed step (reopened after approval) offers Continue back to the journey", () => {
    const onComplete = vi.fn();
    const progress = {
      ...progressWith({
        role: "nurse",
        ielts: { approved: true, status: "approved" },
        nmbi: { approved: true, status: "approved" },
      }),
      opportunityInterestAt: new Date().toISOString(),
      steps: [{ id: "role_select", status: "completed" }],
    };
    setup(progress, { onComplete });
    expect(screen.getByText(/Interested ✓/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onComplete).toHaveBeenCalledWith(progress);
  });

  test("no Continue while the step is still in review", () => {
    setup({
      ...progressWith({
        role: "nurse",
        ielts: { pending: true, status: "pending" },
        nmbi: { pending: true, status: "pending", filename: "n.pdf" },
      }),
      opportunityInterestAt: new Date().toISOString(),
      steps: [{ id: "role_select", status: "review" }],
    });
    expect(screen.getByText(/Interested ✓/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
  });
});
