import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  UserPlus,
  Users,
  Search,
  Sparkles,
  Edit,
  Trash2,
  Download,
  PlusCircle,
  CheckCircle,
} from "lucide-react";
import { exploreCandidatesAdminApi } from "../../../api/exploreCandidatesAdminApi";
import {
  PageCard,
  StatCard,
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
  SearchInput,
  ControlDropdown,
} from "../components/controls";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { RecruitmentStatusModal } from "../components/RecruitmentStatusModal";
import { CANDIDATE_SOURCES } from "../utils/constants";

export function LibraryPage() {
  const [profiles, setProfiles] = useState([]);
  const [source, setSource] = useState("local");
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
      const cleanQ = query.trim();
      const smartSearchBy = /^[0-9+\s\-()]{3,}$/.test(cleanQ) ? "phone" : "name";

      const res = await exploreCandidatesAdminApi.listLibraryProfilesV2({
        source,
        search_by: smartSearchBy,
        q: cleanQ,
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
  }, [source, page]);

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
      toast.error(
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
        toast.success("Recruitment status published");
      } else {
        await exploreCandidatesAdminApi.disableLibraryProfileRecruitmentStatus(
          uid,
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
      {/* Top Header & Quick Actions */}
      <PageCard
        title="Candidate Master Library"
        description="Central talent pool repository. Create, inspect, and map talent to partner recruiters."
        actions={
          <div className="flex gap-2">
            <Link to="/admin/explore-candidates/profiles/new">
              <PrimaryButton icon={UserPlus}>Create New Profile</PrimaryButton>
            </Link>
          </div>
        }
      >
        {/* Filters Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="space-y-1.5 w-full sm:w-72">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Database Source
            </label>
            <ControlDropdown
              value={source}
              onChange={(val) => {
                setSource(val);
                setPage(1);
              }}
              options={CANDIDATE_SOURCES}
            />
          </div>

          <div className="space-y-1.5 flex-1 w-full">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Smart Candidate Search
            </label>
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search by candidate name or phone number..."
            />
          </div>
        </div>
      </PageCard>

      {/* Library Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Talent Pool ({pagination.total} candidates)
            </h2>
            <p className="text-xs text-slate-500">
              Browse candidate library records across verified databases.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
            <Spinner size="md" color="text-[#083262]" />
            <span className="text-xs font-bold">Fetching talent library...</span>
          </div>
        ) : (
          <TableWrapper>
            <TableHead>
              <tr>
                <th className="px-6 py-4">Candidate Name</th>
                <th className="px-6 py-4">Phone / Contact</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Usage</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </TableHead>
            <TableBody>
              {!profiles.length ? (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-400" colSpan={5}>
                    No candidate records found matching this criteria.
                  </td>
                </tr>
              ) : (
                profiles.map((p) => (
                  <tr
                    key={p.profile_uid || p.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4.5 align-middle">
                      <div className="font-bold text-slate-900">{p.fullname}</div>
                      {p.email && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          {p.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4.5 align-middle font-medium text-slate-700">
                      {`${p.countrycode || ""}${p.phone || "-"}`}
                    </td>
                    <td className="px-6 py-4.5 align-middle">
                      <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                        {p.source || source}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 align-middle">
                      <span className="inline-flex rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#083262] border border-blue-100">
                        Used {p.usage_count || 0} times
                      </span>
                    </td>
                    <td className="px-6 py-4.5 align-middle">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {String(p.source || "").endsWith("_php") ||
                        String(p.source || "") === "job_screening" ? (
                          p.is_in_local ? (
                            <button
                              type="button"
                              disabled
                              title="Already added to local library"
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-400 cursor-not-allowed shadow-xs"
                            >
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                              Added to Local
                            </button>
                          ) : (
                            <ActionButton
                              variant="primary"
                              icon={PlusCircle}
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
                                  toast.success("Profile added to local library");
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
                                  toast.error(
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
                          <span className="text-xs text-amber-700 font-semibold px-2 py-1">
                            Main site managed
                          </span>
                        ) : (
                          <>
                            <ActionButton
                              icon={Sparkles}
                              onClick={() => openRecruitmentStatusForLibrary(p)}
                            >
                              Status
                            </ActionButton>
                            <ActionButton
                              variant={
                                p?.visibility?.is_enabled ? "danger" : "success"
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
                              <ActionButton icon={Edit}>Edit</ActionButton>
                            </Link>
                            <ActionButton
                              variant="danger"
                              icon={Trash2}
                              onClick={() => {
                                const isPhpSource = String(
                                  p.source || "",
                                ).endsWith("_php");
                                const confirmTitle = isPhpSource
                                  ? "Disable Profile"
                                  : "Delete Profile";
                                const confirmMessage = isPhpSource
                                  ? `Disable PHP source profile "${p.fullname}"?`
                                  : `Are you sure you want to delete profile "${p.fullname}"? This cannot be undone.`;

                                setConfirmModal({
                                  open: true,
                                  title: confirmTitle,
                                  description: confirmMessage,
                                  variant: "danger",
                                  confirmText: isPhpSource ? "Disable" : "Delete",
                                  onConfirm: async () => {
                                    setConfirmModal((v) => ({ ...v, loading: true }));
                                    try {
                                      await exploreCandidatesAdminApi.deleteProfile(
                                        p.profile_uid || p.id,
                                      );
                                      await load();
                                      toast.success(isPhpSource ? "Profile disabled" : "Profile deleted");
                                      setConfirmModal({ open: false, title: "", description: "", onConfirm: null, loading: false });
                                    } catch (err) {
                                      toast.error(err?.response?.data?.message || "Failed to remove profile");
                                      setConfirmModal((v) => ({ ...v, loading: false }));
                                    }
                                  },
                                });
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
        )}

        <PaginationBar
          page={pagination.page}
          totalPages={pagination.total_pages}
          totalItems={pagination.total}
          limit={pagination.limit}
          onPageChange={setPage}
        />
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
