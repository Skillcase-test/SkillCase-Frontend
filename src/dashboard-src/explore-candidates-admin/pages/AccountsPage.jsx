import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Users,
  Building2,
  ShieldCheck,
  Activity,
  Plus,
  Mail,
  Image,
  Sparkles,
} from "lucide-react";
import { exploreCandidatesAdminApi } from "../../../api/exploreCandidatesAdminApi";
import {
  PageCard,
  StatCard,
  TableWrapper,
  TableHead,
  TableBody,
  ToggleSwitch,
  PaginationBar,
  Spinner,
} from "../components/common";
import {
  PrimaryButton,
  ActionButton,
  SearchInput,
} from "../components/controls";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { SubAccountsModal } from "../components/SubAccountsModal";
import { formatIstDateTime } from "../utils/formatters";

export function AccountsPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");
  const [loginEvents, setLoginEvents] = useState([]);
  const [savingAccount, setSavingAccount] = useState(false);
  const [toggling, setToggling] = useState({});
  const [subModalAccount, setSubModalAccount] = useState(null);
  const [searchAccountQuery, setSearchAccountQuery] = useState("");
  const [searchEventQuery, setSearchEventQuery] = useState("");
  const [accountPage, setAccountPage] = useState(1);
  const [accountPageSize, setAccountPageSize] = useState(10);
  const [eventPage, setEventPage] = useState(1);
  const [eventPageSize, setEventPageSize] = useState(10);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    description: "",
    variant: "danger",
    input: false,
    inputLabel: "",
    inputPlaceholder: "",
    defaultValue: "",
    onConfirm: null,
    loading: false,
  });
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
          limit: 30,
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

  // Filter accounts by email
  const filteredAccounts = useMemo(() => {
    const q = searchAccountQuery.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) =>
      String(a.email || "").toLowerCase().includes(q) ||
      String(a.parent_email || "").toLowerCase().includes(q),
    );
  }, [accounts, searchAccountQuery]);

  const totalAccountPages = Math.max(1, Math.ceil(filteredAccounts.length / accountPageSize));
  const paginatedAccounts = useMemo(() => {
    const start = (accountPage - 1) * accountPageSize;
    return filteredAccounts.slice(start, start + accountPageSize);
  }, [filteredAccounts, accountPage, accountPageSize]);

  // Filter login events
  const filteredEvents = useMemo(() => {
    const q = searchEventQuery.trim().toLowerCase();
    if (!q) return loginEvents;
    return loginEvents.filter((ev) =>
      String(ev.recruiter_email || "").toLowerCase().includes(q) ||
      String(ev.account_id || "").toLowerCase().includes(q) ||
      String(ev.country_name || "").toLowerCase().includes(q),
    );
  }, [loginEvents, searchEventQuery]);

  const totalEventPages = Math.max(1, Math.ceil(filteredEvents.length / eventPageSize));
  const paginatedEvents = useMemo(() => {
    const start = (eventPage - 1) * eventPageSize;
    return filteredEvents.slice(start, start + eventPageSize);
  }, [filteredEvents, eventPage, eventPageSize]);

  // Stats calculation
  const totalAccounts = accounts.length;
  const mainAccounts = accounts.filter((a) => !a.parent_account_id).length;
  const subAccounts = accounts.filter((a) => a.parent_account_id).length;
  const totalSharedProfiles = accounts.reduce(
    (sum, a) => sum + (a.total_profiles || 0),
    0,
  );

  return (
    <div className="space-y-8">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Accounts"
          value={totalAccounts}
          subtext={`${mainAccounts} main / ${subAccounts} sub`}
          icon={Building2}
          color="blue"
        />
        <StatCard
          label="Main Accounts"
          value={mainAccounts}
          subtext="Direct partner portals"
          icon={Users}
          color="emerald"
        />
        <StatCard
          label="Sub Accounts"
          value={subAccounts}
          subtext="Shared team logins"
          icon={ShieldCheck}
          color="purple"
        />
        <StatCard
          label="Assigned Profiles"
          value={totalSharedProfiles}
          subtext="Active across all partners"
          icon={Activity}
          color="amber"
        />
      </div>

      {/* Add Recruiter Account Card */}
      <PageCard
        title="Add Recruiter Account"
        description="Provision a new partner recruiter portal with custom branding and permissions."
      >
        <div className="grid gap-4 md:grid-cols-3 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              Recruiter Email *
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-[#083262] focus:outline-none focus:ring-1 focus:ring-[#083262] transition"
              placeholder="recruiter@partnercompany.com"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((v) => ({ ...v, email: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Image className="h-3.5 w-3.5 text-slate-400" />
              Partner Logo (Optional)
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200 transition cursor-pointer"
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
            disabled={savingAccount || !form.email.trim()}
            loading={savingAccount}
            icon={Plus}
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
                toast.success("Recruiter account created");
              } catch (error) {
                toast.error(
                  error?.response?.data?.message || "Could not save account",
                );
              } finally {
                setSavingAccount(false);
              }
            }}
          >
            Create Recruiter Account
          </PrimaryButton>
        </div>
      </PageCard>

      {/* Recruiter Accounts Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Partner Accounts ({filteredAccounts.length})
            </h2>
            <p className="text-xs text-slate-500">
              Control candidate visibility, job posting access, and force terms.
            </p>
          </div>
          <div className="w-full sm:w-72">
            <SearchInput
              value={searchAccountQuery}
              onChange={setSearchAccountQuery}
              placeholder="Filter by account email..."
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
            <Spinner size="md" color="text-[#083262]" />
            <span className="text-xs font-bold">Loading accounts...</span>
          </div>
        ) : (
          <TableWrapper>
            <TableHead>
              <tr>
                <th className="px-6 py-4">Account Email</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Profiles</th>
                <th className="px-6 py-4 text-center">Mask Contacts</th>
                <th className="px-6 py-4 text-center">Job Posting</th>
                <th className="px-6 py-4 text-center">Force Terms</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </TableHead>
            <TableBody>
              {!filteredAccounts.length ? (
                <tr>
                  <td className="px-6 py-10 text-center text-slate-400" colSpan={7}>
                    No recruiter accounts found.
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((account) => {
                  const isSub = Boolean(account.parent_account_id);
                  return (
                    <tr
                      key={account.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4.5 align-middle">
                        <div className="font-bold text-slate-900">
                          {account.email}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 align-middle">
                        {isSub ? (
                          <span
                            className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#083262] border border-blue-100"
                            title={`Shares the workspace of ${account.parent_email || ""}`}
                          >
                            Sub of {account.parent_email || "?"}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                            Main Portal
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4.5 align-middle">
                        <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                          {account.total_profiles || 0} Shared
                        </span>
                      </td>
                      <td className="px-6 py-4.5 align-middle">
                        <div className="flex justify-center items-center gap-1.5">
                          <ToggleSwitch
                            checked={Boolean(account.mask_contacts_enabled)}
                            disabled={isSub || toggling[`mask-${account.id}`]}
                            onChange={async (val) => {
                              setToggling((prev) => ({
                                ...prev,
                                [`mask-${account.id}`]: true,
                              }));
                              try {
                                await exploreCandidatesAdminApi.updateAccountSettings(
                                  account.id,
                                  {
                                    mask_contacts_enabled: val,
                                  },
                                );
                                await load();
                                toast.success("Mask contacts setting updated");
                              } catch (err) {
                                toast.error(err?.response?.data?.message || "Could not update setting");
                              } finally {
                                setToggling((prev) => ({
                                  ...prev,
                                  [`mask-${account.id}`]: false,
                                }));
                              }
                            }}
                          />
                          {toggling[`mask-${account.id}`] && (
                            <Spinner size="sm" color="text-[#083262]" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 align-middle">
                        <div className="flex justify-center items-center gap-1.5">
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
                                toast.success("Job posting setting updated");
                              } catch (error) {
                                toast.error(
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
                          {toggling[`job-${account.id}`] && (
                            <Spinner size="sm" color="text-[#083262]" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 align-middle">
                        <div className="flex justify-center items-center gap-1.5">
                          <ToggleSwitch
                            checked={Boolean(account.force_terms_acceptance)}
                            disabled={isSub || toggling[`terms-${account.id}`]}
                            onChange={async (val) => {
                              setToggling((prev) => ({
                                ...prev,
                                [`terms-${account.id}`]: true,
                              }));
                              try {
                                await exploreCandidatesAdminApi.updateAccountSettings(
                                  account.id,
                                  {
                                    force_terms_acceptance: val,
                                  },
                                );
                                await load();
                                toast.success("Terms setting updated");
                              } catch (err) {
                                toast.error(err?.response?.data?.message || "Could not update setting");
                              } finally {
                                setToggling((prev) => ({
                                  ...prev,
                                  [`terms-${account.id}`]: false,
                                }));
                              }
                            }}
                          />
                          {toggling[`terms-${account.id}`] && (
                            <Spinner size="sm" color="text-[#083262]" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 align-middle">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {!isSub && (
                            <ActionButton
                              onClick={() => setSubModalAccount(account)}
                            >
                              Sub Accounts
                              {account.total_sub_accounts > 0
                                ? ` (${account.total_sub_accounts})`
                                : ""}
                            </ActionButton>
                          )}
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
                            title={
                              isSub ? "Managed by the main account" : undefined
                            }
                            onClick={() => {
                              setConfirmModal({
                                open: true,
                                title: "Edit Recruiter Email",
                                description: "Enter updated email address for this partner portal.",
                                variant: "primary",
                                confirmText: "Save Email",
                                input: true,
                                inputLabel: "Recruiter Email",
                                inputPlaceholder: "recruiter@partner.com",
                                defaultValue: account.email || "",
                                onConfirm: async (nextEmail) => {
                                  if (
                                    !nextEmail ||
                                    nextEmail.trim().toLowerCase() ===
                                      String(account.email || "")
                                        .trim()
                                        .toLowerCase()
                                  ) {
                                    setConfirmModal((v) => ({ ...v, open: false }));
                                    return;
                                  }
                                  setConfirmModal((v) => ({ ...v, loading: true }));
                                  try {
                                    await exploreCandidatesAdminApi.updateAccountIdentity(
                                      account.id,
                                      {
                                        email: nextEmail.trim(),
                                      },
                                    );
                                    await load();
                                    toast.success("Recruiter email updated");
                                    setConfirmModal((v) => ({ ...v, open: false, loading: false }));
                                  } catch (error) {
                                    toast.error(
                                      error?.response?.data?.message ||
                                        "Could not update recruiter email",
                                    );
                                    setConfirmModal((v) => ({ ...v, loading: false }));
                                  }
                                },
                              });
                            }}
                          >
                            Edit
                          </ActionButton>
                          <ActionButton
                            disabled={isSub}
                            title={
                              isSub ? "Managed by the main account" : undefined
                            }
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
                                  toast.success("Partner logo updated");
                                } catch (error) {
                                  toast.error(
                                    error?.response?.data?.message ||
                                      "Could not update partner logo",
                                  );
                                }
                              };
                              input.click();
                            }}
                          >
                            Logo
                          </ActionButton>
                          <ActionButton
                            variant="danger"
                            onClick={() => {
                              setConfirmModal({
                                open: true,
                                title: "Delete Recruiter Account",
                                description: `Delete recruiter account "${account.email}"?\n\nThis will permanently remove the account and all profile assignments.`,
                                variant: "danger",
                                confirmText: "Delete Account",
                                onConfirm: async () => {
                                  setConfirmModal((v) => ({ ...v, loading: true }));
                                  try {
                                    await exploreCandidatesAdminApi.deleteAccount(
                                      account.id,
                                    );
                                    await load();
                                    toast.success("Recruiter account deleted");
                                    setConfirmModal((v) => ({ ...v, open: false, loading: false }));
                                  } catch (error) {
                                    toast.error(
                                      error?.response?.data?.message ||
                                        "Could not delete account",
                                    );
                                    setConfirmModal((v) => ({ ...v, loading: false }));
                                  }
                                },
                              });
                            }}
                          >
                            Delete
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </TableBody>
          </TableWrapper>
        )}

        <PaginationBar
          page={accountPage}
          pageSize={accountPageSize}
          total={filteredAccounts.length}
          totalPages={totalAccountPages}
          onPageChange={setAccountPage}
          onPageSizeChange={(sz) => {
            setAccountPageSize(sz);
            setAccountPage(1);
          }}
        />
      </div>

      {/* Recruiter Login Audit Log */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Recruiter Login Audit Log
            </h2>
            <p className="text-xs text-slate-500">
              Recent sign-in events across all active partner recruiter portals.
            </p>
          </div>
          <div className="w-full sm:w-72">
            <SearchInput
              value={searchEventQuery}
              onChange={setSearchEventQuery}
              placeholder="Search audit log..."
            />
          </div>
        </div>

        {eventsLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
            <Spinner size="sm" color="text-[#083262]" />
            <span className="text-xs font-bold">Loading audit logs...</span>
          </div>
        ) : eventsError ? (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-700">
            {eventsError}
          </div>
        ) : (
          <div className="space-y-4">
            <TableWrapper>
              <TableHead>
                <tr>
                  <th className="px-6 py-3.5">Recruiter Email</th>
                  <th className="px-6 py-3.5">Account ID</th>
                  <th className="px-6 py-3.5">Source</th>
                  <th className="px-6 py-3.5">Location</th>
                  <th className="px-6 py-3.5 text-right">Login Time (IST)</th>
                </tr>
              </TableHead>
              <TableBody>
                {!filteredEvents.length ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-slate-400" colSpan={5}>
                      No login events matching search.
                    </td>
                  </tr>
                ) : (
                  paginatedEvents.map((event) => (
                    <tr
                      key={event.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-3.5 font-bold text-slate-900">
                        {event.recruiter_email || "-"}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">
                        #{event.account_id || "-"}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {event.source || "portal"}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {event.country_name || event.country_code || "Unknown"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right text-slate-500 font-medium">
                        {formatIstDateTime(event.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </TableBody>
            </TableWrapper>

            <PaginationBar
              page={eventPage}
              pageSize={eventPageSize}
              total={filteredEvents.length}
              totalPages={totalEventPages}
              onPageChange={setEventPage}
              onPageSizeChange={(sz) => {
                setEventPageSize(sz);
                setEventPage(1);
              }}
            />
          </div>
        )}
      </div>

      {subModalAccount && (
        <SubAccountsModal
          parent={subModalAccount}
          accounts={accounts}
          onClose={() => setSubModalAccount(null)}
          onChanged={load}
        />
      )}

      <ConfirmationModal
        isOpen={confirmModal.open}
        title={confirmModal.title}
        description={confirmModal.description}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
        input={confirmModal.input}
        inputLabel={confirmModal.inputLabel}
        inputPlaceholder={confirmModal.inputPlaceholder}
        defaultValue={confirmModal.defaultValue}
        loading={confirmModal.loading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((v) => ({ ...v, open: false, loading: false }))}
      />
    </div>
  );
}
