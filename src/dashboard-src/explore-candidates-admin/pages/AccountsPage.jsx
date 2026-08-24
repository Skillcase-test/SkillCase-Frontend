import { Fragment, useEffect, useMemo, useState } from "react";
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
  ChevronDown,
  ChevronRight,
  CornerDownRight,
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
  const [savingAccount, setSavingAccount] = useState(false);
  const [toggling, setToggling] = useState({});
  const [subModalAccount, setSubModalAccount] = useState(null);
  const [expandedAccountIds, setExpandedAccountIds] = useState({});
  const [searchAccountQuery, setSearchAccountQuery] = useState("");
  const [accountPage, setAccountPage] = useState(1);
  const [accountPageSize, setAccountPageSize] = useState(10);
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
    try {
      const accountsRes = await exploreCandidatesAdminApi.listAccounts();
      setAccounts(accountsRes?.data?.data || []);
    } catch (_error) {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const toggleExpand = (accountId) => {
    setExpandedAccountIds((prev) => ({
      ...prev,
      [accountId]: !prev[accountId],
    }));
  };

  // Group accounts into Main Accounts and their nested Sub-Accounts
  const structuredAccounts = useMemo(() => {
    const mainList = accounts.filter((a) => !a.parent_account_id);
    const subMap = {};
    accounts.forEach((a) => {
      if (a.parent_account_id) {
        if (!subMap[a.parent_account_id]) subMap[a.parent_account_id] = [];
        subMap[a.parent_account_id].push(a);
      }
    });

    return mainList.map((main) => ({
      ...main,
      subs: subMap[main.id] || [],
    }));
  }, [accounts]);

  // Filter main accounts & nested subs with auto-expansion for matched subs
  const filteredMainAccounts = useMemo(() => {
    const q = searchAccountQuery.trim().toLowerCase();
    if (!q) return structuredAccounts;

    return structuredAccounts
      .map((main) => {
        const mainMatches = String(main.email || "").toLowerCase().includes(q);
        const matchingSubs = (main.subs || []).filter((sub) =>
          String(sub.email || "").toLowerCase().includes(q),
        );

        if (mainMatches || matchingSubs.length > 0) {
          return {
            ...main,
            matchedViaSub: !mainMatches && matchingSubs.length > 0,
            visibleSubs: mainMatches ? main.subs : matchingSubs,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [structuredAccounts, searchAccountQuery]);

  const totalAccountPages = Math.max(
    1,
    Math.ceil(filteredMainAccounts.length / accountPageSize),
  );
  const paginatedMainAccounts = useMemo(() => {
    const start = (accountPage - 1) * accountPageSize;
    return filteredMainAccounts.slice(start, start + accountPageSize);
  }, [filteredMainAccounts, accountPage, accountPageSize]);

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
              Partner Accounts ({filteredMainAccounts.length} Portals
              {subAccounts > 0 ? ` · ${subAccounts} Sub-Accounts` : ""})
            </h2>
            <p className="text-xs text-slate-500">
              Control candidate visibility, job posting access, and team hierarchy.
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
              {!filteredMainAccounts.length ? (
                <tr>
                  <td className="px-6 py-10 text-center text-slate-400" colSpan={7}>
                    No recruiter accounts found.
                  </td>
                </tr>
              ) : (
                paginatedMainAccounts.map((account) => {
                  const subs = account.visibleSubs || account.subs || [];
                  const hasSubs = subs.length > 0;
                  const isExpanded = Boolean(
                    expandedAccountIds[account.id] ||
                      (searchAccountQuery.trim() && account.matchedViaSub),
                  );

                  return (
                    <Fragment key={account.id}>
                      {/* Main Account Row */}
                      <tr className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4.5 align-middle">
                          <div className="flex items-center gap-2">
                            {hasSubs ? (
                              <button
                                type="button"
                                onClick={() => toggleExpand(account.id)}
                                className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-slate-200/70 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                                title={
                                  isExpanded
                                    ? "Collapse sub-accounts"
                                    : "Expand sub-accounts"
                                }
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-[#083262]" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              <div className="w-6 shrink-0" />
                            )}
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {account.email}
                              </span>
                              {hasSubs && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(account.id)}
                                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#083262] border border-blue-100 hover:bg-blue-100 transition cursor-pointer"
                                >
                                  {subs.length} sub-{subs.length === 1 ? "account" : "accounts"}
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4.5 align-middle">
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                            Main Portal
                          </span>
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
                              disabled={toggling[`mask-${account.id}`]}
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
                              disabled={toggling[`job-${account.id}`]}
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
                              disabled={toggling[`terms-${account.id}`]}
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
                            <ActionButton
                              onClick={() => setSubModalAccount(account)}
                            >
                              Sub Accounts
                              {account.total_sub_accounts > 0
                                ? ` (${account.total_sub_accounts})`
                                : ""}
                            </ActionButton>
                            <ActionButton
                              onClick={() =>
                                navigate(
                                  `/admin/explore-candidates/accounts/${account.id}/profiles`,
                                )
                              }
                            >
                              Manage Profiles
                            </ActionButton>
                            <ActionButton
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

                      {/* Nested Sub-Account Rows */}
                      {isExpanded &&
                        subs.map((sub) => (
                          <tr
                            key={sub.id}
                            className="bg-slate-50/70 border-t border-slate-100 hover:bg-blue-50/40 transition-colors"
                          >
                            <td className="px-6 py-3.5 align-middle pl-12">
                              <div className="flex items-center gap-2">
                                <CornerDownRight className="h-4 w-4 text-[#083262] shrink-0" />
                                <span className="font-semibold text-slate-800 text-xs">
                                  {sub.email}
                                </span>
                                <span className="inline-flex rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-100">
                                  Sub Account
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-3.5 align-middle">
                              <span className="text-xs text-slate-500 font-medium italic">
                                Sub of {account.email}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 align-middle">
                              <span className="text-xs text-slate-500 font-medium">
                                {account.total_profiles || 0} Shared (Inherited)
                              </span>
                            </td>
                            <td
                              className="px-6 py-3.5 align-middle text-center text-xs text-slate-400"
                              title="Inherited from main portal"
                            >
                              —
                            </td>
                            <td
                              className="px-6 py-3.5 align-middle text-center text-xs text-slate-400"
                              title="Inherited from main portal"
                            >
                              —
                            </td>
                            <td
                              className="px-6 py-3.5 align-middle text-center text-xs text-slate-400"
                              title="Inherited from main portal"
                            >
                              —
                            </td>
                            <td className="px-6 py-3.5 align-middle">
                              <div className="flex flex-wrap justify-end gap-1.5">
                                <ActionButton
                                  onClick={() => {
                                    setConfirmModal({
                                      open: true,
                                      title: "Detach Sub-Account",
                                      description: `Detach "${sub.email}" from parent "${account.email}"?\n\nIt will become an independent standalone recruiter account.`,
                                      variant: "warning",
                                      confirmText: "Detach Account",
                                      onConfirm: async () => {
                                        setConfirmModal((v) => ({ ...v, loading: true }));
                                        try {
                                          await exploreCandidatesAdminApi.detachSubAccount(
                                            account.id,
                                            sub.id,
                                          );
                                          await load();
                                          toast.success("Sub-account detached successfully");
                                          setConfirmModal((v) => ({ ...v, open: false, loading: false }));
                                        } catch (err) {
                                          toast.error(
                                            err?.response?.data?.message ||
                                              "Could not detach sub-account",
                                          );
                                          setConfirmModal((v) => ({ ...v, loading: false }));
                                        }
                                      },
                                    });
                                  }}
                                >
                                  Detach
                                </ActionButton>
                                <ActionButton
                                  variant="danger"
                                  onClick={() => {
                                    setConfirmModal({
                                      open: true,
                                      title: "Delete Sub-Account",
                                      description: `Delete sub-account "${sub.email}"?\n\nThis will permanently delete this sub-account login.`,
                                      variant: "danger",
                                      confirmText: "Delete Sub-Account",
                                      onConfirm: async () => {
                                        setConfirmModal((v) => ({ ...v, loading: true }));
                                        try {
                                          await exploreCandidatesAdminApi.deleteAccount(
                                            sub.id,
                                          );
                                          await load();
                                          toast.success("Sub-account deleted");
                                          setConfirmModal((v) => ({ ...v, open: false, loading: false }));
                                        } catch (error) {
                                          toast.error(
                                            error?.response?.data?.message ||
                                              "Could not delete sub-account",
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
                        ))}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </TableWrapper>
        )}

        <PaginationBar
          page={accountPage}
          pageSize={accountPageSize}
          total={filteredMainAccounts.length}
          totalPages={totalAccountPages}
          onPageChange={setAccountPage}
          onPageSizeChange={(sz) => {
            setAccountPageSize(sz);
            setAccountPage(1);
          }}
        />
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
