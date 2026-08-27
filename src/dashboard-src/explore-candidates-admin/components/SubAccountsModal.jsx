import { useMemo, useState } from "react";
import { X, UserPlus, Link2, Unlink } from "lucide-react";
import toast from "react-hot-toast";
import { exploreCandidatesAdminApi } from "../../../api/exploreCandidatesAdminApi";
import { Spinner } from "./common";
import { PrimaryButton, ActionButton, ControlDropdown } from "./controls";
import { ConfirmationModal } from "./ConfirmationModal";

export function SubAccountsModal({ parent, accounts, onClose, onChanged }) {
  const [newEmail, setNewEmail] = useState("");
  const [attachId, setAttachId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    description: "",
    variant: "danger",
    confirmText: "Confirm",
    onConfirm: null,
    loading: false,
  });

  if (!parent) return null;

  const subs = accounts.filter((a) => a.parent_account_id === parent.id);
  const attachCandidates = accounts.filter(
    (a) => a.id !== parent.id && a.parent_account_id !== parent.id,
  );

  const attachOptions = useMemo(() => {
    return [
      { value: "", label: "Select an account to attach..." },
      ...attachCandidates.map((a) => ({
        value: String(a.id),
        label: `${a.email}${a.parent_account_id ? ` (sub of ${a.parent_email})` : ""}`,
      })),
    ];
  }, [attachCandidates]);

  async function run(action, successMessage) {
    setError("");
    setBusy(true);
    try {
      await action();
      await onChanged();
      if (successMessage) toast.success(successMessage);
    } catch (err) {
      const msg = err?.response?.data?.message || "Something went wrong";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-black text-slate-900">Manage Sub Accounts</h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Main account: <span className="font-bold text-[#083262]">{parent.email}</span>
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          {/* Current Sub Accounts */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Current Sub Accounts ({subs.length})
            </h4>
            {!subs.length ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                No sub accounts attached to this main account yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-slate-50/30">
                {subs.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 bg-white hover:bg-slate-50/80 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-sm font-bold text-slate-800">
                        {sub.email}
                      </span>
                    </div>
                    <ActionButton
                      variant="danger"
                      disabled={busy}
                      icon={Unlink}
                      onClick={() => {
                        setConfirmModal({
                          open: true,
                          title: "Detach Sub Account",
                          description: `Detach "${sub.email}" from "${parent.email}"?\n\nIt becomes a standalone account with an empty workspace. Its pre-sub shortlists and scheduled calls become visible again.`,
                          variant: "danger",
                          confirmText: "Detach",
                          onConfirm: async () => {
                            setConfirmModal((v) => ({ ...v, loading: true }));
                            await run(
                              () =>
                                exploreCandidatesAdminApi.detachSubAccount(
                                  parent.id,
                                  sub.id,
                                ),
                              "Sub account detached",
                            );
                            setConfirmModal({ open: false, title: "", description: "", onConfirm: null, loading: false });
                          },
                        });
                      }}
                    >
                      Detach
                    </ActionButton>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Sub Account */}
          <div className="space-y-2.5 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[#083262]" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Create New Sub Account
              </h4>
            </div>
            <p className="text-xs text-slate-500">
              Creates a fresh login under this main account. Sign-in is by corporate email OTP only.
            </p>
            <div className="flex gap-2 pt-1">
              <input
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-[#083262] focus:outline-none focus:ring-1 focus:ring-[#083262] transition"
                placeholder="colleague@company.com"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const email = newEmail.trim().toLowerCase();
                    if (!email) return;
                    run(async () => {
                      await exploreCandidatesAdminApi.createSubAccount(
                        parent.id,
                        email,
                      );
                      setNewEmail("");
                    }, "Sub account created");
                  }
                }}
              />
              <PrimaryButton
                disabled={busy || !newEmail.trim()}
                onClick={() => {
                  const email = newEmail.trim().toLowerCase();
                  if (!email) return;
                  run(async () => {
                    await exploreCandidatesAdminApi.createSubAccount(
                      parent.id,
                      email,
                    );
                    setNewEmail("");
                  }, "Sub account created");
                }}
              >
                {busy && <Spinner size="sm" color="text-white" />}
                Add Sub Account
              </PrimaryButton>
            </div>
          </div>

          {/* Attach Existing Account */}
          <div className="space-y-2.5 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-[#083262]" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Attach Existing Account
              </h4>
            </div>
            <p className="text-xs text-slate-500">
              Reconfigure an existing account into a sub-account. It will inherit this workspace.
            </p>
            <div className="flex gap-2 pt-1 items-center">
              <div className="flex-1">
                <ControlDropdown
                  value={attachId}
                  onChange={setAttachId}
                  options={attachOptions}
                  placeholder="Select an account to attach..."
                  searchable={true}
                  searchPlaceholder="Search account by email..."
                />
              </div>
              <PrimaryButton
                disabled={busy || !attachId}
                onClick={() => {
                  const candidate = accounts.find(
                    (a) => String(a.id) === String(attachId),
                  );
                  if (!candidate) return;
                  const profileCount = candidate.total_profiles || 0;
                  setConfirmModal({
                    open: true,
                    title: "Attach Existing Account",
                    description:
                      `Reconfigure "${candidate.email}" as a sub account of "${parent.email}"?\n\n` +
                      `- Its ${profileCount} assigned shared profile${profileCount === 1 ? "" : "s"} will be removed\n` +
                      `- It will see exactly what ${parent.email} sees: same candidates, same statuses, same history\n` +
                      `- Its own past shortlists and scheduled calls are hidden while attached and restored if detached later\n\n` +
                      `Continue?`,
                    variant: "primary",
                    confirmText: "Attach Account",
                    onConfirm: async () => {
                      setConfirmModal((v) => ({ ...v, loading: true }));
                      await run(
                        () =>
                          exploreCandidatesAdminApi.attachSubAccount(
                            parent.id,
                            candidate.id,
                          ),
                        "Account attached as sub account",
                      );
                      setAttachId("");
                      setConfirmModal({ open: false, title: "", description: "", onConfirm: null, loading: false });
                    },
                  });
                }}
              >
                {busy && <Spinner size="sm" color="text-white" />}
                Attach
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmModal.open}
        title={confirmModal.title}
        description={confirmModal.description}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
        loading={confirmModal.loading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((v) => ({ ...v, open: false, loading: false }))}
      />
    </div>
  );
}
