import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { exploreCandidatesAdminApi } from "../../api/exploreCandidatesAdminApi";
import {
  JobsAdminPage,
  JobAssignPage,
} from "./ExploreCandidatesJobsAdmin";

const initialProfileForm = {
  fullname: "",
  email: "",
  countrycode: "+91",
  phone: "",
  dob: "",
  gender: "",
  expected_level: "",
  qualification: "",
  experience: "",
  language: "",
  photo: null,
  resume: null,
  degcert: null,
  workcert: null,
  langcert: null,
};

function Spinner({ size = "md" }) {
  const sz = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  return (
    <svg
      className={`animate-spin ${sz} text-slate-400`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`${
        checked ? "bg-green-500" : "bg-slate-300"
      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        aria-hidden="true"
        className={`${
          checked ? "translate-x-5" : "translate-x-0"
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  );
}

export function PageCard({ title, description, children, actions }) {
  return (
    <div className="space-y-6 ">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm text-slate-500 font-medium">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function TableWrapper({ children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ">
      <div className="overflow-x-auto">
        <table className="min-w-full">{children}</table>
      </div>
    </div>
  );
}

export function TableHead({ children }) {
  return (
    <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200">
      {children}
    </thead>
  );
}

export function TableBody({ children }) {
  return (
    <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium">
      {children}
    </tbody>
  );
}

function PrimaryButton({ children, ...props }) {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#083262] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#052243] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      {...props}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, ...props }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      {...props}
    >
      {children}
    </button>
  );
}

export function ActionButton({ children, variant = "default", ...props }) {
  const base =
    "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";
  const variants = {
    default: "text-slate-700 hover:bg-slate-50",
    danger: "border-rose-200 text-rose-700 hover:bg-rose-50",
    primary: "text-[#083262] hover:bg-blue-50 border-[#083262]",
  };
  return (
    <button type="button" className={`${base} ${variants[variant]}`} {...props}>
      {children}
    </button>
  );
}

// Manage the sub accounts of one main account: create brand-new logins (email only),
// reconfigure existing accounts into subs (with the data-loss warning), or detach.
function SubAccountsModal({ parent, accounts, onClose, onChanged }) {
  const [newEmail, setNewEmail] = useState("");
  const [attachId, setAttachId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!parent) return null;

  const subs = accounts.filter((a) => a.parent_account_id === parent.id);
  const attachCandidates = accounts.filter(
    (a) => a.id !== parent.id && a.parent_account_id !== parent.id,
  );

  async function run(action) {
    setError("");
    setBusy(true);
    try {
      await action();
      await onChanged();
    } catch (err) {
      window.alert(err?.response?.data?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Sub Accounts</h3>
            <p className="text-xs font-medium text-slate-500">
              Main account: {parent.email}
            </p>
          </div>
          <button
            type="button"
            className="text-xl leading-none text-slate-500 hover:text-slate-900"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {error ? (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-800">
              Current Sub Accounts ({subs.length})
            </h4>
            {!subs.length ? (
              <p className="text-xs font-medium text-slate-500">
                No sub accounts yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {subs.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <span className="text-sm font-bold text-slate-800">
                      {sub.email}
                    </span>
                    <ActionButton
                      variant="danger"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Detach "${sub.email}" from "${parent.email}"?\n\nIt becomes a standalone account with an empty workspace. Its pre-sub shortlists and scheduled calls become visible again.`,
                          )
                        ) {
                          run(() =>
                            exploreCandidatesAdminApi.detachSubAccount(
                              parent.id,
                              sub.id,
                            ),
                          );
                        }
                      }}
                    >
                      Detach
                    </ActionButton>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-800">Add New Sub Account</h4>
            <p className="text-xs font-medium text-slate-500">
              Creates a fresh login under this main account. Sign-in is by email code
              only -- no password.
            </p>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                placeholder="new.user@company.com"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
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
                  });
                }}
              >
                {busy && <Spinner size="sm" />}
                Add
              </PrimaryButton>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-800">
              Attach Existing Account
            </h4>
            <p className="text-xs font-medium text-slate-500">
              Reconfigure an existing account into a sub of this one. Its own shared
              profiles are removed; it sees this workspace instead.
            </p>
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                value={attachId}
                onChange={(e) => setAttachId(e.target.value)}
              >
                <option value="">Select an account...</option>
                {attachCandidates.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.email}
                    {a.parent_account_id
                      ? ` (currently sub of ${a.parent_email})`
                      : ""}
                  </option>
                ))}
              </select>
              <PrimaryButton
                disabled={busy || !attachId}
                onClick={() => {
                  const candidate = accounts.find(
                    (a) => String(a.id) === String(attachId),
                  );
                  if (!candidate) return;
                  const profileCount = candidate.total_profiles || 0;
                  if (
                    !window.confirm(
                      `Reconfigure "${candidate.email}" as a sub account of "${parent.email}"?\n\n` +
                        `- Its ${profileCount} assigned shared profile${profileCount === 1 ? "" : "s"} will be removed\n` +
                        `- It will see exactly what ${parent.email} sees: same candidates, same statuses, same history\n` +
                        `- Its own past shortlists and scheduled calls are hidden while attached and restored if detached later\n\n` +
                        `Continue?`,
                    )
                  ) {
                    return;
                  }
                  run(() =>
                    exploreCandidatesAdminApi.attachSubAccount(
                      parent.id,
                      candidate.id,
                    ),
                  );
                }}
              >
                {busy && <Spinner size="sm" />}
                Attach
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatRecruitmentStageLabel(stage) {
  const map = {
    in_process: "In Process",
    viewed: "Viewed",
    rejected: "Rejected",
    shortlisted: "Shortlisted",
    scheduled_interview: "Scheduled Interview",
  };
  return map[stage] || "In Process";
}

function RecruitmentStatusModal({ open, loading, data, error, onClose }) {
  if (!open) return null;

  const counts = data?.summary_counts || {
    shown_to_recruiters: 0,
    viewed: 0,
    shortlisted: 0,
    rejected: 0,
    scheduled_interview: 0,
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">
            Recruitment Status
          </h3>
          <button
            type="button"
            className="text-slate-500 hover:text-slate-900 text-xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="p-6 space-y-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading status...</p>
          ) : null}
          {!loading && error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : null}
          {!loading && !error && data ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                    Linked Learner
                  </p>
                  <p className="text-sm text-slate-900 mt-1 font-semibold">
                    {data.linked_user
                      ? `${data.linked_user.fullname || "-"} (${data.linked_user.user_id})`
                      : "Not linked"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                    Current Stage
                  </p>
                  <p className="text-sm text-slate-900 mt-1 font-semibold">
                    {formatRecruitmentStageLabel(data.derived_stage)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 sm:col-span-2">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                    Learner Visibility
                  </p>
                  <p className="text-sm text-slate-900 mt-1 font-semibold">
                    {data?.linked_user
                      ? data?.visibility?.is_enabled
                        ? "Enabled"
                        : "Disabled"
                      : "Not available (learner not linked)"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div className="rounded-lg border border-slate-200 p-2 text-center">
                  <p className="text-xs text-slate-500">Shown</p>
                  <p className="font-bold">{counts.shown_to_recruiters || 0}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-2 text-center">
                  <p className="text-xs text-slate-500">Viewed</p>
                  <p className="font-bold">{counts.viewed || 0}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-2 text-center">
                  <p className="text-xs text-slate-500">Shortlisted</p>
                  <p className="font-bold">{counts.shortlisted || 0}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-2 text-center">
                  <p className="text-xs text-slate-500">Rejected</p>
                  <p className="font-bold">{counts.rejected || 0}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-2 text-center">
                  <p className="text-xs text-slate-500">Scheduled</p>
                  <p className="font-bold">{counts.scheduled_interview || 0}</p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Recruiter</th>
                      <th className="px-3 py-2 text-left">Stage</th>
                      <th className="px-3 py-2 text-left">Views</th>
                      <th className="px-3 py-2 text-left">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data.recruiter_breakdown || []).length ? (
                      data.recruiter_breakdown.map((row) => (
                        <tr key={`${row.account_id}-${row.recruiter_email}`}>
                          <td className="px-3 py-2">
                            {row.recruiter_email || "-"}
                          </td>
                          <td className="px-3 py-2">
                            {formatRecruitmentStageLabel(row.stage)}
                          </td>
                          <td className="px-3 py-2">{row.view_count || 0}</td>
                          <td className="px-3 py-2">
                            {row.latest_scheduled_at ||
                            row.status_updated_at ||
                            row.last_viewed_at ||
                            row.assigned_at
                              ? new Date(
                                  row.latest_scheduled_at ||
                                    row.status_updated_at ||
                                    row.last_viewed_at ||
                                    row.assigned_at,
                                ).toLocaleString("en-IN")
                              : "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-3 py-3 text-slate-500" colSpan={4}>
                          No recruiter activity yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AccountsPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");
  const [loginEvents, setLoginEvents] = useState([]);
  const [savingAccount, setSavingAccount] = useState(false);
  const [toggling, setToggling] = useState({});
  const [subModalAccount, setSubModalAccount] = useState(null);
  const [form, setForm] = useState({
    email: "",
    partner_logo_file: null,
    status: 1,
  });

  async function load() {
    setLoading(true);
    setEventsLoading(true);
    setEventsError("");
    try {
      const accountsRes = await exploreCandidatesAdminApi.listAccounts();
      setAccounts(accountsRes?.data?.data || []);
    } catch (_error) {
      setAccounts([]);
    } finally {
      setLoading(false);
    }

    try {
      const eventsRes =
        await exploreCandidatesAdminApi.listRecruiterLoginEvents({
          page: 1,
          limit: 20,
        });
      setLoginEvents(eventsRes?.data?.data || []);
    } catch (error) {
      setLoginEvents([]);
      setEventsError(
        error?.response?.data?.message ||
          "Could not load recruiter login events",
      );
    } finally {
      setEventsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-8 ">
      <PageCard
        title="Recruiter Accounts"
        description="Manage partner recruiter accounts and their shared profile assignments."
        actions={
          <>
            <Link to="/admin/explore-candidates/jobs">
              <SecondaryButton>Jobs</SecondaryButton>
            </Link>
            <Link to="/admin/explore-candidates/access-requests">
              <SecondaryButton>Access Requests</SecondaryButton>
            </Link>
            <Link to="/admin/explore-candidates/library">
              <SecondaryButton>Library</SecondaryButton>
            </Link>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-3 items-end">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Email
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
              placeholder="Enter email"
              value={form.email}
              onChange={(e) =>
                setForm((v) => ({ ...v, email: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Partner Logo
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 transition"
              type="file"
              accept="image/*"
              onChange={(e) =>
                setForm((v) => ({
                  ...v,
                  partner_logo_file: e.target.files?.[0] || null,
                }))
              }
            />
          </div>
          <PrimaryButton
            disabled={savingAccount || !form.email}
            onClick={async () => {
              setSavingAccount(true);
              try {
                await exploreCandidatesAdminApi.upsertAccount(form);
                setForm({
                  email: "",
                  partner_logo_file: null,
                  status: 1,
                });
                await load();
              } catch (error) {
                window.alert(
                  error?.response?.data?.message ||
                    "Could not save account",
                );
              } finally {
                setSavingAccount(false);
              }
            }}
          >
            {savingAccount && <Spinner size="sm" />}
            Save Account
          </PrimaryButton>
        </div>
      </PageCard>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 px-1">All Accounts</h2>
        {loading ? (
          <div className="text-sm text-slate-500 px-1">Loading accounts...</div>
        ) : (
          <TableWrapper>
            <TableHead>
              <tr>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Profiles</th>
                <th className="px-6 py-4 text-center">Mask Contacts</th>
                <th className="px-6 py-4 text-center">Job Posting</th>
                <th className="px-6 py-4 text-center">Force Terms</th>
                <th className="px-6 py-4 text-center">Shared Account</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </TableHead>
            <TableBody>
              {accounts.map((account) => {
                const isSub = Boolean(account.parent_account_id);
                return (
                <tr
                  key={account.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-5 align-top">
                    <div className="font-bold text-slate-900">
                      {account.email}
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    {isSub ? (
                      <span
                        className="inline-flex rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#083262] border border-blue-100"
                        title={`Shares the workspace of ${account.parent_email || ""}`}
                      >
                        Sub of {account.parent_email || "?"}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                        Main
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5 align-top">
                    <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                      {account.total_profiles || 0} Shared Profiles
                    </span>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="flex justify-center items-center gap-2">
                      <ToggleSwitch
                        checked={Boolean(account.mask_contacts_enabled)}
                        disabled={isSub || toggling[`mask-${account.id}`]}
                        onChange={async (val) => {
                          setToggling((prev) => ({
                            ...prev,
                            [`mask-${account.id}`]: true,
                          }));
                          await exploreCandidatesAdminApi.updateAccountSettings(
                            account.id,
                            {
                              mask_contacts_enabled: val,
                            },
                          );
                          await load();
                          setToggling((prev) => ({
                            ...prev,
                            [`mask-${account.id}`]: false,
                          }));
                        }}
                      />
                      {toggling[`mask-${account.id}`] && <Spinner size="sm" />}
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="flex justify-center items-center gap-2">
                      <ToggleSwitch
                        checked={Boolean(account.job_posting_enabled)}
                        disabled={isSub || toggling[`job-${account.id}`]}
                        onChange={async (val) => {
                          setToggling((prev) => ({
                            ...prev,
                            [`job-${account.id}`]: true,
                          }));
                          try {
                            await exploreCandidatesAdminApi.updateAccountSettings(
                              account.id,
                              {
                                job_posting_enabled: val,
                              },
                            );
                            await load();
                          } catch (error) {
                            window.alert(
                              error?.response?.data?.message ||
                                "Could not update job posting setting",
                            );
                          } finally {
                            setToggling((prev) => ({
                              ...prev,
                              [`job-${account.id}`]: false,
                            }));
                          }
                        }}
                      />
                      {toggling[`job-${account.id}`] && <Spinner size="sm" />}
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="flex justify-center items-center gap-2">
                      <ToggleSwitch
                        checked={Boolean(account.force_terms_acceptance)}
                        disabled={isSub || toggling[`terms-${account.id}`]}
                        onChange={async (val) => {
                          setToggling((prev) => ({
                            ...prev,
                            [`terms-${account.id}`]: true,
                          }));
                          await exploreCandidatesAdminApi.updateAccountSettings(
                            account.id,
                            {
                              force_terms_acceptance: val,
                            },
                          );
                          await load();
                          setToggling((prev) => ({
                            ...prev,
                            [`terms-${account.id}`]: false,
                          }));
                        }}
                      />
                      {toggling[`terms-${account.id}`] && <Spinner size="sm" />}
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="flex justify-center items-center gap-2">
                      <ToggleSwitch
                        checked={Boolean(account.prompt_individual_email)}
                        disabled={isSub || toggling[`shared-${account.id}`]}
                        onChange={async (val) => {
                          setToggling((prev) => ({
                            ...prev,
                            [`shared-${account.id}`]: true,
                          }));
                          await exploreCandidatesAdminApi.updateAccountSettings(
                            account.id,
                            {
                              prompt_individual_email: val,
                            },
                          );
                          await load();
                          setToggling((prev) => ({
                            ...prev,
                            [`shared-${account.id}`]: false,
                          }));
                        }}
                      />
                      {toggling[`shared-${account.id}`] && (
                        <Spinner size="sm" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="flex flex-wrap justify-end gap-2">
                      {!isSub ? (
                        <ActionButton
                          onClick={() => setSubModalAccount(account)}
                        >
                          Sub Accounts
                          {account.total_sub_accounts > 0
                            ? ` (${account.total_sub_accounts})`
                            : ""}
                        </ActionButton>
                      ) : null}
                      <ActionButton
                        disabled={isSub}
                        title={
                          isSub ? "Managed by the main account" : undefined
                        }
                        onClick={() =>
                          navigate(
                            `/admin/explore-candidates/accounts/${account.id}/profiles`,
                          )
                        }
                      >
                        Manage Profiles
                      </ActionButton>
                      <ActionButton
                        disabled={isSub}
                        title={isSub ? "Managed by the main account" : undefined}
                        onClick={async () => {
                          const nextEmail = window.prompt(
                            "Enter updated recruiter email",
                            account.email || "",
                          );
                          if (
                            !nextEmail ||
                            nextEmail.trim().toLowerCase() ===
                              String(account.email || "")
                                .trim()
                                .toLowerCase()
                          )
                            return;
                          try {
                            await exploreCandidatesAdminApi.updateAccountIdentity(
                              account.id,
                              {
                                email: nextEmail.trim(),
                              },
                            );
                            await load();
                          } catch (error) {
                            window.alert(
                              error?.response?.data?.message ||
                                "Could not update recruiter email",
                            );
                          }
                        }}
                      >
                        Edit Email
                      </ActionButton>
                      <ActionButton
                        disabled={isSub}
                        title={isSub ? "Managed by the main account" : undefined}
                        onClick={async () => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/*";
                          input.onchange = async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              await exploreCandidatesAdminApi.updateAccountIdentity(
                                account.id,
                                {
                                  partner_logo_file: file,
                                },
                              );
                              await load();
                            } catch (error) {
                              window.alert(
                                error?.response?.data?.message ||
                                  "Could not update partner logo",
                              );
                            }
                          };
                          input.click();
                        }}
                      >
                        Update Logo
                      </ActionButton>
                      <ActionButton
                        variant="danger"
                        onClick={async () => {
                          if (
                            window.confirm(
                              `Delete recruiter account "${account.email}"?\n\nThis will permanently remove the account and all profile assignments.`,
                            )
                          ) {
                            try {
                              await exploreCandidatesAdminApi.deleteAccount(
                                account.id,
                              );
                              await load();
                            } catch (error) {
                              window.alert(
                                error?.response?.data?.message ||
                                  "Could not delete account",
                              );
                            }
                          }
                        }}
                      >
                        Delete
                      </ActionButton>
                    </div>
                  </td>
                </tr>
                );
              })}
            </TableBody>
          </TableWrapper>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 px-1">
          Recruiter Login Events
        </h2>
        {eventsLoading ? (
          <div className="text-sm text-slate-500 px-1">
            Loading recruiter login events...
          </div>
        ) : eventsError ? (
          <div className="text-sm text-rose-600 px-1">{eventsError}</div>
        ) : (
          <TableWrapper>
            <TableHead>
              <tr>
                <th className="px-6 py-4">Recruiter Email</th>
                <th className="px-6 py-4">Recruiter ID</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Country</th>
                <th className="px-6 py-4">Login Time (IST)</th>
              </tr>
            </TableHead>
            <TableBody>
              {!loginEvents.length ? (
                <tr>
                  <td className="px-6 py-5 text-slate-500" colSpan={5}>
                    No recruiter login events found.
                  </td>
                </tr>
              ) : (
                loginEvents.map((event) => (
                  <tr
                    key={event.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-5">
                      {event.recruiter_email || "-"}
                    </td>
                    <td className="px-6 py-5">{event.account_id || "-"}</td>
                    <td className="px-6 py-5">{event.source || "-"}</td>
                    <td className="px-6 py-5">
                      {event.country_name || event.country_code || "Unknown"}
                    </td>
                    <td className="px-6 py-5">
                      {event.created_at
                        ? new Date(event.created_at).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </TableBody>
          </TableWrapper>
        )}
      </div>

      {subModalAccount ? (
        <SubAccountsModal
          parent={subModalAccount}
          accounts={accounts}
          onClose={() => setSubModalAccount(null)}
          onChanged={load}
        />
      ) : null}
    </div>
  );
}

function AccountProfilesPage() {
  const { accountId } = useParams();
  const [state, setState] = useState({ assigned: [], available: [] });
  const [pickId, setPickId] = useState("");
  const [pickSource, setPickSource] = useState("local");
  const [pickSearchBy, setPickSearchBy] = useState("name");
  const [pickQuery, setPickQuery] = useState("");
  const [pickOptions, setPickOptions] = useState([]);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusData, setStatusData] = useState(null);
  const [statusToggling, setStatusToggling] = useState({});

  async function load() {
    const assignRes =
      await exploreCandidatesAdminApi.getAccountProfiles(accountId);
    const nextState = assignRes.data.data || { assigned: [], available: [] };
    const assigned = Array.isArray(nextState.assigned)
      ? nextState.assigned
      : [];
    const localRows = assigned.filter((row) =>
      String(row.id || "").startsWith("local:"),
    );
    const visibilityById = {};
    await Promise.all(
      localRows.map(async (row) => {
        try {
          const localId = Number(String(row.id).split(":")[1] || 0);
          if (!localId) return;
          const res =
            await exploreCandidatesAdminApi.getProfileRecruitmentStatus(
              localId,
            );
          visibilityById[row.id] = res?.data?.data?.visibility || {
            is_enabled: false,
          };
        } catch (_err) {
          visibilityById[row.id] = { is_enabled: false };
        }
      }),
    );
    setState({
      ...nextState,
      assigned: assigned.map((row) => ({
        ...row,
        visibility: visibilityById[row.id] ||
          row.visibility || { is_enabled: false },
      })),
    });
  }

  useEffect(() => {
    load();
  }, [accountId]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const res = await exploreCandidatesAdminApi.listLibraryProfilesV2({
        source: pickSource,
        search_by: pickSearchBy,
        q: pickQuery,
        page: 1,
        limit: 50,
      });
      setPickOptions(res?.data?.data || []);
    }, 250);
    return () => clearTimeout(timer);
  }, [pickSource, pickSearchBy, pickQuery]);

  async function openRecruitmentStatusForAssigned(profileRow) {
    const [rowSource, rowIdRaw] = String(profileRow.id || "").split(":");
    const localProfileId =
      rowSource === "local"
        ? Number(rowIdRaw || 0)
        : Number(profileRow.id || 0);

    if (
      !localProfileId ||
      ["explore_php", "main_php", "job_screening"].includes(rowSource)
    ) {
      window.alert(
        "Recruitment status is available only for local shared profiles.",
      );
      return;
    }

    setStatusModalOpen(true);
    setStatusLoading(true);
    setStatusError("");
    setStatusData(null);
    try {
      const res =
        await exploreCandidatesAdminApi.getProfileRecruitmentStatus(
          localProfileId,
        );
      setStatusData(res?.data?.data || null);
    } catch (error) {
      setStatusError(
        error?.response?.data?.message || "Could not fetch recruitment status",
      );
    } finally {
      setStatusLoading(false);
    }
  }

  async function toggleRecruitmentStatusForAssigned(profileRow, shouldEnable) {
    const [rowSource, rowIdRaw] = String(profileRow.id || "").split(":");
    const localProfileId =
      rowSource === "local"
        ? Number(rowIdRaw || 0)
        : Number(profileRow.id || 0);
    if (
      !localProfileId ||
      ["explore_php", "main_php", "job_screening"].includes(rowSource)
    ) {
      window.alert(
        "Recruitment status visibility is available only for local shared profiles.",
      );
      return;
    }
    const key = `assigned-${profileRow.id}`;
    try {
      setStatusToggling((prev) => ({ ...prev, [key]: true }));
      if (shouldEnable) {
        await exploreCandidatesAdminApi.enableProfileRecruitmentStatus(
          localProfileId,
        );
      } else {
        await exploreCandidatesAdminApi.disableProfileRecruitmentStatus(
          localProfileId,
        );
      }
      await load();
    } catch (error) {
      window.alert(
        error?.response?.data?.message || "Could not update visibility",
      );
    } finally {
      setStatusToggling((prev) => ({ ...prev, [key]: false }));
    }
  }

  return (
    <div className="space-y-8 ">
      <PageCard
        title={`Profiles for Account #${accountId}`}
        description="Manage assigned candidate profiles for this partner."
        actions={
          <div className="flex gap-2">
            <Link to="/admin/explore-candidates/library">
              <SecondaryButton>Open Library</SecondaryButton>
            </Link>
            <Link
              to={`/admin/explore-candidates/profiles/new?accountId=${accountId}`}
            >
              <PrimaryButton>Add Profile</PrimaryButton>
            </Link>
            <Link to="/admin/explore-candidates">
              <SecondaryButton>Back</SecondaryButton>
            </Link>
          </div>
        }
      >
        <div className="flex flex-col sm:flex-row gap-3 items-end flex-wrap">
          <div className="space-y-1 w-full sm:max-w-[190px]">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Source
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition bg-white"
              value={pickSource}
              onChange={(e) => {
                setPickSource(e.target.value);
                setPickId("");
              }}
            >
              <option value="local">Local Shared</option>
              <option value="explore_php">Main Site Shared (Explore)</option>
              <option value="main_php">Main Site Users (Read-only)</option>
              <option value="job_screening">Job Screening Candidates</option>
            </select>
          </div>
          <div className="space-y-1 w-full sm:max-w-[150px]">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Search by
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition bg-white"
              value={pickSearchBy}
              onChange={(e) => {
                setPickSearchBy(e.target.value);
                setPickId("");
              }}
            >
              <option value="name">Name</option>
              <option value="phone">Phone</option>
            </select>
          </div>
          <div className="space-y-1 flex-1 min-w-[220px]">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Search text
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
              value={pickQuery}
              onChange={(e) => {
                setPickQuery(e.target.value);
                setPickId("");
              }}
              placeholder={
                pickSearchBy === "phone" ? "Type phone..." : "Type name..."
              }
            />
          </div>
          <div className="space-y-1 flex-1 min-w-[260px]">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Assign existing profile
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition bg-white"
              value={pickId}
              onChange={(e) => setPickId(e.target.value)}
            >
              <option value="">Select a shared profile...</option>
              {pickOptions.map((p) => (
                <option
                  key={p.profile_uid || p.id}
                  value={p.profile_uid || `${pickSource}:${p.id}`}
                >
                  {p.fullname}
                  {p.phone ? ` (${p.countrycode || ""}${p.phone})` : ""}
                </option>
              ))}
            </select>
          </div>
          <PrimaryButton
            disabled={!pickId}
            onClick={async () => {
              const [selectedSource, selectedIdRaw] = String(pickId).split(":");
              const selectedId =
                selectedSource === "job_screening"
                  ? selectedIdRaw
                  : Number(selectedIdRaw || 0);
              if (
                ["explore_php", "main_php", "job_screening"].includes(
                  selectedSource,
                )
              ) {
                await exploreCandidatesAdminApi.assignBridgeProfile(
                  accountId,
                  selectedId,
                  selectedSource,
                );
              } else {
                await exploreCandidatesAdminApi.assignProfile(
                  accountId,
                  selectedId,
                  0,
                );
              }
              setPickId("");
              await load();
            }}
          >
            Assign Profile
          </PrimaryButton>
        </div>
      </PageCard>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 px-1">
          Assigned Profiles
        </h2>
        <TableWrapper>
          <TableHead>
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Display Order</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </TableHead>
          <TableBody>
            {state.assigned.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-5 align-middle">
                  <div className="font-bold text-slate-900">{p.fullname}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {p.source || "local"}
                  </div>
                </td>
                <td className="px-6 py-5 align-middle">
                  {(p.source || "local") === "local" ? (
                    <input
                      type="number"
                      defaultValue={p.display_order || 0}
                      className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                      onBlur={async (e) => {
                        const localId = Number(String(p.id).split(":")[1] || 0);
                        await exploreCandidatesAdminApi.updateAssignmentOrder(
                          accountId,
                          localId,
                          Number(e.target.value || 0),
                        );
                      }}
                    />
                  ) : (
                    <span className="text-xs text-slate-500">
                      Managed on main site
                    </span>
                  )}
                </td>
                <td className="px-6 py-5 align-middle">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link
                      to={`/admin/explore-candidates/profiles/${p.id}/edit?accountId=${accountId}`}
                    >
                      <ActionButton>Edit</ActionButton>
                    </Link>
                    <ActionButton
                      onClick={() => openRecruitmentStatusForAssigned(p)}
                    >
                      Status
                    </ActionButton>
                    <ActionButton
                      variant={p?.visibility?.is_enabled ? "danger" : "primary"}
                      disabled={Boolean(statusToggling[`assigned-${p.id}`])}
                      onClick={() =>
                        toggleRecruitmentStatusForAssigned(
                          p,
                          !p?.visibility?.is_enabled,
                        )
                      }
                    >
                      {statusToggling[`assigned-${p.id}`]
                        ? "Saving..."
                        : p?.visibility?.is_enabled
                          ? "Stop Status"
                          : "Show Status"}
                    </ActionButton>
                    <ActionButton
                      variant="danger"
                      onClick={async () => {
                        if (
                          window.confirm(
                            "Are you sure you want to unassign this profile?",
                          )
                        ) {
                          const [rowSource, rowIdRaw] = String(p.id).split(":");
                          const rowId = Number(rowIdRaw || 0);
                          if (rowSource === "explore_php") {
                            await exploreCandidatesAdminApi.unassignBridgeProfile(
                              accountId,
                              rowId,
                            );
                          } else {
                            await exploreCandidatesAdminApi.unassignProfile(
                              accountId,
                              rowId,
                            );
                          }
                          await load();
                        }
                      }}
                    >
                      Unassign
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </TableBody>
        </TableWrapper>
      </div>
      <RecruitmentStatusModal
        open={statusModalOpen}
        loading={statusLoading}
        data={statusData}
        error={statusError}
        onClose={() => setStatusModalOpen(false)}
      />
    </div>
  );
}

function LibraryPage() {
  const [profiles, setProfiles] = useState([]);
  const [source, setSource] = useState("local");
  const [searchBy, setSearchBy] = useState("name");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [addingLocal, setAddingLocal] = useState({});
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusData, setStatusData] = useState(null);
  const [statusToggling, setStatusToggling] = useState({});

  async function load() {
    setLoading(true);
    try {
      const res = await exploreCandidatesAdminApi.listLibraryProfilesV2({
        source,
        search_by: searchBy,
        q: query,
        page,
        limit: 20,
      });
      const baseProfiles = res?.data?.data || [];
      const localRows = baseProfiles.filter((row) =>
        String(row.profile_uid || `local:${row.id}`).startsWith("local:"),
      );
      const visibilityByUid = {};
      await Promise.all(
        localRows.map(async (row) => {
          const uid = String(row.profile_uid || `local:${row.id}`);
          try {
            const statusRes =
              await exploreCandidatesAdminApi.getLibraryProfileRecruitmentStatus(
                uid,
              );
            visibilityByUid[uid] = statusRes?.data?.data?.visibility || {
              is_enabled: false,
            };
          } catch (_err) {
            visibilityByUid[uid] = { is_enabled: false };
          }
        }),
      );
      setProfiles(
        baseProfiles.map((row) => {
          const uid = String(row.profile_uid || `local:${row.id}`);
          return {
            ...row,
            visibility: visibilityByUid[uid] ||
              row.visibility || { is_enabled: false },
          };
        }),
      );
      setPagination(
        res?.data?.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          total_pages: 1,
        },
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [source, searchBy, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      load();
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function openRecruitmentStatusForLibrary(profileRow) {
    const uid = String(profileRow.profile_uid || `local:${profileRow.id}`);
    if (!uid.startsWith("local:")) {
      window.alert(
        "Recruitment status is available only for local shared profiles.",
      );
      return;
    }
    setStatusModalOpen(true);
    setStatusLoading(true);
    setStatusError("");
    setStatusData(null);
    try {
      const res =
        await exploreCandidatesAdminApi.getLibraryProfileRecruitmentStatus(uid);
      setStatusData(res?.data?.data || null);
    } catch (error) {
      setStatusError(
        error?.response?.data?.message || "Could not fetch recruitment status",
      );
    } finally {
      setStatusLoading(false);
    }
  }

  async function toggleRecruitmentStatusForLibrary(profileRow, shouldEnable) {
    const uid = String(profileRow.profile_uid || `local:${profileRow.id}`);
    if (!uid.startsWith("local:")) {
      window.alert(
        "Recruitment status visibility is available only for local shared profiles.",
      );
      return;
    }
    const key = `library-${uid}`;
    try {
      setStatusToggling((prev) => ({ ...prev, [key]: true }));
      if (shouldEnable) {
        await exploreCandidatesAdminApi.enableLibraryProfileRecruitmentStatus(
          uid,
        );
      } else {
        await exploreCandidatesAdminApi.disableLibraryProfileRecruitmentStatus(
          uid,
        );
      }
      await load();
    } catch (error) {
      window.alert(
        error?.response?.data?.message || "Could not update visibility",
      );
    } finally {
      setStatusToggling((prev) => ({ ...prev, [key]: false }));
    }
  }

  return (
    <div className="space-y-8 ">
      <PageCard
        title="Shared Profile Library"
        description="Manage all master profiles that can be assigned to recruiter accounts."
        actions={
          <div className="flex gap-2">
            <Link to="/admin/explore-candidates/profiles/new">
              <PrimaryButton>Create Profile</PrimaryButton>
            </Link>
            <Link to="/admin/explore-candidates">
              <SecondaryButton>Back</SecondaryButton>
            </Link>
          </div>
        }
      />

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 px-1">
          Library Profiles
        </h2>
        <div className="grid gap-3 md:grid-cols-4">
          <select
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition bg-white"
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPage(1);
            }}
          >
            <option value="local">Explore Shared Profiles</option>
            <option value="explore_php">Explore Shared Profiles (PHP)</option>
            <option value="main_php">Main Website Profiles (PHP)</option>
            <option value="job_screening">Job Screening Candidates</option>
          </select>
          <select
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition bg-white"
            value={searchBy}
            onChange={(e) => {
              setSearchBy(e.target.value);
              setPage(1);
            }}
          >
            <option value="name">Search by Name</option>
            <option value="phone">Search by Phone</option>
          </select>
          <input
            className="md:col-span-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
            placeholder={
              searchBy === "phone"
                ? "Type phone number..."
                : "Type candidate name..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <TableWrapper>
          <TableHead>
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Phone</th>
              <th className="px-6 py-4">Source</th>
              <th className="px-6 py-4">Usage Count</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </TableHead>
          <TableBody>
            {loading ? (
              <tr>
                <td className="px-6 py-5 text-slate-500" colSpan={5}>
                  Loading profiles...
                </td>
              </tr>
            ) : (
              profiles.map((p) => (
                <tr
                  key={p.profile_uid || p.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-5 align-middle">
                    <div className="font-bold text-slate-900">{p.fullname}</div>
                  </td>
                  <td className="px-6 py-5 align-middle">{`${p.countrycode || ""}${p.phone || "-"}`}</td>
                  <td className="px-6 py-5 align-middle">
                    {p.source || source}
                  </td>
                  <td className="px-6 py-5 align-middle">
                    <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                      Used {p.usage_count || 0} times
                    </span>
                  </td>
                  <td className="px-6 py-5 align-middle">
                    <div className="flex flex-wrap justify-end gap-2">
                      {String(p.source || "").endsWith("_php") ||
                      String(p.source || "") === "job_screening" ? (
                        p.is_in_local ? (
                          <button
                            type="button"
                            disabled
                            title="Already added to local library"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs font-bold text-slate-400 cursor-not-allowed shadow-sm"
                          >
                            Added to Local
                          </button>
                        ) : (
                          <ActionButton
                            variant="primary"
                            disabled={Boolean(addingLocal[p.profile_uid || p.id])}
                            onClick={async () => {
                              const key = p.profile_uid || p.id;
                              const sourceValue = String(p.source || source);
                              const sourceProfileId =
                                sourceValue === "job_screening"
                                  ? p.source_profile_id || p.id
                                  : Number(p.source_profile_id || p.id || 0);
                              if (!sourceProfileId) return;
                              try {
                                setAddingLocal((prev) => ({
                                  ...prev,
                                  [key]: true,
                                }));
                                await exploreCandidatesAdminApi.addBridgeProfileToLocal(
                                  sourceProfileId,
                                  sourceValue,
                                );
                                setProfiles((prev) =>
                                  prev.map((item) =>
                                    (item.profile_uid || item.id) === key
                                      ? { ...item, is_in_local: true }
                                      : item,
                                  ),
                                );
                                window.alert("Profile added to local library");
                              } catch (error) {
                                if (error?.response?.status === 409) {
                                  setProfiles((prev) =>
                                    prev.map((item) =>
                                      (item.profile_uid || item.id) === key
                                        ? { ...item, is_in_local: true }
                                        : item,
                                    ),
                                  );
                                }
                                window.alert(
                                  error?.response?.data?.message ||
                                    "Could not add profile to local library",
                                );
                              } finally {
                                setAddingLocal((prev) => ({
                                  ...prev,
                                  [key]: false,
                                }));
                              }
                            }}
                          >
                            {addingLocal[p.profile_uid || p.id]
                              ? "Adding..."
                              : "Add to Local"}
                          </ActionButton>
                        )
                      ) : null}
                      {String(p.source || "") === "main_php" ||
                      String(p.source || "") === "job_screening" ? (
                        <span className="text-xs text-amber-700 font-semibold">
                          Not editable here.
                        </span>
                      ) : (
                        <>
                          <ActionButton
                            onClick={() => openRecruitmentStatusForLibrary(p)}
                          >
                            Status
                          </ActionButton>
                          <ActionButton
                            variant={
                              p?.visibility?.is_enabled ? "danger" : "primary"
                            }
                            disabled={Boolean(
                              statusToggling[
                                `library-${p.profile_uid || `local:${p.id}`}`
                              ],
                            )}
                            onClick={() =>
                              toggleRecruitmentStatusForLibrary(
                                p,
                                !p?.visibility?.is_enabled,
                              )
                            }
                          >
                            {statusToggling[
                              `library-${p.profile_uid || `local:${p.id}`}`
                            ]
                              ? "Saving..."
                              : p?.visibility?.is_enabled
                                ? "Stop Status"
                                : "Show Status"}
                          </ActionButton>
                          <Link
                            to={`/admin/explore-candidates/profiles/${encodeURIComponent(p.profile_uid || `local:${p.id}`)}/edit`}
                          >
                            <ActionButton>Edit</ActionButton>
                          </Link>
                          <ActionButton
                            variant="danger"
                            onClick={async () => {
                              const isPhpSource = String(
                                p.source || "",
                              ).endsWith("_php");
                              const confirmMessage = isPhpSource
                                ? "Disable this PHP source profile?"
                                : "Are you sure you want to delete this profile?";
                              if (window.confirm(confirmMessage)) {
                                await exploreCandidatesAdminApi.deleteProfile(
                                  p.profile_uid || p.id,
                                );
                                await load();
                              }
                            }}
                          >
                            {String(p.source || "").endsWith("_php")
                              ? "Disable"
                              : "Delete"}
                          </ActionButton>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </TableBody>
        </TableWrapper>
        <div className="flex items-center justify-between px-1">
          <div className="text-xs text-slate-500">
            Showing page {pagination.page} of {pagination.total_pages} (
            {pagination.total} profiles)
          </div>
          <div className="flex gap-2">
            <SecondaryButton
              disabled={pagination.page <= 1}
              onClick={() => setPage((v) => Math.max(1, v - 1))}
            >
              Previous
            </SecondaryButton>
            <SecondaryButton
              disabled={pagination.page >= pagination.total_pages}
              onClick={() =>
                setPage((v) => Math.min(pagination.total_pages, v + 1))
              }
            >
              Next
            </SecondaryButton>
          </div>
        </div>
      </div>
      <RecruitmentStatusModal
        open={statusModalOpen}
        loading={statusLoading}
        data={statusData}
        error={statusError}
        onClose={() => setStatusModalOpen(false)}
      />
    </div>
  );
}

function DynamicDropdownField({
  label,
  field,
  value,
  options = [],
  onChange,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  readOnly = false,
  placeholder,
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingVal, setEditingVal] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
        setEditingId(null);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleOutside);
      return () => document.removeEventListener("mousedown", handleOutside);
    }
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && open) {
        setOpen(false);
        setEditingId(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const optionValues = options.map((o) =>
    typeof o === "string" ? o : o.option_value,
  );
  const hasCurrentValueInOptions = !value || optionValues.includes(value);

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const val = typeof opt === "string" ? opt : opt.option_value;
      return String(val || "").toLowerCase().includes(q);
    });
  }, [options, searchQuery]);

  const exactMatchExists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return options.some((opt) => {
      const val = typeof opt === "string" ? opt : opt.option_value;
      return String(val || "").trim().toLowerCase() === q;
    });
  }, [options, searchQuery]);

  const handleAdd = async (e) => {
    if (e) e.stopPropagation();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setLoadingAction(true);
    try {
      await onAddOption(field, trimmed);
      onChange(trimmed);
      setSearchQuery("");
      setOpen(false);
    } catch (err) {
      window.alert(err?.response?.data?.message || "Failed to add option");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUpdate = async (e, id) => {
    if (e) e.stopPropagation();
    const trimmed = editingVal.trim();
    if (!trimmed) return;
    setLoadingAction(true);
    try {
      await onUpdateOption(id, trimmed);
      const targetOpt = options.find((o) => o.id === id);
      if (targetOpt && value === targetOpt.option_value) {
        onChange(trimmed);
      }
      setEditingId(null);
      setEditingVal("");
    } catch (err) {
      window.alert(err?.response?.data?.message || "Failed to update option");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDelete = async (e, id, optVal) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Delete "${optVal}" from global options?`)) return;
    setLoadingAction(true);
    try {
      await onDeleteOption(id);
      if (value === optVal) {
        onChange("");
      }
    } catch (err) {
      window.alert(err?.response?.data?.message || "Failed to delete option");
    } finally {
      setLoadingAction(false);
    }
  };

  const displayPlaceholder = placeholder || `Select ${label.toLowerCase()}...`;

  return (
    <div className="space-y-1 relative" ref={wrapRef}>
      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
        {label}
      </label>

      <div className="relative">
        <button
          type="button"
          disabled={readOnly}
          onClick={() => {
            setOpen((v) => !v);
            setEditingId(null);
          }}
          className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-left flex items-center justify-between outline-none transition focus:border-slate-400 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
            open ? "border-slate-400" : ""
          }`}
          style={{ outline: "none", boxShadow: "none" }}
        >
          <span
            className={`truncate ${
              value ? "text-slate-900 font-medium" : "text-slate-400"
            }`}
          >
            {value || displayPlaceholder}
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${
              open ? "transform rotate-180 text-slate-600" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {open && !readOnly && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2.5 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-1.5 bg-white rounded-lg border border-slate-300 px-2.5 py-1.5 focus-within:border-slate-400 transition">
                <svg
                  className="w-4 h-4 text-slate-400 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  autoFocus
                  placeholder={`Search or add new ${label.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (searchQuery.trim() && !exactMatchExists) {
                        handleAdd(e);
                      }
                    }
                  }}
                  className="w-full text-xs text-slate-800 placeholder-slate-400 outline-none focus:outline-none focus:ring-0 border-0 ring-0 bg-transparent"
                  style={{ outline: "none", boxShadow: "none" }}
                />
                {searchQuery.trim() && !exactMatchExists && (
                  <button
                    type="button"
                    onClick={(e) => handleAdd(e)}
                    disabled={loadingAction}
                    className="shrink-0 bg-[#083262] hover:bg-[#052243] text-white px-2 py-0.5 rounded text-xs font-semibold transition"
                  >
                    + Add
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
              {value ? (
                <div
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer transition"
                >
                  <span className="italic">-- Clear selection --</span>
                </div>
              ) : null}

              {!hasCurrentValueInOptions && value && (
                <div
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold bg-[#083262]/5 text-[#083262] border border-[#083262]/20 cursor-pointer"
                >
                  <span className="truncate">{value} (Current)</span>
                  <svg
                    className="w-4 h-4 text-[#083262]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}

              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400">
                  {searchQuery.trim() ? (
                    <div>
                      No matching option.
                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={(e) => handleAdd(e)}
                          className="font-bold text-[#083262] hover:underline"
                        >
                          Add &quot;{searchQuery.trim()}&quot; as new {label}
                        </button>
                      </div>
                    </div>
                  ) : (
                    "No options available. Type above to create one."
                  )}
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const optId = typeof opt === "object" ? opt.id : opt;
                  const optVal =
                    typeof opt === "object" ? opt.option_value : opt;
                  const isSelected = String(value) === String(optVal);
                  const isEditing = editingId === optId;

                  if (isEditing) {
                    return (
                      <div
                        key={optId}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs"
                      >
                        <input
                          autoFocus
                          type="text"
                          value={editingVal}
                          onChange={(e) => setEditingVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleUpdate(e, optId);
                            } else if (e.key === "Escape") {
                              setEditingId(null);
                            }
                          }}
                          className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-800 outline-none focus:outline-none focus:ring-0 bg-white focus:border-slate-500"
                          style={{ outline: "none", boxShadow: "none" }}
                        />
                        <button
                          type="button"
                          disabled={loadingAction || !editingVal.trim()}
                          onClick={(e) => handleUpdate(e, optId)}
                          className="text-emerald-700 font-bold hover:underline px-1 py-0.5 text-xs"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(null);
                            setEditingVal("");
                          }}
                          className="text-slate-400 hover:text-slate-600 px-1 py-0.5 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={optId}
                      onClick={() => {
                        onChange(optVal);
                        setOpen(false);
                      }}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition ${
                        isSelected
                          ? "bg-[#083262]/10 text-[#083262] font-semibold"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {isSelected && (
                          <svg
                            className="w-3.5 h-3.5 text-[#083262] shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2.5"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                        <span className="truncate">{optVal}</span>
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                        <button
                          type="button"
                          title="Edit option name"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(optId);
                            setEditingVal(optVal);
                          }}
                          className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-[#083262] transition"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          title="Delete option"
                          onClick={(e) => handleDelete(e, optId, optVal)}
                          className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>{options.length} options</span>
              <span>Press Esc to close</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileFormPage({ mode }) {
  const navigate = useNavigate();
  const { profileId } = useParams();
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get("accountId") || "";
  const [form, setForm] = useState(initialProfileForm);
  const [fieldOptions, setFieldOptions] = useState({
    qualification: [],
    experience: [],
    specialization: [],
  });
  const [videos, setVideos] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [newVideo, setNewVideo] = useState({
    title: "",
    display_order: 0,
    file: null,
  });
  const [newDoc, setNewDoc] = useState({
    title: "",
    display_order: 0,
    file: null,
  });
  const [createVideos, setCreateVideos] = useState([]);
  const [createDocs, setCreateDocs] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [videoUploadState, setVideoUploadState] = useState({});
  const [videoViewState, setVideoViewState] = useState({});
  const [docInputKey, setDocInputKey] = useState(0);
  const [videoInputKey, setVideoInputKey] = useState(0);
  const isMainPhpReadOnly =
    mode === "edit" && String(profileId || "").startsWith("main_php:");

  const loadFieldOptions = async () => {
    try {
      const res = await exploreCandidatesAdminApi.getFieldOptions();
      setFieldOptions(
        res.data.data || {
          qualification: [],
          experience: [],
          specialization: [],
        },
      );
    } catch (e) {
      console.warn("Failed to load field options:", e.message);
    }
  };

  useEffect(() => {
    loadFieldOptions();
  }, []);

  const handleAddOption = async (fieldName, optionValue) => {
    await exploreCandidatesAdminApi.addFieldOption(fieldName, optionValue);
    await loadFieldOptions();
  };

  const handleUpdateOption = async (id, optionValue) => {
    await exploreCandidatesAdminApi.updateFieldOption(id, optionValue);
    await loadFieldOptions();
  };

  const handleDeleteOption = async (id) => {
    await exploreCandidatesAdminApi.deleteFieldOption(id);
    await loadFieldOptions();
  };

  const normalizeDateForInput = (value) => {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  };

  const getDisplayFileName = (value) => {
    if (!value) return "";
    if (typeof File !== "undefined" && value instanceof File) return value.name;
    const raw = String(value);
    try {
      const clean = raw.split("?")[0];
      const parts = clean.split("/");
      return decodeURIComponent(parts[parts.length - 1] || raw);
    } catch {
      return raw;
    }
  };

  const getStoredAssetLabel = (url, fallback = "Uploaded file") => {
    if (!url) return fallback;
    const clean = String(url).split("?")[0];
    const candidate = decodeURIComponent(clean.split("/").pop() || "");
    if (!candidate) return fallback;
    const stem = candidate.replace(/\.[^.]+$/, "");
    if (/^[a-z0-9]{12,}$/i.test(stem)) return fallback;
    return candidate;
  };

  const guessMimeFromUrl = (url) => {
    const ext = String(url).split("?")[0].split(".").pop()?.toLowerCase();
    const map = {
      pdf: "application/pdf",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      mp4: "video/mp4",
      mov: "video/quicktime",
      webm: "video/webm",
    };
    return map[ext] || "application/pdf";
  };

  const openAssetInline = async (url) => {
    const expectedMime = guessMimeFromUrl(url);
    try {
      const res = await fetch(url);
      const rawBlob = await res.blob();
      const blob =
        rawBlob.type && rawBlob.type !== "application/octet-stream"
          ? rawBlob
          : rawBlob.slice(0, rawBlob.size, expectedMime);
      window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error(
        "Failed to open asset inline, falling back to direct link",
        err,
      );
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };
  const openDocumentInline = openAssetInline;

  const pickPdfOrReset = (file, inputEl) => {
    if (!file) return null;
    const isPdf =
      file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
    if (!isPdf) {
      window.alert("Only PDF files are allowed.");
      if (inputEl) inputEl.value = "";
      return null;
    }
    return file;
  };

  async function refreshProfileDetails() {
    if (mode !== "edit") return;
    const res = await exploreCandidatesAdminApi.getProfileById(profileId);
    const data = res.data.data || {};
    setVideos(data.videos || []);
    setDocuments(data.documents || []);
  }

  useEffect(() => {
    if (mode !== "edit") return;
    exploreCandidatesAdminApi.getProfileById(profileId).then((res) => {
      const data = res.data.data || {};
      const profile = data.profile || {};
      setForm((v) => ({
        ...v,
        ...profile,
        dob: normalizeDateForInput(profile.dob),
      }));
      setVideos(data.videos || []);
      setDocuments(data.documents || []);
    });
  }, [mode, profileId]);

  const title =
    mode === "edit" ? "Edit Shared Profile" : "Create Shared Profile";

  return (
    <div className="space-y-8 pb-12">
      <PageCard
        title={title}
        description={
          isMainPhpReadOnly
            ? "This is a main website profile and is read-only here. Please edit on main site."
            : "Fill out the basic details, photo, and PDFs for this shared profile."
        }
        actions={
          <div className="flex gap-2">
            <Link to="/admin/explore-candidates/library">
              <SecondaryButton>Library</SecondaryButton>
            </Link>
            <Link
              to={
                accountId
                  ? `/admin/explore-candidates/accounts/${accountId}/profiles`
                  : "/admin/explore-candidates"
              }
            >
              <SecondaryButton>Back</SecondaryButton>
            </Link>
          </div>
        }
      >
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["fullname", "Full name"],
            ["email", "Email"],
            ["countrycode", "Country code"],
            ["phone", "Phone"],
            ["expected_level", "Expected level"],
          ].map(([field, label]) => (
            <div key={field} className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                {label}
              </label>
              <input
                disabled={isMainPhpReadOnly}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition disabled:bg-slate-100 disabled:text-slate-500"
                placeholder={`Enter ${label.toLowerCase()}`}
                value={form[field] || ""}
                onChange={(e) =>
                  setForm((v) => ({ ...v, [field]: e.target.value }))
                }
              />
            </div>
          ))}

          <DynamicDropdownField
            label="Qualification"
            field="qualification"
            value={form.qualification || ""}
            options={fieldOptions.qualification || []}
            onChange={(val) => setForm((v) => ({ ...v, qualification: val }))}
            onAddOption={handleAddOption}
            onUpdateOption={handleUpdateOption}
            onDeleteOption={handleDeleteOption}
            readOnly={isMainPhpReadOnly}
          />

          <DynamicDropdownField
            label="Experience"
            field="experience"
            value={form.experience || ""}
            options={fieldOptions.experience || []}
            onChange={(val) => setForm((v) => ({ ...v, experience: val }))}
            onAddOption={handleAddOption}
            onUpdateOption={handleUpdateOption}
            onDeleteOption={handleDeleteOption}
            readOnly={isMainPhpReadOnly}
          />

          <DynamicDropdownField
            label="Specialization"
            field="specialization"
            value={form.specialization || ""}
            options={fieldOptions.specialization || []}
            onChange={(val) => setForm((v) => ({ ...v, specialization: val }))}
            onAddOption={handleAddOption}
            onUpdateOption={handleUpdateOption}
            onDeleteOption={handleDeleteOption}
            readOnly={isMainPhpReadOnly}
          />

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Language
            </label>
            <input
              disabled={isMainPhpReadOnly}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition disabled:bg-slate-100 disabled:text-slate-500"
              placeholder="Enter language"
              value={form.language || ""}
              onChange={(e) =>
                setForm((v) => ({ ...v, language: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Date of Birth
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
              type="date"
              value={form.dob || ""}
              onChange={(e) => setForm((v) => ({ ...v, dob: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Gender
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition bg-white"
              value={form.gender || ""}
              onChange={(e) =>
                setForm((v) => ({ ...v, gender: e.target.value }))
              }
            >
              <option value="">Select gender...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Others">Others</option>
            </select>
          </div>

          {[
            ["resume", "Resume (PDF)"],
            ["degcert", "Degree Certificate (PDF)"],
            ["workcert", "Work Certificate (PDF)"],
            ["langcert", "Language Certificate (PDF)"],
          ].map(([field, label]) => (
            <div
              key={field}
              className="space-y-2 rounded-xl border border-slate-200 p-4 bg-slate-50"
            >
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                {label}
              </label>
              <input
                className="w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-[#083262] file:text-white file:px-4 file:py-2 file:text-xs file:font-semibold hover:file:bg-[#052243] transition cursor-pointer"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) =>
                  setForm((v) => ({
                    ...v,
                    [field]: pickPdfOrReset(
                      e.target.files?.[0] || null,
                      e.target,
                    ),
                  }))
                }
              />
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <span>
                  {typeof File !== "undefined" && form[field] instanceof File
                    ? form[field].name
                    : form[field]
                      ? getStoredAssetLabel(
                          form[field],
                          `${label.replace(/\s*\(PDF\)\s*/i, "")}.pdf`,
                        )
                      : "No file chosen"}
                </span>
                {!(
                  typeof File !== "undefined" && form[field] instanceof File
                ) &&
                  form[field] && (
                    <ActionButton
                      variant="primary"
                      onClick={() => openDocumentInline(form[field])}
                    >
                      View
                    </ActionButton>
                  )}
              </div>
            </div>
          ))}

          <div className="space-y-2 rounded-xl border border-slate-200 p-4 bg-slate-50">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              Profile Photo (Image)
            </label>
            <input
              className="w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-[#083262] file:text-white file:px-4 file:py-2 file:text-xs file:font-semibold hover:file:bg-[#052243] transition cursor-pointer"
              type="file"
              accept="image/*"
              onChange={(e) =>
                setForm((v) => ({ ...v, photo: e.target.files?.[0] || null }))
              }
            />
            <div className="text-xs text-slate-600 flex items-center gap-3">
              <span>
                {typeof File !== "undefined" && form.photo instanceof File
                  ? form.photo.name
                  : form.photo
                    ? getStoredAssetLabel(form.photo, "Profile photo")
                    : "No file chosen"}
              </span>
              {typeof form.photo === "string" && form.photo && (
                <img
                  src={form.photo}
                  alt="Profile"
                  className="h-10 w-10 rounded-lg object-cover border border-slate-200 cursor-pointer"
                  onClick={() => window.open(form.photo, "_blank", "noopener,noreferrer")}
                />
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <PrimaryButton
            disabled={savingProfile || isMainPhpReadOnly}
            onClick={async () => {
              if (isMainPhpReadOnly) return;
              setSavingProfile(true);
              try {
                const payload = {
                  fullname: form.fullname,
                  email: form.email,
                  countrycode: form.countrycode,
                  phone: form.phone,
                  dob: form.dob,
                  gender: form.gender,
                  expected_level: form.expected_level,
                  qualification: form.qualification,
                  experience: form.experience,
                  language: form.language,
                  photo: form.photo,
                  resume: form.resume,
                  degcert: form.degcert,
                  workcert: form.workcert,
                  langcert: form.langcert,
                };

                let profile;
                if (mode === "edit") {
                  const res = await exploreCandidatesAdminApi.updateProfile(
                    profileId,
                    payload,
                  );
                  profile = res.data.data;
                } else {
                  const res =
                    await exploreCandidatesAdminApi.createProfile(payload);
                  profile = res.data.data;
                  for (const d of createDocs) {
                    if (!d.title || !d.file) continue;
                    await exploreCandidatesAdminApi.addProfileDocument(
                      profile.id,
                      {
                        title: d.title,
                        display_order: d.display_order || 0,
                        document_file_upload: d.file,
                      },
                    );
                  }
                  for (const v of createVideos) {
                    if (!v.title || !v.file) continue;
                    await exploreCandidatesAdminApi.addProfileVideo(
                      profile.id,
                      {
                        title: v.title,
                        display_order: v.display_order || 0,
                        video_file_upload: v.file,
                      },
                    );
                  }
                }

                if (accountId && profile?.id) {
                  await exploreCandidatesAdminApi.assignProfile(
                    accountId,
                    profile.id,
                    0,
                  );
                  navigate(
                    `/admin/explore-candidates/accounts/${accountId}/profiles`,
                  );
                  return;
                }
                navigate("/admin/explore-candidates/library");
              } catch (error) {
                window.alert(
                  error?.response?.data?.message || "Could not save profile",
                );
              } finally {
                setSavingProfile(false);
              }
            }}
          >
            {isMainPhpReadOnly
              ? "Read-only on this panel"
              : savingProfile
                ? "Saving..."
                : "Save Profile"}
          </PrimaryButton>
        </div>
      </PageCard>

      <>
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 px-1">
            Additional Documents
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            {(mode === "edit" ? documents : createDocs).map((doc, idx) => (
              <div
                key={doc.id || `new-doc-${idx}`}
                className="flex flex-col md:flex-row md:items-end gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50"
              >
                {mode === "edit" ? (
                  <>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Title
                      </label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                        defaultValue={doc.title}
                        onBlur={async (e) => {
                          await exploreCandidatesAdminApi.updateProfileDocument(
                            doc.id,
                            {
                              title: e.target.value,
                            },
                          );
                        }}
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Order
                      </label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                        type="number"
                        defaultValue={doc.display_order || 0}
                        onBlur={async (e) => {
                          await exploreCandidatesAdminApi.updateProfileDocument(
                            doc.id,
                            {
                              display_order: Number(e.target.value || 0),
                            },
                          );
                          await refreshProfileDetails();
                        }}
                      />
                    </div>
                    <div className="flex-[2] space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                        File{" "}
                        {doc.document_file && (
                          <span
                            className="text-[#083262] truncate ml-2 max-w-[150px]"
                            title={doc.document_file}
                          >
                            {getStoredAssetLabel(
                              doc.document_file,
                              `${doc.title || "Document"}.pdf`,
                            )}
                          </span>
                        )}
                      </label>
                      <input
                        className="w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-slate-300 transition cursor-pointer"
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={async (e) => {
                          const f = pickPdfOrReset(
                            e.target.files?.[0] || null,
                            e.target,
                          );
                          if (!f) return;
                          await exploreCandidatesAdminApi.updateProfileDocument(
                            doc.id,
                            {
                              document_file_upload: f,
                            },
                          );
                        }}
                      />
                    </div>
                    {doc.document_file && (
                      <ActionButton
                        variant="primary"
                        onClick={() => openDocumentInline(doc.document_file)}
                      >
                        View
                      </ActionButton>
                    )}
                    <ActionButton
                      variant="danger"
                      onClick={async () => {
                        if (window.confirm("Delete this document?")) {
                          await exploreCandidatesAdminApi.deleteProfileDocument(
                            doc.id,
                          );
                          await refreshProfileDetails();
                        }
                      }}
                    >
                      Delete
                    </ActionButton>
                  </>
                ) : (
                  <>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Title
                      </label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                        value={doc.title}
                        onChange={(e) => {
                          const next = [...createDocs];
                          next[idx] = { ...next[idx], title: e.target.value };
                          setCreateDocs(next);
                        }}
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Order
                      </label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                        type="number"
                        value={doc.display_order || 0}
                        onChange={(e) => {
                          const next = [...createDocs];
                          next[idx] = {
                            ...next[idx],
                            display_order: Number(e.target.value || 0),
                          };
                          setCreateDocs(next);
                        }}
                      />
                    </div>
                    <div className="flex-[2] flex items-center justify-between text-sm text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2">
                      <span className="truncate">
                        {doc.file?.name || "No file attached"}
                      </span>
                      <ActionButton
                        variant="danger"
                        onClick={() => {
                          const next = createDocs.filter((_, i) => i !== idx);
                          setCreateDocs(next);
                        }}
                      >
                        Remove
                      </ActionButton>
                    </div>
                  </>
                )}
              </div>
            ))}

            <div className="flex flex-col md:flex-row md:items-end gap-3 p-4 rounded-xl border border-dashed border-slate-300 bg-white">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  New Document Title
                </label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                  placeholder="Document title"
                  value={newDoc.title}
                  onChange={(e) =>
                    setNewDoc((v) => ({ ...v, title: e.target.value }))
                  }
                />
              </div>
              <div className="w-24 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Order
                </label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                  type="number"
                  value={newDoc.display_order}
                  onChange={(e) =>
                    setNewDoc((v) => ({
                      ...v,
                      display_order: Number(e.target.value || 0),
                    }))
                  }
                />
              </div>
              <div className="flex-[2] space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  File (PDF)
                </label>
                <input
                  key={`new-doc-file-${docInputKey}`}
                  className="w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-slate-300 transition cursor-pointer"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) =>
                    setNewDoc((v) => ({
                      ...v,
                      file: pickPdfOrReset(
                        e.target.files?.[0] || null,
                        e.target,
                      ),
                    }))
                  }
                />
              </div>
              <SecondaryButton
                disabled={!newDoc.title || !newDoc.file}
                onClick={async () => {
                  if (!newDoc.title || !newDoc.file) return;
                  if (mode === "edit") {
                    await exploreCandidatesAdminApi.addProfileDocument(
                      profileId,
                      {
                        title: newDoc.title,
                        display_order: newDoc.display_order,
                        document_file_upload: newDoc.file,
                      },
                    );
                  } else {
                    setCreateDocs((prev) => [...prev, { ...newDoc }]);
                  }
                  setNewDoc({ title: "", display_order: 0, file: null });
                  setDocInputKey((v) => v + 1);
                  if (mode === "edit") await refreshProfileDetails();
                }}
              >
                Add Document
              </SecondaryButton>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 px-1">Videos</h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            {(mode === "edit" ? videos : createVideos).map((video, idx) => (
              <div
                key={video.id || `new-video-${idx}`}
                className="flex flex-col md:flex-row md:items-end gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50"
              >
                {mode === "edit" ? (
                  <>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Title
                      </label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                        defaultValue={video.title}
                        onBlur={async (e) => {
                          await exploreCandidatesAdminApi.updateProfileVideo(
                            video.id,
                            {
                              title: e.target.value,
                            },
                          );
                        }}
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Order
                      </label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                        type="number"
                        defaultValue={video.display_order || 0}
                        onBlur={async (e) => {
                          await exploreCandidatesAdminApi.updateProfileVideo(
                            video.id,
                            {
                              display_order: Number(e.target.value || 0),
                            },
                          );
                          await refreshProfileDetails();
                        }}
                      />
                    </div>
                    <div className="flex-[2] space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                        <span>File</span>
                        {videoUploadState[video.id] ? (
                          <span className="text-[#083262] ml-2">
                            Uploading...
                          </span>
                        ) : video.video_file ? (
                          <span
                            className="text-[#083262] truncate ml-2 max-w-[150px]"
                            title={video.video_file}
                          >
                            {getStoredAssetLabel(
                              video.video_file,
                              `${video.title || "Video"}`,
                            )}
                          </span>
                        ) : null}
                      </label>
                      <input
                        className="w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-slate-300 transition cursor-pointer"
                        type="file"
                        accept="video/*"
                        disabled={Boolean(videoUploadState[video.id])}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setVideoUploadState((state) => ({
                            ...state,
                            [video.id]: true,
                          }));
                          try {
                            await exploreCandidatesAdminApi.updateProfileVideo(
                              video.id,
                              {
                                video_file_upload: f,
                              },
                            );
                            await refreshProfileDetails();
                          } catch (error) {
                            window.alert(
                              error?.response?.data?.message ||
                                "Could not upload video",
                            );
                          } finally {
                            setVideoUploadState((state) => ({
                              ...state,
                              [video.id]: false,
                            }));
                            e.target.value = "";
                          }
                        }}
                      />
                    </div>
                    {video.video_file && (
                      <ActionButton
                        variant="primary"
                        disabled={Boolean(videoViewState[video.id])}
                        onClick={async () => {
                          setVideoViewState((state) => ({ ...state, [video.id]: true }));
                          try {
                            await openAssetInline(video.video_file);
                          } finally {
                            setVideoViewState((state) => ({ ...state, [video.id]: false }));
                          }
                        }}
                      >
                        {videoViewState[video.id] ? "Loading..." : "View"}
                      </ActionButton>
                    )}
                    <ActionButton
                      variant="danger"
                      onClick={async () => {
                        if (window.confirm("Delete this video?")) {
                          await exploreCandidatesAdminApi.deleteProfileVideo(
                            video.id,
                          );
                          await refreshProfileDetails();
                        }
                      }}
                    >
                      Delete
                    </ActionButton>
                  </>
                ) : (
                  <>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Title
                      </label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                        value={video.title}
                        onChange={(e) => {
                          const next = [...createVideos];
                          next[idx] = { ...next[idx], title: e.target.value };
                          setCreateVideos(next);
                        }}
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Order
                      </label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                        type="number"
                        value={video.display_order || 0}
                        onChange={(e) => {
                          const next = [...createVideos];
                          next[idx] = {
                            ...next[idx],
                            display_order: Number(e.target.value || 0),
                          };
                          setCreateVideos(next);
                        }}
                      />
                    </div>
                    <div className="flex-[2] flex items-center justify-between text-sm text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2">
                      <span className="truncate">
                        {video.file?.name || "No file attached"}
                      </span>
                      <ActionButton
                        variant="danger"
                        onClick={() => {
                          const next = createVideos.filter((_, i) => i !== idx);
                          setCreateVideos(next);
                        }}
                      >
                        Remove
                      </ActionButton>
                    </div>
                  </>
                )}
              </div>
            ))}

            <div className="flex flex-col md:flex-row md:items-end gap-3 p-4 rounded-xl border border-dashed border-slate-300 bg-white">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  New Video Title
                </label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                  placeholder="Video title"
                  value={newVideo.title}
                  onChange={(e) =>
                    setNewVideo((v) => ({ ...v, title: e.target.value }))
                  }
                />
              </div>
              <div className="w-24 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Order
                </label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                  type="number"
                  value={newVideo.display_order}
                  onChange={(e) =>
                    setNewVideo((v) => ({
                      ...v,
                      display_order: Number(e.target.value || 0),
                    }))
                  }
                />
              </div>
              <div className="flex-[2] space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  File (Video)
                </label>
                <input
                  key={`new-video-file-${videoInputKey}`}
                  className="w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-slate-300 transition cursor-pointer"
                  type="file"
                  accept="video/*"
                  onChange={(e) =>
                    setNewVideo((v) => ({
                      ...v,
                      file: e.target.files?.[0] || null,
                    }))
                  }
                />
              </div>
              <SecondaryButton
                disabled={
                  !newVideo.title ||
                  !newVideo.file ||
                  Boolean(videoUploadState.new)
                }
                onClick={async () => {
                  if (!newVideo.title || !newVideo.file) return;
                  if (mode === "edit") {
                    setVideoUploadState((state) => ({ ...state, new: true }));
                    try {
                      await exploreCandidatesAdminApi.addProfileVideo(
                        profileId,
                        {
                          title: newVideo.title,
                          display_order: newVideo.display_order,
                          video_file_upload: newVideo.file,
                        },
                      );
                      setNewVideo({ title: "", display_order: 0, file: null });
                      setVideoInputKey((v) => v + 1);
                      await refreshProfileDetails();
                    } catch (error) {
                      window.alert(
                        error?.response?.data?.message ||
                          "Could not upload video",
                      );
                    } finally {
                      setVideoUploadState((state) => ({
                        ...state,
                        new: false,
                      }));
                    }
                    return;
                  } else {
                    setCreateVideos((prev) => [...prev, { ...newVideo }]);
                  }
                  setNewVideo({ title: "", display_order: 0, file: null });
                  setVideoInputKey((v) => v + 1);
                  if (mode === "edit") await refreshProfileDetails();
                }}
              >
                {videoUploadState.new ? "Uploading..." : "Add Video"}
              </SecondaryButton>
            </div>
          </div>
        </div>
      </>
    </div>
  );
}

const ACCESS_REQUEST_STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "declined", label: "Declined" },
];

const ACCESS_REQUEST_STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  declined: "bg-rose-100 text-rose-700",
};

function formatIstDateTime(value) {
  return value
    ? new Date(value).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "-";
}

function AccessRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    declined: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [reviewing, setReviewing] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await exploreCandidatesAdminApi.listAccessRequests({
        status: statusFilter,
        search: appliedSearch,
      });
      setRequests(res?.data?.data || []);
      setCounts(
        res?.data?.counts || { pending: 0, approved: 0, declined: 0 },
      );
    } catch (err) {
      setRequests([]);
      setError(
        err?.response?.data?.message || "Could not load access requests",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter, appliedSearch]);

  async function review(request, action) {
    let note = null;
    if (action === "decline") {
      const input = window.prompt(
        `Decline platform access for "${request.email}"?${
          request.account_id
            ? "\n\nTheir linked recruiter account will be deactivated."
            : ""
        }\n\nOptional note (leave blank for none):`,
        "",
      );
      if (input === null) return;
      note = input.trim();
    } else {
      const override = request.status === "declined";
      const confirmed = window.confirm(
        `${override ? "Override the decline and approve" : "Approve"} access for "${request.email}"?\n\nTheir recruiter account will be ${
          override ? "re-activated" : "created"
        } and they can sign in with an email code.`,
      );
      if (!confirmed) return;
    }
    setReviewing({ id: request.id, action });
    try {
      await exploreCandidatesAdminApi.reviewAccessRequest(request.id, {
        action,
        note,
      });
      await load();
    } catch (err) {
      window.alert(
        err?.response?.data?.message || "Could not update access request",
      );
    } finally {
      setReviewing(null);
    }
  }

  const busy = reviewing !== null;

  return (
    <div className="space-y-8 ">
      <PageCard
        title="Recruiter Access Requests"
        description="Review sign-in requests from new recruiters. Approving creates their recruiter account; declining revokes access."
        actions={
          <Link to="/admin/explore-candidates">
            <SecondaryButton>Accounts</SecondaryButton>
          </Link>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          {ACCESS_REQUEST_STATUS_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setStatusFilter(filter.key)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition shadow-sm cursor-pointer ${
                statusFilter === filter.key
                  ? "border-[#083262] bg-[#083262] text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {filter.label}
              <span
                className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${
                  statusFilter === filter.key
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {filter.key
                  ? counts[filter.key] ?? 0
                  : counts.pending + counts.approved + counts.declined}
              </span>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <input
              className="w-64 rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
              placeholder="Search by email"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setAppliedSearch(searchInput.trim());
              }}
            />
            <ActionButton onClick={() => setAppliedSearch(searchInput.trim())}>
              Search
            </ActionButton>
            {appliedSearch ? (
              <ActionButton
                onClick={() => {
                  setSearchInput("");
                  setAppliedSearch("");
                }}
              >
                Clear
              </ActionButton>
            ) : null}
          </div>
        </div>
      </PageCard>

      <div className="space-y-4">
        {loading ? (
          <div className="text-sm text-slate-500 px-1">
            Loading access requests...
          </div>
        ) : error ? (
          <div className="text-sm text-rose-600 px-1">{error}</div>
        ) : (
          <TableWrapper>
            <TableHead>
              <tr>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Requests</th>
                <th className="px-6 py-4">Last Requested (IST)</th>
                <th className="px-6 py-4">Reviewed By</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </TableHead>
            <TableBody>
              {!requests.length ? (
                <tr>
                  <td className="px-6 py-5 text-slate-500" colSpan={6}>
                    No access requests found.
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr
                    key={request.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-5 align-top">
                      <div className="font-bold text-slate-900">
                        {request.email}
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <span
                        className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold capitalize ${
                          ACCESS_REQUEST_STATUS_STYLES[request.status] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 align-top">
                      {request.request_count || 0}
                    </td>
                    <td className="px-6 py-5 align-top">
                      {formatIstDateTime(request.last_requested_at)}
                    </td>
                    <td className="px-6 py-5 align-top">
                      {request.reviewed_by ? (
                        <div className="space-y-0.5">
                          <div>{request.reviewed_by}</div>
                          <div className="text-xs text-slate-500">
                            {formatIstDateTime(request.reviewed_at)}
                          </div>
                          {request.review_note ? (
                            <div className="text-xs italic text-slate-500">
                              &ldquo;{request.review_note}&rdquo;
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-5 align-top">
                      <div className="flex flex-wrap justify-end gap-2">
                        {request.status !== "approved" ? (
                          <ActionButton
                            variant="primary"
                            disabled={busy}
                            onClick={() => review(request, "approve")}
                          >
                            {reviewing?.id === request.id &&
                            reviewing?.action === "approve" ? (
                              <Spinner size="sm" />
                            ) : null}
                            {request.status === "declined"
                              ? "Approve (Override)"
                              : "Approve"}
                          </ActionButton>
                        ) : null}
                        {request.status !== "declined" ? (
                          <ActionButton
                            variant="danger"
                            disabled={busy}
                            onClick={() => review(request, "decline")}
                          >
                            {reviewing?.id === request.id &&
                            reviewing?.action === "decline" ? (
                              <Spinner size="sm" />
                            ) : null}
                            {request.status === "approved"
                              ? "Revoke Access"
                              : "Decline"}
                          </ActionButton>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </TableBody>
          </TableWrapper>
        )}
      </div>
    </div>
  );
}

export default function ExploreCandidatesAdmin() {
  return (
    <Routes>
      <Route index element={<AccountsPage />} />
      <Route
        path="accounts/:accountId/profiles"
        element={<AccountProfilesPage />}
      />
      <Route path="library" element={<LibraryPage />} />
      <Route path="access-requests" element={<AccessRequestsPage />} />
      <Route path="jobs" element={<JobsAdminPage />} />
      <Route path="jobs/:jobId" element={<JobAssignPage />} />
      <Route path="profiles/new" element={<ProfileFormPage mode="create" />} />
      <Route
        path="profiles/:profileId/edit"
        element={<ProfileFormPage mode="edit" />}
      />
      <Route
        path="*"
        element={<Navigate to="/admin/explore-candidates" replace />}
      />
    </Routes>
  );
}
