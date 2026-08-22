import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Plus } from "lucide-react";
import { exploreCandidatesAdminApi } from "../../api/exploreCandidatesAdminApi";
import {
  PageCard,
  TableWrapper,
  TableHead,
  TableBody,
  PaginationBar,
  Spinner,
} from "../explore-candidates-admin/components/common";
import {
  PrimaryButton,
  SecondaryButton,
  ActionButton,
  SearchInput,
  ControlDropdown,
} from "../explore-candidates-admin/components/controls";
import { ConfirmationModal } from "../explore-candidates-admin/components/ConfirmationModal";
import { formatIstDateTime } from "../explore-candidates-admin/utils/formatters";

// ---------------------------------------------------------------------------
// Admin-side recruiter jobs: view every job and manage its candidate list.
// Creating/editing/closing a job is deliberately recruiter-only.
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
  return Number(status) === 1 ? (
    <span className="inline-flex rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
      Open
    </span>
  ) : (
    <span className="inline-flex rounded-md bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">
      Closed
    </span>
  );
}

export function JobsAdminPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [locationsList, setLocationsList] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await exploreCandidatesAdminApi.listAllJobs({
        page,
        limit: pageSize,
        search: appliedSearch,
        location: locationFilter,
      });
      const data = res?.data?.data || [];
      setJobs(data);
      if (res?.data?.pagination) {
        setPagination(res.data.pagination);
      } else {
        setPagination({ total: data.length, totalPages: Math.max(1, Math.ceil(data.length / pageSize)) });
      }
      if (res?.data?.locations?.length) {
        setLocationsList(res.data.locations);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load jobs");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [page, pageSize, appliedSearch, locationFilter]);

  const locationOptions = useMemo(() => {
    return [
      { value: "", label: "All Locations" },
      ...locationsList.map((loc) => ({ value: loc, label: loc })),
    ];
  }, [locationsList]);

  return (
    <div className="space-y-8">
      <PageCard
        title="Recruiter Job Postings"
        description="All jobs posted across recruiter accounts. Open a job to assign or remove candidates — recruiters see the assignment instantly."
      >
        <div className="mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex-1 max-w-md">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by job title or recruiter email..."
              onClear={() => setSearch("")}
            />
          </div>
          <div className="w-full sm:w-56">
            <ControlDropdown
              value={locationFilter}
              onChange={(val) => {
                setLocationFilter(val);
                setPage(1);
              }}
              options={locationOptions}
              placeholder="Filter by location..."
              compact
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
            <Spinner size="md" color="text-[#083262]" />
            <span className="text-xs font-bold">Loading jobs...</span>
          </div>
        ) : error ? (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-700">
            {error}
          </div>
        ) : !jobs.length ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
            {appliedSearch || locationFilter
              ? "No job postings matched your search criteria."
              : "No job postings created by recruiters yet."}
          </div>
        ) : (
          <div className="space-y-4">
            <TableWrapper>
              <TableHead>
                <tr>
                  <th className="px-6 py-4">Recruiter Account</th>
                  <th className="px-6 py-4">Job Title</th>
                  <th className="px-6 py-4">Locations</th>
                  <th className="px-6 py-4">Positions</th>
                  <th className="px-6 py-4">Candidates</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created (IST)</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </TableHead>
              <TableBody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4.5 align-middle">
                      <div className="font-bold text-slate-900">
                        {job.account_email}
                      </div>
                    </td>
                    <td className="px-6 py-4.5 align-middle font-bold text-slate-900">
                      {job.job_role}
                    </td>
                    <td className="px-6 py-4.5 align-middle max-w-[200px]">
                      <span className="truncate block">
                        {(job.locations || []).slice(0, 3).join(", ")}
                        {(job.locations || []).length > 3
                          ? ` +${job.locations.length - 3}`
                          : ""}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 align-middle font-bold">
                      {job.positions}
                    </td>
                    <td className="px-6 py-4.5 align-middle">
                      <span className="inline-flex rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#083262] border border-blue-100">
                        {job.total_candidates || 0} candidates
                      </span>
                    </td>
                    <td className="px-6 py-4.5 align-middle">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-6 py-4.5 align-middle text-slate-500 font-medium">
                      {formatIstDateTime(job.created_at)}
                    </td>
                    <td className="px-6 py-4.5 align-middle">
                      <div className="flex justify-end">
                        <ActionButton
                          onClick={() =>
                            navigate(`/admin/explore-candidates/jobs/${job.id}`)
                          }
                        >
                          Manage Candidates
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </TableBody>
            </TableWrapper>

            <PaginationBar
              page={page}
              pageSize={pageSize}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          </div>
        )}
      </PageCard>
    </div>
  );
}

export function JobAssignPage() {
  const navigate = useNavigate();
  const { jobId } = useParams();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [pickOptions, setPickOptions] = useState([]);
  const [pickLoading, setPickLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    description: "",
    onConfirm: null,
    loading: false,
  });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await exploreCandidatesAdminApi.getJobAdminDetail(
        Number(jobId),
      );
      setDetail(res?.data?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load this job");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [jobId]);

  // Smart candidate search auto-detecting phone vs name
  useEffect(() => {
    const timer = setTimeout(async () => {
      setPickLoading(true);
      const cleanQ = search.trim();
      const smartSearchBy = /^[0-9+\s\-()]{3,}$/.test(cleanQ) ? "phone" : "name";
      try {
        const res = await exploreCandidatesAdminApi.listLibraryProfilesV2({
          source: "local",
          search_by: smartSearchBy,
          q: cleanQ,
          page: 1,
          limit: 25,
        });
        const rows = res?.data?.data || [];
        setPickOptions(rows.filter((row) => Number(row.id)));
      } catch (_err) {
        setPickOptions([]);
      } finally {
        setPickLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const assignedIds = useMemo(
    () => new Set((detail?.candidates || []).map((c) => Number(c.id))),
    [detail],
  );

  async function addCandidate(profile) {
    setBusy(true);
    try {
      await exploreCandidatesAdminApi.assignJobCandidates(Number(jobId), [
        profile.id,
      ]);
      await load();
      toast.success(`Candidate "${profile.fullname}" assigned to job`);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Could not add this candidate to the job",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeCandidate(profile) {
    setConfirmModal({
      open: true,
      title: "Remove Candidate from Job",
      description: `Remove "${profile.fullname}" from this job?\n\nTheir global shortlist/scheduled-call history stays untouched.`,
      onConfirm: async () => {
        setConfirmModal((v) => ({ ...v, loading: true }));
        try {
          await exploreCandidatesAdminApi.unassignJobCandidate(
            Number(jobId),
            profile.id,
          );
          await load();
          toast.success(`Candidate "${profile.fullname}" removed from job`);
          setConfirmModal({ open: false, title: "", description: "", onConfirm: null, loading: false });
        } catch (err) {
          toast.error(
            err?.response?.data?.message ||
              "Could not remove this candidate from the job",
          );
          setConfirmModal((v) => ({ ...v, loading: false }));
        }
      },
    });
  }

  if (loading) {
    return (
      <PageCard title="Job Details" description="Loading...">
        <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
          <Spinner size="md" color="text-[#083262]" />
          <span className="text-xs font-bold">Loading job posting...</span>
        </div>
      </PageCard>
    );
  }
  if (error || !detail?.job) {
    return (
      <PageCard
        title="Job Details"
        description=""
        actions={
          <Link to="/admin/explore-candidates/jobs">
            <SecondaryButton icon={ArrowLeft}>Back to Jobs</SecondaryButton>
          </Link>
        }
      >
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-700">
          {error || "Job not found"}
        </div>
      </PageCard>
    );
  }

  const job = detail.job;

  return (
    <div className="space-y-8">
      <PageCard
        title={job.job_role}
        description={`Recruiter account: ${job.account_email}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={job.status} />
            <Link to="/admin/explore-candidates/jobs">
              <SecondaryButton icon={ArrowLeft}>Back to Jobs</SecondaryButton>
            </Link>
          </div>
        }
      >
        <div className="grid gap-x-8 gap-y-3 md:grid-cols-2 text-xs">
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wide">
              Locations:{" "}
            </span>
            <span className="font-bold text-slate-800">
              {(job.locations || []).join(", ") || "-"}
            </span>
          </div>
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wide">
              Qualifications:{" "}
            </span>
            <span className="font-bold text-slate-800">
              {(job.qualifications || []).join(", ") || "-"}
            </span>
          </div>
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wide">
              Experience Required:{" "}
            </span>
            <span className="font-bold text-slate-800">
              {job.experience_required || "-"}
              {job.min_experience ? ` (${job.min_experience})` : ""}
            </span>
          </div>
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wide">
              Language Level:{" "}
            </span>
            <span className="font-bold text-slate-800">
              {job.min_language_level || "-"}
            </span>
          </div>
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wide">
              Open Positions:{" "}
            </span>
            <span className="font-bold text-slate-800">{job.positions}</span>
          </div>
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wide">
              Created:{" "}
            </span>
            <span className="font-bold text-slate-800">
              {formatIstDateTime(job.created_at)}
            </span>
          </div>
        </div>
      </PageCard>

      {/* Assigned Candidates */}
      <div className="space-y-4">
        <div className="px-1">
          <h2 className="text-lg font-black text-slate-900">
            Assigned Candidates ({(detail.candidates || []).length})
          </h2>
          <p className="text-xs text-slate-500">
            Candidates currently mapped to this job position.
          </p>
        </div>

        {!detail.candidates?.length ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            No candidates assigned to this job yet. Use the search below.
          </div>
        ) : (
          <TableWrapper>
            <TableHead>
              <tr>
                <th className="px-6 py-4">Candidate</th>
                <th className="px-6 py-4">Qualification</th>
                <th className="px-6 py-4">Experience</th>
                <th className="px-6 py-4">Assigned On (IST)</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </TableHead>
            <TableBody>
              {detail.candidates.map((candidate) => (
                <tr
                  key={candidate.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4.5 align-middle font-bold text-slate-900">
                    {candidate.fullname}
                  </td>
                  <td className="px-6 py-4.5 align-middle">
                    {candidate.qualification || "-"}
                  </td>
                  <td className="px-6 py-4.5 align-middle">
                    {candidate.experience || "-"}
                  </td>
                  <td className="px-6 py-4.5 align-middle text-slate-500 font-medium">
                    {formatIstDateTime(candidate.assigned_at)}
                  </td>
                  <td className="px-6 py-4.5 align-middle">
                    <div className="flex justify-end">
                      <ActionButton
                        variant="danger"
                        disabled={busy}
                        onClick={() => removeCandidate(candidate)}
                      >
                        Remove
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </TableBody>
          </TableWrapper>
        )}
      </div>

      {/* Add Candidates from Library */}
      <div className="space-y-4">
        <div className="px-1">
          <h2 className="text-lg font-black text-slate-900">
            Add Candidates from Library
          </h2>
          <p className="text-xs text-slate-500">
            Smart search automatically detects candidate name or phone number.
          </p>
        </div>

        <div className="max-w-md">
          <SearchInput
            placeholder="Search candidate by name or phone..."
            value={search}
            onChange={setSearch}
          />
        </div>

        {pickLoading ? (
          <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
            <Spinner size="sm" color="text-[#083262]" />
            <span className="text-xs font-bold">Searching library...</span>
          </div>
        ) : !pickOptions.length ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-400">
            No matching candidate profiles found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {pickOptions.map((profile) => {
              const alreadyAdded = assignedIds.has(Number(profile.id));
              return (
                <div
                  key={profile.profile_uid || profile.id}
                  className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-slate-50 transition"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {profile.fullname}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {[profile.qualification, profile.experience]
                        .filter(Boolean)
                        .join(" · ") || "-"}
                      {profile.phone
                        ? ` · ${profile.countrycode || ""}${profile.phone}`
                        : ""}
                    </div>
                  </div>
                  {alreadyAdded ? (
                    <span className="inline-flex rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-100">
                      Already Assigned
                    </span>
                  ) : (
                    <ActionButton
                      variant="primary"
                      icon={Plus}
                      disabled={busy}
                      onClick={() => addCandidate(profile)}
                    >
                      Add to Job
                    </ActionButton>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-xs text-slate-400 px-1">
        Assigned candidates appear in the recruiter&apos;s job view immediately — for
        main accounts and all their sub accounts alike.
      </div>

      <ConfirmationModal
        isOpen={confirmModal.open}
        title={confirmModal.title}
        description={confirmModal.description}
        loading={confirmModal.loading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ open: false, title: "", description: "", onConfirm: null, loading: false })}
      />
    </div>
  );
}
