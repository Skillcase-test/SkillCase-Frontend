import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { exploreCandidatesAdminApi } from "../../api/exploreCandidatesAdminApi";

// ---------------------------------------------------------------------------
// Admin-side recruiter jobs: view every job and manage its candidate list.
// Creating/editing/closing a job is deliberately recruiter-only.
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
  return Number(status) === 1 ? (
    <span className="inline-flex rounded-md bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800">
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

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await exploreCandidatesAdminApi.listAllJobs();
      setJobs(res?.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const fmtDate = (value) =>
    value
      ? new Date(value).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
        })
      : "-";

  return (
    <div className="space-y-8 ">
      <div>
        <button
          type="button"
          onClick={() => navigate("/admin/explore-candidates")}
          className="mb-4 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
        >
          ← Accounts
        </button>
      </div>

      <PageCard
        title="Recruiter Job Postings"
        description="All jobs posted across recruiter accounts. Open a job to assign or remove candidates — recruiters see the assignment instantly."
      >
        {loading ? (
          <div className="text-sm text-slate-500">Loading jobs...</div>
        ) : error ? (
          <div className="text-sm text-rose-600">{error}</div>
        ) : !jobs.length ? (
          <div className="text-sm text-slate-500">
            No jobs have been created yet.
          </div>
        ) : (
          <TableWrapper>
            <TableHead>
              <tr>
                <th className="px-6 py-4">Recruiter Account</th>
                <th className="px-6 py-4">Job Title</th>
                <th className="px-6 py-4">Locations</th>
                <th className="px-6 py-4">Positions</th>
                <th className="px-6 py-4">Candidates</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </TableHead>
            <TableBody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-5 align-top">
                    <div className="font-bold text-slate-900">
                      {job.account_email}
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top font-bold text-slate-900">
                    {job.job_role}
                  </td>
                  <td className="px-6 py-5 align-top" style={{ maxWidth: "220px" }}>
                    {(job.locations || []).slice(0, 3).join(", ")}
                    {(job.locations || []).length > 3
                      ? ` +${job.locations.length - 3}`
                      : ""}
                  </td>
                  <td className="px-6 py-5 align-top">{job.positions}</td>
                  <td className="px-6 py-5 align-top">
                    {job.total_candidates || 0}
                  </td>
                  <td className="px-6 py-5 align-top">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-6 py-5 align-top">{fmtDate(job.created_at)}</td>
                  <td className="px-6 py-5 align-top">
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
  const searchTimer = useRef(null);

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

  // Same library source as profile assignment; jobs can only hold local profiles.
  useEffect(() => {
    const timer = setTimeout(async () => {
      setPickLoading(true);
      try {
        const res = await exploreCandidatesAdminApi.listLibraryProfilesV2({
          source: "local",
          search_by: "name",
          q: search,
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
    } catch (err) {
      window.alert(
        err?.response?.data?.message ||
          "Could not add this candidate to the job",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeCandidate(profile) {
    if (
      !window.confirm(
        `Remove "${profile.fullname}" from this job?\n\nTheir global shortlist/scheduled-call history stays untouched.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await exploreCandidatesAdminApi.unassignJobCandidate(
        Number(jobId),
        profile.id,
      );
      await load();
    } catch (err) {
      window.alert(
        err?.response?.data?.message ||
          "Could not remove this candidate from the job",
      );
    } finally {
      setBusy(false);
    }
  }

  const fmtDate = (value) =>
    value
      ? new Date(value).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
        })
      : "-";

  if (loading) {
    return (
      <PageCard title="Job" description="Loading...">
        <div className="text-sm text-slate-500">Loading job...</div>
      </PageCard>
    );
  }
  if (error || !detail?.job) {
    return (
      <PageCard title="Job" description="">
        <div className="text-sm text-rose-600">{error || "Job not found"}</div>
      </PageCard>
    );
  }

  const job = detail.job;

  return (
    <div className="space-y-8 ">
      <div>
        <button
          type="button"
          onClick={() => navigate("/admin/explore-candidates/jobs")}
          className="mb-4 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
        >
          ← All Jobs
        </button>
      </div>

      <PageCard
        title={job.job_role}
        description={`Recruiter account: ${job.account_email}`}
        actions={<StatusBadge status={job.status} />}
      >
        <div className="grid gap-x-8 gap-y-2 md:grid-cols-2 text-sm">
          <div>
            <span className="font-bold text-slate-700">Locations: </span>
            <span>{(job.locations || []).join(", ")}</span>
          </div>
          <div>
            <span className="font-bold text-slate-700">Qualifications: </span>
            <span>{(job.qualifications || []).join(", ")}</span>
          </div>
          <div>
            <span className="font-bold text-slate-700">Experience: </span>
            <span>
              {job.experience_required}
              {job.min_experience ? ` (${job.min_experience})` : ""}
            </span>
          </div>
          <div>
            <span className="font-bold text-slate-700">Language Level: </span>
            <span>{job.min_language_level || "-"}</span>
          </div>
          <div>
            <span className="font-bold text-slate-700">Positions: </span>
            <span>{job.positions}</span>
          </div>
          <div>
            <span className="font-bold text-slate-700">Created: </span>
            <span>{fmtDate(job.created_at)}</span>
          </div>
        </div>
      </PageCard>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 px-1">
          Assigned Candidates ({(detail.candidates || []).length})
        </h2>
        {!detail.candidates?.length ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
            No candidates assigned to this job yet. Use the picker below.
          </div>
        ) : (
          <TableWrapper>
            <TableHead>
              <tr>
                <th className="px-6 py-4">Candidate</th>
                <th className="px-6 py-4">Qualification</th>
                <th className="px-6 py-4">Experience</th>
                <th className="px-6 py-4">Assigned On</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </TableHead>
            <TableBody>
              {detail.candidates.map((candidate) => (
                <tr
                  key={candidate.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-5 align-top font-bold text-slate-900">
                    {candidate.fullname}
                  </td>
                  <td className="px-6 py-5 align-top">
                    {candidate.qualification || "-"}
                  </td>
                  <td className="px-6 py-5 align-top">
                    {candidate.experience || "-"}
                  </td>
                  <td className="px-6 py-5 align-top">
                    {fmtDate(candidate.assigned_at)}
                  </td>
                  <td className="px-6 py-5 align-top">
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

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 px-1">
          Add Candidates from Library
        </h2>
        <input
          className="w-full max-w-md rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
          placeholder="Search candidate by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {pickLoading ? (
          <div className="text-sm text-slate-500">Searching...</div>
        ) : !pickOptions.length ? (
          <div className="text-sm text-slate-500">
            No matching local profiles found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
            {pickOptions.map((profile) => {
              const alreadyAdded = assignedIds.has(Number(profile.id));
              return (
                <div
                  key={profile.profile_uid || profile.id}
                  className="flex items-center justify-between gap-3 px-6 py-4"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {profile.fullname}
                    </div>
                    <div className="text-xs text-slate-500">
                      {[profile.qualification, profile.experience]
                        .filter(Boolean)
                        .join(" · ") || "-"}
                    </div>
                  </div>
                  {alreadyAdded ? (
                    <span className="text-xs font-bold text-green-700">
                      Already assigned
                    </span>
                  ) : (
                    <ActionButton
                      variant="primary"
                      disabled={busy}
                      onClick={() => addCandidate(profile)}
                    >
                      + Add to Job
                    </ActionButton>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-xs text-slate-500 px-1">
        Assigned candidates appear in the recruiter&apos;s job view immediately — for
        main accounts and all their sub accounts alike.
      </div>
    </div>
  );
}
