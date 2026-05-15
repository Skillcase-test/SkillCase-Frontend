import { ControlButton } from "./controls";

/** @param {{rejectModal:any,setRejectModal:Function,handleDiscountDecision:Function}} props */
export function RejectDiscountModal({
  rejectModal,
  setRejectModal,
  handleDiscountDecision,
}) {
  if (!rejectModal.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h3 className="text-sm font-bold text-slate-800">
          Reject Discount Request
        </h3>
        <textarea
          value={rejectModal.reason}
          onChange={(e) =>
            setRejectModal((p) => ({ ...p, reason: e.target.value }))
          }
          placeholder="Optional rejection reason"
          className="mt-2 h-24 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <div className="mt-3 flex gap-2">
          <ControlButton
            onClick={() =>
              handleDiscountDecision(rejectModal.discountId, "rejected")
            }
            variant="danger"
            className="h-9 px-3 text-xs"
          >
            Confirm Reject
          </ControlButton>
          <ControlButton
            onClick={() =>
              setRejectModal({ open: false, discountId: "", reason: "" })
            }
            variant="secondary"
            className="h-9 px-3 text-xs"
          >
            Cancel
          </ControlButton>
        </div>
      </div>
    </div>
  );
}
