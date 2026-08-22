import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, UserPlus, Library, Sparkles, Trash2, Edit } from "lucide-react";
import { exploreCandidatesAdminApi } from "../../../api/exploreCandidatesAdminApi";
import {
  PageCard,
  TableWrapper,
  TableHead,
  TableBody,
  PaginationBar,
  Spinner,
} from "../components/common";
import {
  PrimaryButton,
  SecondaryButton,
  ActionButton,
  ControlDropdown,
} from "../components/controls";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { RecruitmentStatusModal } from "../components/RecruitmentStatusModal";
import { CANDIDATE_SOURCES } from "../utils/constants";

export function AccountProfilesPage() {
  const { accountId } = useParams();
  const [state, setState] = useState({ assigned: [], available: [] });
  const [loading, setLoading] = useState(true);
  const [pickId, setPickId] = useState("");
  const [pickSource, setPickSource] = useState("local");
  const [pickQuery, setPickQuery] = useState("");
  const [pickOptions, setPickOptions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusData, setStatusData] = useState(null);
  const [statusToggling, setStatusToggling] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    description: "",
    onConfirm: null,
    loading: false,
  });

  async function load() {
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [accountId]);

  // Smart candidate search (auto detects phone vs name)
  useEffect(() => {
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      const cleanQ = pickQuery.trim();
      const smartPickSearchBy = /^[0-9+\s\-()]{3,}$/.test(cleanQ) ? "phone" : "name";

      try {
        const res = await exploreCandidatesAdminApi.listLibraryProfilesV2({
          source: pickSource,
          search_by: smartPickSearchBy,
          q: cleanQ,
          page: 1,
          limit: 50,
        });
        setPickOptions(res?.data?.data || []);
      } catch (_err) {
        setPickOptions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [pickSource, pickQuery]);

  const candidateDropdownOptions = useMemo(() => {
    return pickOptions.map((p) => ({
      value: p.profile_uid || `${pickSource}:${p.id}`,
      label: `${p.fullname}${p.phone ? ` (${p.countrycode || ""}${p.phone})` : ""}${
        p.qualification ? ` · ${p.qualification}` : ""
      }`,
    }));
  }, [pickOptions, pickSource]);

  const totalPages = Math.max(1, Math.ceil(state.assigned.length / pageSize));
  const paginatedAssigned = useMemo(() => {
    const start = (page - 1) * pageSize;
    return state.assigned.slice(start, start + pageSize);
  }, [state.assigned, page, pageSize]);

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
      toast.error(
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
      toast.error(
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
        toast.success("Recruitment status published");
      } else {
        await exploreCandidatesAdminApi.disableProfileRecruitmentStatus(
          localProfileId,
        );
        toast.success("Recruitment status hidden");
      }
      await load();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Could not update visibility",
      );
    } finally {
      setStatusToggling((prev) => ({ ...prev, [key]: false }));
    }
  }

  return (
    <div className="space-y-8">
      {/* Header & Assign Bar */}
      <PageCard
        title={`Assigned Profiles for Account #${accountId}`}
        description="Search from the candidate library and map talent to this recruiter portal."
        actions={
          <div className="flex gap-2">
            <Link to="/admin/explore-candidates/library">
              <SecondaryButton icon={Library}>Master Library</SecondaryButton>
            </Link>
            <Link
              to={`/admin/explore-candidates/profiles/new?accountId=${accountId}`}
            >
              <PrimaryButton icon={UserPlus}>Create New Profile</PrimaryButton>
            </Link>
            <Link to="/admin/explore-candidates">
              <SecondaryButton icon={ArrowLeft}>Back to Accounts</SecondaryButton>
            </Link>
          </div>
        }
      >
        <div className="flex flex-col sm:flex-row gap-3 items-end flex-wrap">
          <div className="space-y-1.5 w-full sm:w-56">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Database Source
            </label>
            <ControlDropdown
              value={pickSource}
              onChange={(val) => {
                setPickSource(val);
                setPickId("");
                setPickQuery("");
              }}
              options={CANDIDATE_SOURCES}
            />
          </div>

          <div className="space-y-1.5 flex-1 min-w-[280px] w-full">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Select Candidate (Search by Name or Phone)
            </label>
            <ControlDropdown
              value={pickId}
              onChange={setPickId}
              options={candidateDropdownOptions}
              placeholder="Choose candidate to assign..."
              searchable={true}
              searchPlaceholder="Search candidate by name or phone..."
              searchValue={pickQuery}
              onSearchChange={setPickQuery}
              loading={searchLoading}
            />
          </div>

          <PrimaryButton
            disabled={!pickId}
            icon={UserPlus}
            onClick={async () => {
              const [selectedSource, selectedIdRaw] = String(pickId).split(":");
              const selectedId =
                selectedSource === "job_screening"
                  ? selectedIdRaw
                  : Number(selectedIdRaw || 0);
              try {
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
                setPickQuery("");
                await load();
                toast.success("Candidate assigned to recruiter account");
              } catch (err) {
                toast.error(err?.response?.data?.message || "Failed to assign candidate");
              }
            }}
          >
            Assign Candidate
          </PrimaryButton>
        </div>
      </PageCard>

      {/* Assigned Candidates Table */}
      <div className="space-y-4">
        <div className="px-1">
          <h2 className="text-lg font-black text-slate-900">
            Currently Assigned Candidates ({state.assigned.length})
          </h2>
          <p className="text-xs text-slate-500">
            Manage sort order, live recruiter status, and unassign profiles.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
            <Spinner size="md" color="text-[#083262]" />
            <span className="text-xs font-bold">Loading assigned candidates...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <TableWrapper>
              <TableHead>
                <tr>
                  <th className="px-6 py-4">Candidate Name</th>
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4">Display Order</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </TableHead>
              <TableBody>
                {!state.assigned.length ? (
                  <tr>
                    <td className="px-6 py-10 text-center text-slate-400" colSpan={4}>
                      No candidate profiles assigned to this recruiter account yet.
                    </td>
                  </tr>
                ) : (
                  paginatedAssigned.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4.5 align-middle">
                        <div className="font-bold text-slate-900">{p.fullname}</div>
                        {p.phone && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {p.countrycode || ""}{p.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4.5 align-middle">
                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {p.source || "local"}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 align-middle">
                        {(p.source || "local") === "local" ? (
                          <input
                            type="number"
                            defaultValue={p.display_order || 0}
                            className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 focus:border-[#083262] focus:outline-none focus:ring-1 focus:ring-[#083262] transition"
                            onBlur={async (e) => {
                              try {
                                const localId = Number(String(p.id).split(":")[1] || 0);
                                await exploreCandidatesAdminApi.updateAssignmentOrder(
                                  accountId,
                                  localId,
                                  Number(e.target.value || 0),
                                );
                                toast.success("Order updated");
                              } catch (_err) {
                                toast.error("Could not update order");
                              }
                            }}
                          />
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Main site sync
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4.5 align-middle">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Link
                            to={`/admin/explore-candidates/profiles/${p.id}/edit?accountId=${accountId}`}
                          >
                            <ActionButton icon={Edit}>Edit</ActionButton>
                          </Link>
                          <ActionButton
                            icon={Sparkles}
                            onClick={() => openRecruitmentStatusForAssigned(p)}
                          >
                            Status
                          </ActionButton>
                          <ActionButton
                            variant={p?.visibility?.is_enabled ? "danger" : "success"}
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
                            icon={Trash2}
                            onClick={() => {
                              setConfirmModal({
                                open: true,
                                title: "Unassign Candidate",
                                description: `Are you sure you want to unassign "${p.fullname}" from this recruiter account?`,
                                variant: "danger",
                                confirmText: "Unassign",
                                onConfirm: async () => {
                                  setConfirmModal((v) => ({ ...v, loading: true }));
                                  try {
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
                                    toast.success("Candidate unassigned");
                                    setConfirmModal((v) => ({ ...v, open: false, loading: false }));
                                  } catch (err) {
                                    toast.error(err?.response?.data?.message || "Failed to unassign");
                                    setConfirmModal((v) => ({ ...v, loading: false }));
                                  }
                                },
                              });
                            }}
                          >
                            Unassign
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </TableBody>
            </TableWrapper>

            <PaginationBar
              page={page}
              pageSize={pageSize}
              total={state.assigned.length}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={(sz) => {
                setPageSize(sz);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      <RecruitmentStatusModal
        open={statusModalOpen}
        loading={statusLoading}
        data={statusData}
        error={statusError}
        onClose={() => setStatusModalOpen(false)}
      />

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
